import { TokenUsage, Session } from '../types';
export declare class DataLoader {
    private projectPath;
    constructor(projectPath?: string);
    getProjects(): Promise<string[]>;
    loadRecentData(hours?: number, projectName?: string): Promise<TokenUsage[]>;
    loadAllData(projectName?: string): Promise<TokenUsage[]>;
    loadTodayData(projectName?: string): Promise<TokenUsage[]>;
    getCurrentSessions(projectName?: string): Promise<Session[]>;
    private findRecentFiles;
    private parseJsonlFile;
}
//# sourceMappingURL=DataLoader.d.ts.map