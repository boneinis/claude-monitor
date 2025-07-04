"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleCache = void 0;
class SimpleCache {
    cache = new Map();
    defaultTTL = 60000; // 1 minute default
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check if cache entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    clear() {
        this.cache.clear();
    }
    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}
exports.SimpleCache = SimpleCache;
//# sourceMappingURL=Cache.js.map