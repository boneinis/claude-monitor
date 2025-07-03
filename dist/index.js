#!/usr/bin/env node
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
const commander_1 = require("commander");
const DataLoader_1 = require("./core/DataLoader");
const MonitorEngine_1 = require("./core/MonitorEngine");
const TerminalUI_1 = require("./tui/TerminalUI");
const WebServer_1 = require("./web/WebServer");
const constants_1 = require("./core/constants");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const program = new commander_1.Command();
program
    .name('claude-monitor')
    .description('Terminal-based Claude Code usage monitor')
    .version('1.0.0')
    .option('-p, --path <path>', 'Path to Claude projects directory', path.join(os.homedir(), '.claude', 'projects'))
    .option('--plan <plan>', 'Subscription plan (Free, Pro, Max5, Max20)', 'Max20')
    .option('-r, --refresh <ms>', 'Refresh interval in milliseconds', '3000')
    .option('--live', 'Show live monitor only')
    .option('--daily', 'Show daily report and exit')
    .option('--web', 'Launch web dashboard')
    .option('--web-only', 'Run web server without TUI')
    .option('--port <port>', 'Web server port', '3000')
    .action(async (options) => {
    try {
        const dataLoader = new DataLoader_1.DataLoader(options.path);
        const plan = constants_1.PLANS[options.plan] || constants_1.PLANS.Max20;
        const monitor = new MonitorEngine_1.MonitorEngine(dataLoader, plan);
        if (options.daily) {
            await showDailyReport(monitor);
            process.exit(0);
        }
        if (options.webOnly) {
            const webServer = new WebServer_1.WebServer(monitor);
            await webServer.start(parseInt(options.port));
            console.log('Web server running. Press Ctrl+C to stop.');
            // Keep the process alive
            process.on('SIGINT', () => {
                console.log('\nShutting down web server...');
                webServer.stop();
                process.exit(0);
            });
            return;
        }
        // Start TUI
        const ui = new TerminalUI_1.TerminalUI(monitor);
        // Optionally start web server in parallel
        let webServer = null;
        if (options.web) {
            webServer = new WebServer_1.WebServer(monitor);
            await webServer.start(parseInt(options.port));
        }
        // Handle shutdown gracefully
        process.on('SIGINT', () => {
            console.log('\nShutting down...');
            if (webServer) {
                webServer.stop();
            }
            process.exit(0);
        });
        await ui.start(parseInt(options.refresh));
    }
    catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
});
async function showDailyReport(monitor) {
    const stats = await monitor.getCurrentStats();
    const dailyStats = await monitor.getDailyStats(7);
    const weeklyStats = await monitor.getWeeklyStats(4);
    const monthlyStats = await monitor.getMonthlyStats(3);
    console.log('\n📊 Claude Monitor - Usage Report\n');
    console.log(`Today's Usage:`);
    console.log(`  Messages: ${stats.todayPrompts}`);
    console.log(`  Cost: $${stats.dailyCost.toFixed(3)}`);
    console.log(`  Active sessions: ${stats.sessionsToday}`);
    // Today's cache breakdown
    const today = dailyStats.find(d => d.date === new Date().toISOString().split('T')[0]);
    if (today && today.cacheCost) {
        const nonCacheCost = today.totalCost - today.cacheCost;
        console.log(`\nToday's Cost Breakdown:`);
        console.log(`  Regular tokens: $${nonCacheCost.toFixed(3)} (${((nonCacheCost / today.totalCost) * 100).toFixed(1)}%)`);
        console.log(`  Cache costs: $${today.cacheCost.toFixed(3)} (${((today.cacheCost / today.totalCost) * 100).toFixed(1)}%)`);
        console.log(`  Without cache: $${today.noCacheCost?.toFixed(3) || 'N/A'}`);
        console.log(`  Savings: $${today.cacheSavings?.toFixed(3) || '0'} (${((today.cacheSavings / today.noCacheCost) * 100).toFixed(1)}%)`);
    }
    if (stats.currentSession) {
        console.log(`\nCurrent Session:`);
        console.log(`  Messages: ${stats.currentSession.tokenUsage.length}`);
        console.log(`  Tokens: ${stats.currentSession.totalTokens.toLocaleString()}`);
        console.log(`  Cost: $${stats.currentSession.totalCost.toFixed(3)}`);
        console.log(`  Resets in: ${Math.floor(stats.timeUntilReset / 60)}h ${stats.timeUntilReset % 60}m`);
    }
    console.log('\nLast 7 days:');
    dailyStats.forEach(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
        const bar = '█'.repeat(Math.round(day.totalCost * 10));
        console.log(`  ${dayName}: ${bar} $${day.totalCost.toFixed(3)}`);
    });
    // Cache cost analysis
    const totalDays = dailyStats.length;
    const totalCacheCost = dailyStats.reduce((sum, d) => sum + (d.cacheCost || 0), 0);
    const totalNoCacheCost = dailyStats.reduce((sum, d) => sum + (d.noCacheCost || 0), 0);
    const totalSavings = dailyStats.reduce((sum, d) => sum + (d.cacheSavings || 0), 0);
    if (totalDays > 0 && totalCacheCost > 0) {
        console.log('\nCache Cost Analysis:');
        console.log(`  Cache costs: $${totalCacheCost.toFixed(2)} (${((totalCacheCost / dailyStats.reduce((s, d) => s + d.totalCost, 0)) * 100).toFixed(1)}% of total)`);
        console.log(`  Without cache: $${totalNoCacheCost.toFixed(2)}`);
        console.log(`  Cache savings: $${totalSavings.toFixed(2)} (${((totalSavings / totalNoCacheCost) * 100).toFixed(1)}% saved)`);
    }
    if (weeklyStats.length > 0) {
        console.log('\nWeekly Summary:');
        weeklyStats.slice(-2).forEach(week => {
            const startDate = new Date(week.weekStart);
            const weekLabel = startDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });
            console.log(`  Week ${weekLabel}: $${week.totalCost.toFixed(2)} (${week.days} days, avg $${week.dailyAverage.toFixed(2)}/day)`);
        });
    }
    if (monthlyStats.length > 0) {
        const currentMonth = monthlyStats[monthlyStats.length - 1];
        console.log('\nMonthly Summary:');
        console.log(`  Current usage (if API): $${currentMonth.apiEquivalentCost.toFixed(2)}`);
        console.log(`  Max20 plan cost: $${currentMonth.planCost.toFixed(2)}`);
        if (currentMonth.apiEquivalentCost > currentMonth.planCost) {
            console.log(`  Savings: $${(currentMonth.apiEquivalentCost - currentMonth.planCost).toFixed(2)}`);
        }
        else {
            console.log(`  Cost for unlimited access: $${(currentMonth.planCost - currentMonth.apiEquivalentCost).toFixed(2)}`);
        }
        console.log(`  Daily average: $${currentMonth.dailyAverage.toFixed(3)}`);
    }
    if (stats.alerts.length > 0) {
        console.log('\n⚠️  Alerts:');
        stats.alerts.forEach(alert => {
            console.log(`  - ${alert.message}`);
        });
    }
}
program.parse(process.argv);
//# sourceMappingURL=index.js.map