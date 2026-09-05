/**
 * In-process cache standing in for Redis (docs/product-decisions.md).
 * Same shape (get/set/ttl) so swapping the backing store later is a
 * one-file change, not a rewrite of anything that calls it.
 *
 * This is also what makes "shared market data across users" true even in
 * the MVP: quotes are keyed by symbol only, never by user, so N users
 * watching TCS cause one upstream fetch, not N.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class SharedCache<T> {
  private store = new Map<string, Entry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }
}
