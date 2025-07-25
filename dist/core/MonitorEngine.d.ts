import { DataLoader } from './DataLoader';
import { Session, Plan, Alert, DailyStats, WeeklyStats, MonthlyStats } from '../types';
export declare class MonitorEngine {
    private dataLoader;
    private plan;
    private alerts;
    private updateCallbacks;
    private cache;
    constructor(dataLoader: DataLoader, plan?: Plan);
    getProjects(): Promise<string[]>;
    setPlan(plan: Plan): void;
    getCurrentPlan(): Plan;
    getCurrentStats(projectName?: string): Promise<{
        currentSession: Session;
        previousSession: Session;
        todayPrompts: number;
        dailyCost: number;
        todayTokens: number;
        burnRate: number;
        timeUntilReset: number;
        alerts: Alert[];
        sessionsToday: number;
        plan: Plan;
    }>;
    getDailyStats(days?: number, projectName?: string): Promise<DailyStats[]>;
    getWeeklyStats(weeks?: number, projectName?: string): Promise<WeeklyStats[]>;
    getMonthlyStats(months?: number, projectName?: string): Promise<MonthlyStats[]>;
    private getWeekStart;
    private calculateBurnRate;
    private calculateTimeRemaining;
    private checkAlerts;
    private calculateTimeUntilReset;
    private countSessionsTodayAsync;
    private countSessionsToday;
    private calculateEfficiency;
    onUpdate(callback: () => void): void;
}
//# sourceMappingURL=MonitorEngine.d.ts.map