"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalUI = void 0;
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const formatters_1 = require("../utils/formatters");
class TerminalUI {
    screen;
    grid;
    widgets;
    monitor;
    refreshInterval = null;
    constructor(monitor) {
        this.monitor = monitor;
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Claude Monitor'
        });
        this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });
        this.widgets = this.createWidgets();
        this.setupKeyboardHandlers();
    }
    createWidgets() {
        const header = this.grid.set(0, 0, 2, 12, blessed.box, {
            label: 'Claude Usage Monitor',
            content: '\n Note: Anthropic may allow usage overages beyond base limits',
            border: { type: 'line' },
            style: {
                border: { fg: 'blue' },
                fg: 'white'
            }
        });
        const currentUsage = this.grid.set(2, 0, 4, 6, blessed.box, {
            label: 'Current Session',
            border: { type: 'line' },
            style: {
                border: { fg: 'green' }
            }
        });
        const todayStats = this.grid.set(2, 6, 4, 6, blessed.box, {
            label: 'Today\'s Usage',
            border: { type: 'line' },
            style: {
                border: { fg: 'yellow' }
            }
        });
        const recentActivity = this.grid.set(6, 0, 4, 8, blessed.box, {
            label: 'Recent Activity (Last 7 days)',
            border: { type: 'line' },
            style: {
                border: { fg: 'cyan' }
            }
        });
        const alerts = this.grid.set(6, 8, 4, 4, blessed.box, {
            label: 'Alerts & Status',
            border: { type: 'line' },
            style: {
                border: { fg: 'red' }
            }
        });
        const footer = this.grid.set(10, 0, 2, 12, blessed.box, {
            content: ' [r] Refresh  [q] Quit  [?] Help',
            align: 'center',
            style: {
                fg: 'white',
                bg: 'black'
            }
        });
        return {
            header,
            currentUsage,
            todayStats,
            recentActivity,
            alerts,
            footer
        };
    }
    setupKeyboardHandlers() {
        this.screen.key(['q', 'C-c'], () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            process.exit(0);
        });
        this.screen.key(['tab'], () => {
            this.screen.focusNext();
        });
        this.screen.key(['r'], () => {
            this.refresh();
        });
        this.screen.key(['?', 'h'], () => {
            this.showHelp();
        });
    }
    async start(refreshInterval = 3000) {
        try {
            await this.refresh();
            this.refreshInterval = setInterval(() => this.refresh(), refreshInterval);
            this.screen.render();
        }
        catch (error) {
            console.error('Failed to start monitor:', error.message);
            process.exit(1);
        }
    }
    async refresh() {
        try {
            const stats = await this.monitor.getCurrentStats();
            const dailyStats = await this.monitor.getDailyStats(7);
            this.updateHeader(stats);
            this.updateCurrentUsage(stats);
            this.updateTodayStats(stats);
            this.updateRecentActivity(dailyStats);
            this.updateAlerts(stats);
            this.screen.render();
        }
        catch (error) {
            this.showError(error);
        }
    }
    updateHeader(stats) {
        const plan = stats.plan?.name || 'Pro';
        const lastUpdate = new Date().toLocaleTimeString();
        this.widgets.header.setContent(`\n Plan: ${plan}                Last Updated: ${lastUpdate}`);
    }
    updateCurrentUsage(stats) {
        let content = '\n';
        if (stats.currentSession) {
            const session = stats.currentSession;
            const duration = this.formatDuration(Date.now() - session.startTime.getTime());
            const totalTokens = session.totalTokens;
            const sessionLimit = stats.plan.estimatedTokensPerSession;
            const tokensDisplay = (0, formatters_1.formatTokensWithBonus)(totalTokens, sessionLimit);
            const usagePercent = (0, formatters_1.formatUsagePercentage)(totalTokens, sessionLimit);
            const cost = (0, formatters_1.formatCurrency)(session.totalCost);
            const resetIn = stats.timeUntilReset;
            const messages = session.tokenUsage.length;
            content += ` Active 5-hour session (${duration} elapsed)\n`;
            content += ` Messages: ${messages}\n`;
            content += ` Tokens: ${tokensDisplay}\n`;
            content += ` Usage: ${usagePercent}\n`;
            content += ` Cost: ${cost}\n`;
            content += ` Resets in: ${Math.floor(resetIn / 60)}h ${resetIn % 60}m`;
            // Show burn rate if meaningful
            if (stats.burnRate > 0) {
                content += `\n Burn rate: ${stats.burnRate.toFixed(1)} msg/min`;
            }
        }
        else {
            content += ' No active 5-hour session\n';
            content += ' Start using Claude Code to begin tracking';
        }
        this.widgets.currentUsage.setContent(content);
    }
    updateTodayStats(stats) {
        let content = '\n';
        content += ` Messages today: ${stats.todayPrompts}\n`;
        content += ` Cost today: ${(0, formatters_1.formatCurrency)(stats.dailyCost)}\n`;
        content += ` Sessions: ${stats.sessionsToday}\n`;
        content += ` Plan: ${stats.plan.name}\n`;
        if (stats.plan.name === 'Free') {
            content += '\n {yellow-fg}Limited Claude Code access{/}\n';
            content += ' Consider upgrading for more usage';
        }
        else {
            content += `\n 5-hour billing cycles\n`;
            if (stats.currentSession) {
                const timeLeft = stats.timeUntilReset;
                const hours = Math.floor(timeLeft / 60);
                const mins = timeLeft % 60;
                content += ` Current cycle ends: ${hours}h ${mins}m`;
            }
            else {
                content += ' No active billing cycle';
            }
        }
        this.widgets.todayStats.setContent(content);
    }
    updateRecentActivity(dailyStats) {
        let content = '\n';
        if (dailyStats.length === 0) {
            content += ' No recent activity found\n';
            content += ' Usage data will appear as you use Claude';
        }
        else {
            const maxCost = Math.max(...dailyStats.map(d => d.totalCost));
            const recentDays = dailyStats.slice(-7);
            recentDays.forEach(day => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en', {
                    weekday: 'short',
                    month: 'numeric',
                    day: 'numeric'
                });
                const cost = day.totalCost;
                const tokens = day.totalTokens;
                // Scale bar based on highest cost day
                const barLength = maxCost > 0 ? Math.round((cost / maxCost) * 15) : 0;
                const bar = '█'.repeat(Math.max(0, barLength));
                content += ` ${dayName.padEnd(8)} ${bar.padEnd(15)} $${cost.toFixed(2)}`;
                if (tokens > 0) {
                    content += ` (${(0, formatters_1.formatNumber)(tokens)} tokens)`;
                }
                content += '\n';
            });
        }
        this.widgets.recentActivity.setContent(content);
    }
    updateAlerts(stats) {
        let content = '\n';
        // Session status
        if (stats.currentSession) {
            const session = stats.currentSession;
            const messages = session.tokenUsage.length;
            const cost = session.totalCost;
            let status = '{green-fg}Active{/}';
            if (cost > 0.10)
                status = '{yellow-fg}High cost{/}';
            if (cost > 0.50)
                status = '{red-fg}Very high cost{/}';
            content += ` Session Status: ${status}\n`;
            content += ` Messages: ${messages} (${(0, formatters_1.formatCurrency)(cost)})\n`;
        }
        else {
            content += ' {blue-fg}No active session{/}\n';
        }
        // Usage warnings based on cost
        if (stats.dailyCost > 5.0) {
            content += '\n {red-fg}⚠ High daily cost!{/}';
        }
        else if (stats.dailyCost > 1.0) {
            content += '\n {yellow-fg}⚠ Moderate daily cost{/}';
        }
        // Plan info
        content += `\n\n Plan: ${stats.plan.name}`;
        if (stats.plan.name === 'Free') {
            content += '\n {yellow-fg}Limited access{/}';
        }
        else {
            content += '\n 5-hour billing cycles';
        }
        this.widgets.alerts.setContent(content);
    }
    createProgressBar(percent, width) {
        const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)));
        const empty = Math.max(0, width - filled);
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    formatDuration(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }
    showHelp() {
        const helpBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: '50%',
            content: `
Claude Monitor Help

Keyboard Shortcuts:
  Tab     - Switch between panels
  ↑/↓     - Navigate within panels  
  Enter   - Show details
  r       - Refresh data
  w       - Launch web dashboard
  e       - Export current view
  ?/h     - Show this help
  q       - Quit

Press any key to close...`,
            border: { type: 'line' },
            style: {
                border: { fg: 'yellow' }
            }
        });
        helpBox.key(['escape', 'q', 'enter'], () => {
            helpBox.destroy();
            this.screen.render();
        });
        helpBox.focus();
        this.screen.render();
    }
    showError(error) {
        const errorBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: '30%',
            content: `Error: ${error.message}\n\nPress any key to continue...`,
            border: { type: 'line' },
            style: {
                border: { fg: 'red' }
            }
        });
        errorBox.key(['escape', 'q', 'enter'], () => {
            errorBox.destroy();
            this.screen.render();
        });
        errorBox.focus();
        this.screen.render();
    }
}
exports.TerminalUI = TerminalUI;
//# sourceMappingURL=TerminalUI.js.map