
/**
 * A simple in-memory cache implementation
 */
export class Cache<K, V> {
  private readonly store: Map<K, V>;
  private readonly timeoutStore: Map<K, NodeJS.Timeout>;

  constructor(
    /** The default TTL for entries. */
    public defaultTTL: number | null = null
  ) {
    this.store = new Map();
    this.timeoutStore = new Map();
  }

  get(key: K) {
    return this.store.get(key);
  }

  set(key: K, value: V, ttl = this.defaultTTL) {
    this.store.set(key, value);
    if (ttl !== null) {
      const timeout = setTimeout(() => this.delete(key), ttl);
      this.timeoutStore.set(key, timeout);
    }
  }

  setTTL(key: K, ttl = this.defaultTTL) {
    if (!this.store.has(key)) {
      return;
    }

    const oldTimeout = this.timeoutStore.get(key);
    if (oldTimeout) {
      clearTimeout(oldTimeout);
    }
    if (ttl) {
      const newTimeout = setTimeout(() => this.delete(key), ttl);
      this.timeoutStore.set(key, newTimeout);
    }
  }

  delete(key: K) {
    this.store.delete(key);

    const timeout = this.timeoutStore.get(key);
    if (timeout) {
      clearTimeout(timeout);
    }
    this.timeoutStore.delete(key);
  }
}