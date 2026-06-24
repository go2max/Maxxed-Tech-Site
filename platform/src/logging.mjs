function maskEmail(value) {
  if (!value || !value.includes("@")) return value;
  const [local, domain] = value.split("@");
  return `${local[0]}***@${domain}`;
}

export function redactValue(value) {
  if (typeof value !== "string") return value;
  if (/secret|token|cookie|password/i.test(value)) return "[redacted]";
  if (value.includes("@")) return maskEmail(value);
  return value;
}

export function createLogger(logSink = []) {
  return {
    log(event) {
      const safeEvent = {};
      for (const [key, value] of Object.entries(event)) {
        safeEvent[key] = Array.isArray(value)
          ? value.map((entry) => redactValue(entry))
          : redactValue(value);
      }
      logSink.push(safeEvent);
    },
  };
}
