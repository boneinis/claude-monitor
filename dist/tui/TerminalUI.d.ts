import { MonitorEngine } from '../core/MonitorEngine';
export declare class TerminalUI {
    private screen;
    private grid;
    private widgets;
    private monitor;
    private refreshInterval;
    constructor(monitor: MonitorEngine);
    private createWidgets;
    private setupKeyboardHandlers;
    start(refreshInterval?: number): Promise<void>;
    private refresh;
    private updateHeader;
    private updateCurrentUsage;
    private updateTodayStats;
    private updateRecentActivity;
    private updateAlerts;
    private createProgressBar;
    private formatDuration;
    private showHelp;
    private showError;
}
//# sourceMappingURL=TerminalUI.d.ts.map