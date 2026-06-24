import { createHash } from "node:crypto";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashEvent(previousHash, payload) {
  return createHash("sha256").update(`${previousHash}|${stableStringify(payload)}`).digest("hex");
}

export class AuditEventRepository {
  list(tx) {
    return tx.list("audit_events");
  }

  append(tx, event) {
    const previous = this.list(tx).at(-1) ?? null;
    const previousHash = previous?.eventHash ?? "root";
    const payload = { ...event, previousHash };
    const record = {
      ...payload,
      eventHash: hashEvent(previousHash, payload),
    };
    tx.insert("audit_events", record);
    return record;
  }

  verifyIntegrity(events) {
    let previousHash = "root";
    for (const event of events) {
      const payload = { ...event, eventHash: undefined };
      delete payload.eventHash;
      const expected = hashEvent(previousHash, payload);
      if (event.previousHash !== previousHash || event.eventHash !== expected) {
        return false;
      }
      previousHash = event.eventHash;
    }
    return true;
  }
}
