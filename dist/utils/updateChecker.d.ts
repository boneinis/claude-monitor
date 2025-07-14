interface GitHubRelease {
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
}
export declare class UpdateChecker {
    private static readonly REPO_URL;
    private static getCurrentVersion;
    static checkForUpdates(): Promise<void>;
    static checkForUpdatesInteractive(): Promise<{
        hasUpdate: boolean;
        release?: GitHubRelease;
        error?: string;
    }>;
    private static fetchLatestRelease;
    private static isNewerVersion;
    private static parseVersion;
    private static displayUpdateNotification;
}
export {};
//# sourceMappingURL=updateChecker.d.ts.map