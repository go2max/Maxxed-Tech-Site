export class MemoryRateLimiter {
  constructor({ max, windowMs }) {
    this.max = max;
    this.windowMs = windowMs;
    this.buckets = new Map();
  }

  async consume(namespace, key, now = Date.now()) {
    const bucketKey = `${namespace}:${key}`;
    const current = this.buckets.get(bucketKey);
    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.max - 1, resetAt: now + this.windowMs };
    }
    if (current.count >= this.max) {
      const error = new Error("rate_limit_exceeded");
      error.resetAt = current.resetAt;
      throw error;
    }
    current.count += 1;
    return { allowed: true, remaining: this.max - current.count, resetAt: current.resetAt };
  }
}
