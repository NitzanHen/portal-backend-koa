import { User } from '../model/User';
import { Cache } from './Cache.js';

export class JwtCache extends Cache<string, User> {
  static readonly cacheTime = 1000 * 60 * 60; /* Cache for one hour by default */

  private expCache: Map<string, number>;


  constructor() {
    super(JwtCache.cacheTime);
    this.expCache = new Map();
  }

  cache(token: string, user: User, exp = Infinity) {
    if (exp !== Infinity) {
      this.expCache.set(token, exp);
    }

    const safeCacheTime = Math.min(JwtCache.cacheTime, exp - Date.now());
    this.set(token, user, safeCacheTime);
  }

  refresh(token: string) {
    const exp = this.expCache.get(token) ?? Infinity;
    const safeCacheTime = Math.min(JwtCache.cacheTime, exp - Date.now());

    this.setTTL(token, safeCacheTime);
  }
}