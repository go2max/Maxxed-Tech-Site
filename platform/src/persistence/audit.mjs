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

  async append(tx, event) {
    const previous = (await this.list(tx)).at(-1) ?? null;
    const previousHash = previous?.event_hash ?? "root";
    const sequence = Number(previous?.sequence ?? 0) + 1;
    const payload = {
      ...event,
      sequence,
      previous_hash: previousHash,
    };
    const record = {
      ...payload,
      event_hash: hashEvent(previousHash, payload),
    };
    await tx.insert("audit_events", record);
    return record;
  }

  verifyIntegrity(events) {
    let previousHash = "root";
    let expectedSequence = 1;
    for (const event of events) {
      const payload = { ...event };
      delete payload.event_hash;
      const expected = hashEvent(previousHash, payload);
      if (
        Number(event.sequence) !== expectedSequence ||
        event.previous_hash !== previousHash ||
        event.event_hash !== expected
      ) {
        return false;
      }
      previousHash = event.event_hash;
      expectedSequence += 1;
    }
    return true;
  }
}
