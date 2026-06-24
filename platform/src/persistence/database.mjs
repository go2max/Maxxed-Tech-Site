import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TABLES } from "./schema.mjs";

function cloneTables(tables) {
  const copy = {};
  for (const table of Object.keys(tables)) {
    copy[table] = new Map([...tables[table].entries()].map(([key, value]) => [key, structuredClone(value)]));
  }
  return copy;
}

class TransactionContext {
  constructor(parent) {
    this.parent = parent;
    this.tables = cloneTables(parent.tables);
  }

  get(table, id) {
    return structuredClone(this.tables[table].get(id) ?? null);
  }

  list(table) {
    const rows = [...this.tables[table].values()].map((row) => structuredClone(row));
    if (table === "audit_events") {
      return rows.sort((left, right) => Number(left.sequence) - Number(right.sequence));
    }
    return rows.sort((left, right) =>
      String(left.created_at || left.applied_at || left.id).localeCompare(String(right.created_at || right.applied_at || right.id)) ||
      String(left.id).localeCompare(String(right.id))
    );
  }

  insert(table, row) {
    this.tables[table].set(row.id, structuredClone(row));
    return row;
  }

  update(table, id, updater) {
    if (table === "audit_events") {
      throw new Error("audit_events_append_only");
    }
    const current = this.get(table, id);
    if (!current) throw new Error(`missing_row:${table}:${id}`);
    const next = updater(structuredClone(current));
    this.tables[table].set(id, structuredClone(next));
    return next;
  }

  commit() {
    this.parent.tables = this.tables;
  }
}

export class MemoryPlatformDatabase {
  constructor() {
    this.tables = Object.fromEntries(["schema_migrations", ...TABLES].map((table) => [table, new Map()]));
    this.queue = Promise.resolve();
  }

  async hasMigration(id) {
    return this.tables.schema_migrations.has(id);
  }

  async applyMigration(migrationId) {
    this.tables.schema_migrations.set(migrationId, { id: migrationId, applied_at: new Date().toISOString() });
  }

  async transaction(work) {
    const operation = this.queue.then(async () => {
      const tx = new TransactionContext(this);
      const result = await work(tx);
      tx.commit();
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}

function quoteIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`invalid_identifier:${identifier}`);
  }
  return `"${identifier}"`;
}

function buildInsertSql(table, columns) {
  return `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
}

function buildUpdateSql(table, columns) {
  return `UPDATE ${quoteIdentifier(table)} SET ${columns.filter((column) => column !== "id").map((column) => `${quoteIdentifier(column)} = ?`).join(", ")} WHERE id = ?`;
}

async function unwrapFirst(statement) {
  const result = await statement.first();
  return result ?? null;
}

async function unwrapAll(statement) {
  const result = await statement.all();
  if (Array.isArray(result)) return result;
  return result?.results ?? [];
}

class D1TransactionContext {
  constructor(binding) {
    this.binding = binding;
    this.statements = [];
  }

  async get(table, id) {
    return unwrapFirst(this.binding.prepare(`SELECT * FROM ${quoteIdentifier(table)} WHERE id = ?`).bind(id));
  }

  async list(table) {
    const orderBy = table === "audit_events" ? "sequence ASC"
      : table === "schema_migrations" ? "applied_at ASC, id ASC"
        : "created_at ASC, id ASC";
    return unwrapAll(this.binding.prepare(`SELECT * FROM ${quoteIdentifier(table)} ORDER BY ${orderBy}`));
  }

  async insert(table, row) {
    const columns = Object.keys(row);
    this.statements.push(this.binding.prepare(buildInsertSql(table, columns)).bind(...columns.map((column) => row[column])));
    return row;
  }

  async update(table, id, updater) {
    if (table === "audit_events") {
      throw new Error("audit_events_append_only");
    }
    const current = await this.get(table, id);
    if (!current) throw new Error(`missing_row:${table}:${id}`);
    const next = updater(structuredClone(current));
    const columns = Object.keys(next);
    this.statements.push(this.binding.prepare(buildUpdateSql(table, columns)).bind(
      ...columns.filter((column) => column !== "id").map((column) => next[column]),
      id,
    ));
    return next;
  }
}

function isAuditHeadConflict(error) {
  return /audit_head_conflict|UNIQUE constraint failed: (?:audit_events\.(?:sequence|previous_hash)|access_role_events\.event_sequence)/i.test(error?.message || "");
}

export class D1PlatformDatabase {
  constructor(binding) {
    this.binding = binding;
    this.queue = Promise.resolve();
  }

  async hasMigration(id) {
    await this.binding.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
    return Boolean(await unwrapFirst(this.binding.prepare("SELECT id FROM schema_migrations WHERE id = ?").bind(id)));
  }

  async applyMigration(migrationId, sql) {
    await this.binding.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
    if (sql) {
      await this.binding.exec(sql);
    }
    await this.binding.prepare(buildInsertSql("schema_migrations", ["id", "applied_at"])).bind(migrationId, new Date().toISOString()).run();
  }

  async transaction(work) {
    const operation = this.queue.then(async () => {
      const maxAuditHeadAttempts = 16;
      for (let attempt = 0; attempt < maxAuditHeadAttempts; attempt += 1) {
        const tx = new D1TransactionContext(this.binding);
        try {
          const result = await work(tx);
          if (tx.statements.length > 0) {
            if (typeof this.binding.batch !== "function") throw new Error("d1_batch_required");
            await this.binding.batch(tx.statements);
          }
          return result;
        } catch (error) {
          if (!isAuditHeadConflict(error) || attempt === maxAuditHeadAttempts - 1) throw error;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, Math.min(25, attempt + 1)));
        }
      }
      throw new Error("audit_head_retry_exhausted");
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}

class MemoryPreparedStatement {
  constructor(binding, sql) {
    this.binding = binding;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    return this.binding._execute(this.sql, this.params, "first");
  }

  async all() {
    return { results: await this.binding._execute(this.sql, this.params, "all") };
  }

  async run() {
    await this.binding._execute(this.sql, this.params, "run");
    return { success: true };
  }
}

export class MemoryD1Binding {
  constructor() {
    this.tables = Object.fromEntries(["schema_migrations", ...TABLES].map((table) => [table, new Map()]));
    this.indexes = new Set();
    this.batchQueue = Promise.resolve();
  }

  prepare(sql) {
    return new MemoryPreparedStatement(this, sql);
  }

  async exec(sql) {
    const cleanedSql = sql
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    for (const rawStatement of cleanedSql.split(";").map((statement) => statement.trim()).filter(Boolean)) {
      if (/^CREATE TABLE IF NOT EXISTS /i.test(rawStatement)) {
        const match = /^CREATE TABLE IF NOT EXISTS ([a-z_]+)/i.exec(rawStatement);
        if (match && !this.tables[match[1]]) {
          this.tables[match[1]] = new Map();
        }
        continue;
      }
      const indexMatch = /^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS ([a-z_]+)\s+ON\s+([a-z_]+)/i.exec(rawStatement);
      if (indexMatch) {
        if (!this.tables[indexMatch[2]]) throw new Error(`missing_index_table:${indexMatch[2]}`);
        this.indexes.add(indexMatch[1]);
        continue;
      }
      if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(rawStatement)) {
        continue;
      }
      throw new Error(`unsupported_exec_sql:${rawStatement}`);
    }
  }

  async batch(statements) {
    const operation = this.batchQueue.then(async () => {
      const snapshot = cloneTables(this.tables);
      try {
        const results = [];
        for (const statement of statements) {
          results.push(await statement.run());
        }
        return results;
      } catch (error) {
        this.tables = snapshot;
        throw error;
      }
    });
    this.batchQueue = operation.catch(() => {});
    return operation;
  }

  async _execute(sql, params, mode) {
    const normalized = sql.replace(/\s+/g, " ").trim();
    let match = /^SELECT \* FROM "([a-z_]+)" WHERE id = \?$/i.exec(normalized);
    if (match) {
      return structuredClone(this.tables[match[1]].get(params[0]) ?? null);
    }

    match = /^SELECT \* FROM "([a-z_]+)" ORDER BY (created_at ASC, id ASC|applied_at ASC, id ASC|sequence ASC)$/i.exec(normalized);
    if (match) {
      const rows = [...this.tables[match[1]].values()].map((row) => structuredClone(row));
      if (match[2].toLowerCase() === "sequence asc") {
        return rows.sort((left, right) => Number(left.sequence) - Number(right.sequence));
      }
      const timestampColumn = match[2].toLowerCase().startsWith("applied_at") ? "applied_at" : "created_at";
      return rows.sort((left, right) => String(left[timestampColumn] || left.id).localeCompare(String(right[timestampColumn] || right.id)) || String(left.id).localeCompare(String(right.id)));
    }

    match = /^SELECT id FROM schema_migrations WHERE id = \?$/i.exec(normalized);
    if (match) {
      const row = this.tables.schema_migrations.get(params[0]);
      return row ? { id: row.id } : null;
    }

    match = /^INSERT INTO "([a-z_]+)" \((.+)\) VALUES \((.+)\)$/i.exec(normalized);
    if (match) {
      const table = match[1];
      const columns = match[2].split(", ").map((column) => column.replaceAll('"', ""));
      const row = Object.fromEntries(columns.map((column, index) => [column, params[index]]));
      if (this.tables[table].has(row.id)) {
        throw new Error(`UNIQUE constraint failed: ${table}.id`);
      }
      if (table === "audit_events") {
        const conflict = [...this.tables[table].values()].some((event) =>
          Number(event.sequence) === Number(row.sequence) || event.previous_hash === row.previous_hash);
        if (conflict) throw new Error("audit_head_conflict");
      }
      this.tables[table].set(row.id, structuredClone(row));
      return mode === "run" ? null : structuredClone(row);
    }

    match = /^UPDATE "([a-z_]+)" SET (.+) WHERE id = \?$/i.exec(normalized);
    if (match) {
      const table = match[1];
      const assignments = match[2].split(", ").map((part) => part.split(" = ")[0].replaceAll('"', ""));
      const id = params.at(-1);
      const current = this.tables[table].get(id);
      if (!current) throw new Error(`missing_row:${table}:${id}`);
      const next = { ...current };
      assignments.forEach((column, index) => {
        next[column] = params[index];
      });
      this.tables[table].set(id, structuredClone(next));
      return mode === "run" ? null : structuredClone(next);
    }

    throw new Error(`unsupported_prepared_sql:${normalized}`);
  }
}

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
export async function loadMigrationSql(name) {
  return readFile(resolve(root, "platform/migrations", name), "utf8");
}

export function createPlatformDatabase(env = {}, options = {}) {
  if (options.database) return options.database;
  if (env.PLATFORM_DB) return new D1PlatformDatabase(env.PLATFORM_DB);
  if (env.APP_ENV === "test" || options.allowMemoryDatabase) return new MemoryPlatformDatabase();
  throw new Error("missing_d1_binding");
}
