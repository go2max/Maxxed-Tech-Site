import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TABLES } from "./schema.mjs";

function cloneTables(tables) {
  const copy = {};
  for (const table of TABLES) {
    copy[table] = new Map();
  }
  for (const [table, rows] of Object.entries(tables)) {
    copy[table] = new Map([...rows.entries()].map(([key, value]) => [key, structuredClone(value)]));
  }
  return copy;
}

class TransactionContext {
  constructor(parent) {
    this.parent = parent;
    this.tables = cloneTables(parent.tables);
  }

  get(table, id) {
    return this.tables[table].get(id) ?? null;
  }

  list(table) {
    return [...this.tables[table].values()].map((row) => structuredClone(row));
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
    this.tables = Object.fromEntries(TABLES.map((table) => [table, new Map()]));
    this.appliedMigrations = new Set();
  }

  async applyMigration(migrationId) {
    this.appliedMigrations.add(migrationId);
  }

  async transaction(work) {
    const tx = new TransactionContext(this);
    const result = await work(tx);
    tx.commit();
    return result;
  }
}

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
export async function loadMigrationSql(name) {
  return readFile(resolve(root, "platform/migrations", name), "utf8");
}
