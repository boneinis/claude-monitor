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
const constants_1 = require("../core/constants");
const updateChecker_1 = require("../utils/updateChecker");
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
            title: 'Claude Monitor',
            autoPadding: true,
            fullUnicode: true
        });
        this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });
        this.widgets = this.createWidgets();
        this.setupKeyboardHandlers();
    }
    createWidgets() {
        const header = this.grid.set(0, 0, 2, 12, blessed.box, {
            label: ' Claude Monitor ',
            content: '\n ◉ Real-time usage tracking for Claude',
            border: { type: 'line' },
            style: {
                border: { fg: 'magenta' },
                label: { fg: 'white', bold: true },
                fg: 'white'
            }
        });
        const currentUsage = this.grid.set(2, 0, 4, 6, blessed.box, {
            label: ' Current Session ',
            border: { type: 'line' },
            style: {
                border: { fg: 'magenta' },
                label: { fg: 'white', bold: true }
            }
        });
        const todayStats = this.grid.set(2, 6, 4, 6, blessed.box, {
            label: ' Today\'s Usage ',
            border: { type: 'line' },
            style: {
                border: { fg: 'magenta' },
                label: { fg: 'white', bold: true }
            }
        });
        const recentActivity = this.grid.set(6, 0, 4, 8, blessed.box, {
            label: ' Recent Activity ',
            border: { type: 'line' },
            style: {
                border: { fg: 'magenta' },
                label: { fg: 'white', bold: true }
            }
        });
        const alerts = this.grid.set(6, 8, 4, 4, blessed.box, {
            label: ' Status ',
            border: { type: 'line' },
            style: {
                border: { fg: 'magenta' },
                label: { fg: 'white', bold: true }
            }
        });
        const footer = this.grid.set(10, 0, 2, 12, blessed.box, {
            content: ' [r] Refresh  [s] Plan  [u] Updates  [p] Projects  [?] Help  [q] Quit',
            align: 'center',
            style: {
                fg: 'white'
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
        // Global screen key handlers
        this.screen.key(['q', 'C-c'], () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            process.exit(0);
        });
        this.screen.key(['tab'], () => {
            this.screen.focusNext();
        });
        this.screen.key(['r'], async () => {
            try {
                await this.refresh();
            }
            catch (error) {
                this.showError(error);
            }
        });
        this.screen.key(['?', 'h'], () => {
            this.showHelp();
        });
        this.screen.key(['p'], () => {
            this.showProjects();
        });
        this.screen.key(['s'], () => {
            this.showPlanSelector();
        });
        this.screen.key(['u'], () => {
            this.checkForUpdates();
        });
        // Also add key handlers to all widgets to ensure they work
        Object.values(this.widgets).forEach(widget => {
            widget.key(['r'], async () => {
                try {
                    await this.refresh();
                }
                catch (error) {
                    this.showError(error);
                }
            });
            widget.key(['p'], () => {
                this.showProjects();
            });
            widget.key(['?', 'h'], () => {
                this.showHelp();
            });
            widget.key(['s'], () => {
                this.showPlanSelector();
            });
            widget.key(['u'], () => {
                this.checkForUpdates();
            });
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
        this.widgets.header.setContent(`\n ◉ Plan: ${plan}                Last Updated: ${lastUpdate}`);
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
            const cost = `$${session.totalCost.toFixed(2)}`;
            const resetIn = stats.timeUntilReset;
            const messages = session.tokenUsage.length;
            // Create progress bar
            const progressPercent = Math.min(100, (totalTokens / sessionLimit) * 100);
            const progressBar = this.createProgressBar(progressPercent, 20);
            // Time progress (5 hours = 300 minutes)
            const sessionDuration = 300; // 5 hours in minutes
            const elapsed = Math.floor((Date.now() - session.startTime.getTime()) / (1000 * 60));
            const timePercent = Math.min(100, (elapsed / sessionDuration) * 100);
            const timeBar = this.createProgressBar(timePercent, 20);
            content += ` ● Active session (${duration} elapsed)\n`;
            content += ` Messages: ${messages}\n`;
            content += ` Tokens: ${tokensDisplay}\n`;
            content += ` Usage: ${progressBar} ${usagePercent}\n`;
            content += ` Time:  ${timeBar} ${timePercent.toFixed(0)}%\n`;
            content += ` Cost: ${cost}\n`;
            content += ` Resets in: ${Math.floor(resetIn / 60)}h ${resetIn % 60}m`;
            // Show burn rate if meaningful
            if (stats.burnRate > 0) {
                content += `\n Burn rate: ${stats.burnRate.toFixed(1)} msg/min`;
            }
        }
        else {
            content += ' No active session\n';
            content += ' Start using Claude to begin tracking';
        }
        this.widgets.currentUsage.setContent(content);
    }
    updateTodayStats(stats) {
        let content = '\n';
        content += ` Messages today: ${stats.todayPrompts}\n`;
        content += ` Cost today: $${stats.dailyCost.toFixed(2)}\n`;
        content += ` Sessions: ${stats.sessionsToday}\n`;
        content += ` Plan: ${stats.plan.name}\n`;
        if (stats.plan.name === 'Free') {
            content += '\n Limited Claude Code access\n';
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
                // Scale bar based on highest cost day, limit to 12 chars for layout
                const barLength = maxCost > 0 ? Math.round((cost / maxCost) * 12) : 0;
                const bar = '█'.repeat(Math.max(0, barLength));
                content += ` ${dayName.padEnd(8)} ${bar.padEnd(12)} $${cost.toFixed(2)}`;
                if (tokens > 0) {
                    const tokensK = tokens > 1000000 ? `${(tokens / 1000000).toFixed(1)}M` : `${(tokens / 1000).toFixed(0)}k`;
                    content += ` (${tokensK})`;
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
            let status = 'Active';
            if (cost > 0.10)
                status = 'High cost';
            if (cost > 0.50)
                status = 'Very high cost';
            content += ` Session: ${status}\n`;
            content += ` Messages: ${messages}\n`;
            content += ` Cost: $${cost.toFixed(2)}\n`;
        }
        else {
            content += ' No active session\n';
        }
        // Usage warnings based on cost
        if (stats.dailyCost > 5.0) {
            content += '\n ⚠ High daily cost!';
        }
        else if (stats.dailyCost > 1.0) {
            content += '\n ⚠ Moderate daily cost';
        }
        // Plan info
        content += `\n\n Plan: ${stats.plan.name}`;
        if (stats.plan.name === 'Free') {
            content += '\n Limited access';
        }
        else {
            content += '\n 5-hour cycles';
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
            height: '60%',
            content: `
Claude Monitor Help

Keyboard Shortcuts:
  Tab     - Switch between panels
  ↑/↓     - Navigate within panels  
  Enter   - Show details
  r       - Refresh data
  s       - Switch plan (Pro/Max5/Max20/Team)
  u       - Check for updates
  p       - Show projects
  ?/h     - Show this help
  q       - Quit

Plans Available:
  Pro   - 4.5M tokens, $20/month
  Max5  - 22.5M tokens, $100/month  
  Max20 - 90M tokens, $200/month
  Team  - 4.5M tokens, $25/user/month

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
    async showProjects() {
        try {
            const projects = await this.monitor.getProjects();
            const projectsList = projects.length > 0
                ? projects.map((p, i) => `${i + 1}. ${p}`).join('\n')
                : 'No projects found';
            const projectsBox = blessed.box({
                parent: this.screen,
                top: 'center',
                left: 'center',
                width: '60%',
                height: '60%',
                content: `
Claude Projects

${projectsList}

Press any key to close...`,
                border: { type: 'line' },
                style: {
                    border: { fg: 'cyan' }
                }
            });
            projectsBox.key(['escape', 'q', 'enter', 'p'], () => {
                projectsBox.destroy();
                this.screen.render();
            });
            projectsBox.focus();
            this.screen.render();
        }
        catch (error) {
            this.showError(error);
        }
    }
    showPlanSelector() {
        const currentPlan = this.monitor.getCurrentPlan();
        const plans = Object.entries(constants_1.PLANS).map(([key, plan]) => ({
            key,
            plan,
            isCurrent: plan.name === currentPlan.name
        }));
        const plansList = plans.map((p, i) => `${i + 1}. ${p.plan.name}${p.isCurrent ? ' (current)' : ''} - ${p.plan.estimatedTokensPerSession.toLocaleString()} tokens`).join('\n');
        const planBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '70%',
            content: `
Select Plan

${plansList}

Press 1-${plans.length} to select a plan, or any other key to cancel...`,
            border: { type: 'line' },
            style: {
                border: { fg: 'yellow' }
            }
        });
        // Handle plan selection
        for (let i = 0; i < plans.length; i++) {
            planBox.key([String(i + 1)], () => {
                const selectedPlan = plans[i];
                this.monitor.setPlan(selectedPlan.plan);
                planBox.destroy();
                this.refresh(); // Refresh to show new plan
                this.screen.render();
            });
        }
        // Handle cancellation
        planBox.key(['escape', 'q', 'enter', 's'], () => {
            planBox.destroy();
            this.screen.render();
        });
        planBox.focus();
        this.screen.render();
    }
    async checkForUpdates() {
        // Show loading message
        const loadingBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: '20%',
            content: '\n Checking for updates...\n Please wait...',
            border: { type: 'line' },
            style: {
                border: { fg: 'blue' }
            }
        });
        this.screen.render();
        try {
            const result = await updateChecker_1.UpdateChecker.checkForUpdatesInteractive();
            loadingBox.destroy();
            let content;
            let borderColor;
            if (result.error) {
                content = `
Update Check Failed

Error: ${result.error}

Please check your internet connection and try again.

Press any key to close...`;
                borderColor = 'red';
            }
            else if (result.hasUpdate && result.release) {
                content = `
Update Available!

Current version: v1.0.0
Latest version: ${result.release.tag_name}
Released: ${new Date(result.release.published_at).toLocaleDateString()}

Download: ${result.release.html_url}

Press any key to close...`;
                borderColor = 'green';
            }
            else {
                content = `
You're Up to Date!

Current version: v1.0.0
You have the latest version installed.

Press any key to close...`;
                borderColor = 'green';
            }
            const updateBox = blessed.box({
                parent: this.screen,
                top: 'center',
                left: 'center',
                width: '60%',
                height: '60%',
                content,
                border: { type: 'line' },
                style: {
                    border: { fg: borderColor }
                }
            });
            updateBox.key(['escape', 'q', 'enter', 'u'], () => {
                updateBox.destroy();
                this.screen.render();
            });
            updateBox.focus();
            this.screen.render();
        }
        catch (error) {
            loadingBox.destroy();
            this.showError(error);
        }
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