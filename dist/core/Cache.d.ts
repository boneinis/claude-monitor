export declare class SimpleCache {
    private cache;
    private readonly defaultTTL;
    set<T>(key: string, data: T, ttl?: number): void;
    get<T>(key: string): T | null;
    clear(): void;
    cleanup(): void;
}
//# sourceMappingURL=Cache.d.ts.map