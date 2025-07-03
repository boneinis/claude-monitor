"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorEngine = void 0;
const constants_1 = require("./constants");
const formatters_1 = require("../utils/formatters");
class MonitorEngine {
    dataLoader;
    plan;
    alerts = [];
    updateCallbacks = [];
    constructor(dataLoader, plan = constants_1.PLANS.Pro) {
        this.dataLoader = dataLoader;
        this.plan = plan;
    }
    async getProjects() {
        return this.dataLoader.getProjects();
    }
    async getCurrentStats(projectName) {
        const sessions = await this.dataLoader.getCurrentSessions(projectName);
        const todayUsage = await this.dataLoader.loadTodayData(projectName);
        const currentSession = sessions[0];
        const previousSession = sessions[1];
        const todayPrompts = todayUsage.length;
        const dailyCost = todayUsage.reduce((sum, u) => sum + u.cost, 0);
        const todayTokens = todayUsage.reduce((sum, u) => sum + u.totalTokens, 0);
        const burnRate = this.calculateBurnRate(currentSession);
        const timeUntilReset = this.calculateTimeUntilReset(currentSession);
        // Count actual reset periods today
        const sessionsToday = this.countSessionsToday();
        this.checkAlerts(dailyCost);
        return {
            currentSession,
            previousSession,
            todayPrompts,
            dailyCost,
            todayTokens,
            burnRate,
            timeUntilReset,
            alerts: this.alerts,
            sessionsToday,
            plan: this.plan
        };
    }
    async getDailyStats(days = 7, projectName) {
        const allUsage = await this.dataLoader.loadRecentData(days * 24, projectName);
        const statsByDay = new Map();
        for (const usage of allUsage) {
            const date = new Date(usage.timestamp).toISOString().split('T')[0];
            if (!statsByDay.has(date)) {
                statsByDay.set(date, {
                    date,
                    sessions: 0,
                    totalTokens: 0,
                    totalCost: 0,
                    tokensByModel: {},
                    costByModel: {},
                    cacheCost: 0,
                    noCacheCost: 0,
                    cacheSavings: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    cacheReadTokens: 0,
                    cacheWriteTokens: 0
                });
            }
            const stats = statsByDay.get(date);
            stats.totalTokens += usage.totalTokens;
            stats.totalCost += usage.cost;
            // Add individual token breakdowns
            stats.inputTokens += usage.inputTokens;
            stats.outputTokens += usage.outputTokens;
            stats.cacheReadTokens += usage.cacheReadTokens;
            stats.cacheWriteTokens += usage.cacheCreateTokens;
            // Calculate cache costs and savings
            if (usage.costBreakdown) {
                stats.cacheCost += usage.costBreakdown.cacheWrite + usage.costBreakdown.cacheRead;
                // No-cache cost: calculate what it would cost without any caching
                const modelKey = Object.keys(constants_1.MODEL_COSTS).find(k => usage.model.includes(k));
                if (modelKey) {
                    const rates = constants_1.MODEL_COSTS[modelKey];
                    // Without cache: regular input tokens + cache tokens would all be regular input + output tokens
                    const totalInputWithoutCache = usage.inputTokens + usage.cacheCreateTokens + usage.cacheReadTokens;
                    const noCacheItemCost = (totalInputWithoutCache / 1000000) * rates.input +
                        (usage.outputTokens / 1000000) * rates.output;
                    stats.noCacheCost += noCacheItemCost;
                }
            }
            if (!stats.tokensByModel[usage.model]) {
                stats.tokensByModel[usage.model] = 0;
                stats.costByModel[usage.model] = 0;
            }
            stats.tokensByModel[usage.model] += usage.totalTokens;
            stats.costByModel[usage.model] += usage.cost;
        }
        // Calculate savings for each day
        statsByDay.forEach(stats => {
            stats.cacheSavings = stats.noCacheCost - stats.totalCost;
        });
        return Array.from(statsByDay.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    async getWeeklyStats(weeks = 4, projectName) {
        // Load all data to ensure we have enough history
        const allUsage = await this.dataLoader.loadAllData(projectName);
        const weeklyStats = [];
        // Group usage by week (Sunday to Saturday)
        const usageByWeek = new Map();
        for (const usage of allUsage) {
            const date = new Date(usage.timestamp);
            const weekStart = this.getWeekStart(date);
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!usageByWeek.has(weekKey)) {
                usageByWeek.set(weekKey, []);
            }
            usageByWeek.get(weekKey).push(usage);
        }
        // Calculate stats for each week
        for (const [weekStartStr, weekUsage] of usageByWeek) {
            const weekStart = new Date(weekStartStr);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const tokensByModel = {};
            const costByModel = {};
            let totalTokens = 0;
            let totalCost = 0;
            let inputTokens = 0;
            let outputTokens = 0;
            let cacheReadTokens = 0;
            let cacheWriteTokens = 0;
            let cacheCost = 0;
            let noCacheCost = 0;
            for (const usage of weekUsage) {
                totalTokens += usage.totalTokens;
                totalCost += usage.cost;
                inputTokens += usage.inputTokens;
                outputTokens += usage.outputTokens;
                cacheReadTokens += usage.cacheReadTokens;
                cacheWriteTokens += usage.cacheCreateTokens;
                if (!tokensByModel[usage.model]) {
                    tokensByModel[usage.model] = 0;
                    costByModel[usage.model] = 0;
                }
                tokensByModel[usage.model] += usage.totalTokens;
                costByModel[usage.model] += usage.cost;
                // Calculate cache costs
                if (usage.costBreakdown) {
                    cacheCost += usage.costBreakdown.cacheWrite + usage.costBreakdown.cacheRead;
                    // Calculate no-cache cost
                    const modelKey = Object.keys(constants_1.MODEL_COSTS).find(k => usage.model.includes(k));
                    if (modelKey) {
                        const rates = constants_1.MODEL_COSTS[modelKey];
                        const totalInputWithoutCache = usage.inputTokens + usage.cacheCreateTokens + usage.cacheReadTokens;
                        const noCacheItemCost = (totalInputWithoutCache / 1000000) * rates.input +
                            (usage.outputTokens / 1000000) * rates.output;
                        noCacheCost += noCacheItemCost;
                    }
                }
            }
            const uniqueDays = new Set(weekUsage.map(u => new Date(u.timestamp).toISOString().split('T')[0])).size;
            weeklyStats.push({
                weekStart: weekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                days: uniqueDays,
                sessions: weekUsage.length,
                totalTokens,
                totalCost,
                dailyAverage: totalCost / Math.max(1, uniqueDays),
                tokensByModel,
                costByModel,
                inputTokens,
                outputTokens,
                cacheReadTokens,
                cacheWriteTokens,
                cacheCost,
                noCacheCost,
                cacheSavings: noCacheCost - totalCost
            });
        }
        return weeklyStats.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    }
    async getMonthlyStats(months = 3, projectName) {
        // Load all data to ensure we have enough history
        const allUsage = await this.dataLoader.loadAllData(projectName);
        const monthlyStats = [];
        // Group usage by month
        const usageByMonth = new Map();
        for (const usage of allUsage) {
            const date = new Date(usage.timestamp);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!usageByMonth.has(monthKey)) {
                usageByMonth.set(monthKey, []);
            }
            usageByMonth.get(monthKey).push(usage);
        }
        // Calculate stats for each month
        for (const [monthKey, monthUsage] of usageByMonth) {
            const [year, month] = monthKey.split('-');
            const tokensByModel = {};
            const costByModel = {};
            let totalTokens = 0;
            let totalCost = 0;
            let inputTokens = 0;
            let outputTokens = 0;
            let cacheReadTokens = 0;
            let cacheWriteTokens = 0;
            let cacheCost = 0;
            let noCacheCost = 0;
            for (const usage of monthUsage) {
                totalTokens += usage.totalTokens;
                totalCost += usage.cost;
                inputTokens += usage.inputTokens;
                outputTokens += usage.outputTokens;
                cacheReadTokens += usage.cacheReadTokens;
                cacheWriteTokens += usage.cacheCreateTokens;
                if (!tokensByModel[usage.model]) {
                    tokensByModel[usage.model] = 0;
                    costByModel[usage.model] = 0;
                }
                tokensByModel[usage.model] += usage.totalTokens;
                costByModel[usage.model] += usage.cost;
                // Calculate cache costs
                if (usage.costBreakdown) {
                    cacheCost += usage.costBreakdown.cacheWrite + usage.costBreakdown.cacheRead;
                    // Calculate no-cache cost
                    const modelKey = Object.keys(constants_1.MODEL_COSTS).find(k => usage.model.includes(k));
                    if (modelKey) {
                        const rates = constants_1.MODEL_COSTS[modelKey];
                        const totalInputWithoutCache = usage.inputTokens + usage.cacheCreateTokens + usage.cacheReadTokens;
                        const noCacheItemCost = (totalInputWithoutCache / 1000000) * rates.input +
                            (usage.outputTokens / 1000000) * rates.output;
                        noCacheCost += noCacheItemCost;
                    }
                }
            }
            const uniqueDays = new Set(monthUsage.map(u => new Date(u.timestamp).toISOString().split('T')[0])).size;
            // Calculate API equivalent cost and savings
            const apiEquivalentCost = totalCost; // This is already the API cost
            const planCost = this.plan.monthlyCost || 0;
            // Savings is negative when plan costs more than API usage, but you get unlimited access
            const savings = apiEquivalentCost - planCost; // Can be negative
            monthlyStats.push({
                month: month,
                year: parseInt(year),
                days: uniqueDays,
                sessions: monthUsage.length,
                totalTokens,
                totalCost,
                dailyAverage: totalCost / Math.max(1, uniqueDays),
                weeklyAverage: totalCost / Math.max(1, Math.ceil(uniqueDays / 7)),
                tokensByModel,
                costByModel,
                planCost,
                apiEquivalentCost,
                savings,
                inputTokens,
                outputTokens,
                cacheReadTokens,
                cacheWriteTokens,
                cacheCost,
                noCacheCost,
                cacheSavings: noCacheCost - totalCost
            });
        }
        return monthlyStats.sort((a, b) => {
            const aDate = new Date(a.year, parseInt(a.month) - 1);
            const bDate = new Date(b.year, parseInt(b.month) - 1);
            return aDate.getTime() - bDate.getTime();
        });
    }
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Sunday is 0
        d.setDate(diff);
        d.setHours(0, 0, 0, 0); // Reset to start of day
        return d;
    }
    calculateBurnRate(session) {
        if (!session || session.tokenUsage.length < 2)
            return 0;
        const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60;
        if (duration === 0)
            return 0;
        return Math.round(session.tokenUsage.length / duration); // prompts per minute
    }
    calculateTimeRemaining(session) {
        if (!session)
            return this.plan.codePromptsPerSession;
        const burnRate = this.calculateBurnRate(session);
        if (burnRate === 0)
            return Infinity;
        const promptsRemaining = this.plan.codePromptsPerSession - session.tokenUsage.length;
        return Math.max(0, Math.round(promptsRemaining / burnRate));
    }
    checkAlerts(dailyCost) {
        this.alerts = [];
        if (dailyCost > 5.0) {
            this.alerts.push({
                type: 'critical',
                message: `High daily cost: ${(0, formatters_1.formatCurrency)(dailyCost)}`,
                timestamp: new Date()
            });
        }
        else if (dailyCost > 1.0) {
            this.alerts.push({
                type: 'warning',
                message: `Moderate daily cost: ${(0, formatters_1.formatCurrency)(dailyCost)}`,
                timestamp: new Date()
            });
        }
        if (this.plan.name === 'Free') {
            this.alerts.push({
                type: 'info',
                message: 'Limited Claude Code access on Free plan',
                timestamp: new Date()
            });
        }
    }
    calculateTimeUntilReset(session) {
        if (!session) {
            return 0;
        }
        const sessionEnd = new Date(session.startTime.getTime() + 5 * 60 * 60 * 1000); // 5 hours from start
        const now = new Date();
        return Math.max(0, Math.round((sessionEnd.getTime() - now.getTime()) / 1000 / 60)); // minutes
    }
    countSessionsToday() {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
        // Fixed 5-hour reset windows: 00:00, 05:00, 10:00, 15:00, 20:00 UTC
        const resetHours = [0, 5, 10, 15, 20];
        let count = 0;
        for (const hour of resetHours) {
            const resetTime = new Date(todayStart);
            resetTime.setUTCHours(hour, 0, 0, 0);
            // Count if this reset has already happened today
            if (resetTime <= now) {
                count++;
            }
        }
        return count;
    }
    calculateEfficiency(usage) {
        if (usage.length === 0)
            return 100;
        const totalInput = usage.reduce((sum, u) => sum + u.inputTokens, 0);
        const totalOutput = usage.reduce((sum, u) => sum + u.outputTokens, 0);
        if (totalInput === 0)
            return 100;
        const ratio = totalOutput / totalInput;
        const efficiency = Math.min(100, Math.round(ratio * 50));
        return efficiency;
    }
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }
    setPlan(plan) {
        this.plan = plan;
    }
}
exports.MonitorEngine = MonitorEngine;
//# sourceMappingURL=MonitorEngine.js.map