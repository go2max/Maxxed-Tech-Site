export class NoopRateLimiter {
  async consume() {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }
}
