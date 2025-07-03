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
exports.DataLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const glob_1 = require("glob");
const constants_1 = require("./constants");
class DataLoader {
    projectPath;
    constructor(projectPath) {
        this.projectPath = projectPath || path.join(os.homedir(), '.claude', 'projects');
    }
    async getProjects() {
        const pattern = path.join(this.projectPath, '*');
        const dirs = await (0, glob_1.glob)(pattern);
        const projects = [];
        for (const dir of dirs) {
            const stats = fs.statSync(dir);
            if (stats.isDirectory()) {
                projects.push(path.basename(dir));
            }
        }
        return projects.sort();
    }
    async loadRecentData(hours = 24, projectName) {
        const files = await this.findRecentFiles(hours, projectName);
        const allUsage = [];
        const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
        for (const file of files) {
            const usage = await this.parseJsonlFile(file, projectName);
            // Filter to only include messages within the time window
            const recentUsage = usage.filter(u => new Date(u.timestamp) >= cutoffTime);
            allUsage.push(...recentUsage);
        }
        return allUsage.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async loadAllData(projectName) {
        const pattern = projectName
            ? path.join(this.projectPath, projectName, '**', '*.jsonl')
            : path.join(this.projectPath, '**', '*.jsonl');
        const files = await (0, glob_1.glob)(pattern);
        const allUsage = [];
        for (const file of files) {
            const usage = await this.parseJsonlFile(file, projectName);
            allUsage.push(...usage);
        }
        return allUsage.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async loadTodayData(projectName) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Use local midnight instead of UTC
        const files = await this.findRecentFiles(24, projectName);
        const todayUsage = [];
        for (const file of files) {
            const usage = await this.parseJsonlFile(file, projectName);
            const todayData = usage.filter(u => new Date(u.timestamp) >= today);
            todayUsage.push(...todayData);
        }
        return todayUsage.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async getCurrentSessions(projectName) {
        const now = new Date();
        const recentUsage = await this.loadRecentData(constants_1.SESSION_WINDOW_HOURS * 3, projectName); // Get more data to ensure we have full sessions
        if (recentUsage.length === 0) {
            return [];
        }
        // Fixed 5-hour reset windows in UTC: 00:00, 05:00, 10:00, 15:00, 20:00
        const resetHours = [0, 5, 10, 15, 20];
        // Get the last reset time before now
        const currentHour = now.getUTCHours();
        const currentMinutes = now.getUTCMinutes();
        let lastResetHour = resetHours.filter(h => h <= currentHour).pop();
        if (lastResetHour === undefined || (lastResetHour === currentHour && currentMinutes === 0)) {
            // We're before the first reset of the day or exactly at a reset time
            lastResetHour = resetHours[resetHours.length - 1]; // Use yesterday's last reset
        }
        const lastResetTime = new Date(now);
        lastResetTime.setUTCHours(lastResetHour, 0, 0, 0);
        // If the calculated reset time is in the future, go back one day
        if (lastResetTime > now) {
            lastResetTime.setUTCDate(lastResetTime.getUTCDate() - 1);
        }
        // Get previous reset time (5 hours before)
        const previousResetTime = new Date(lastResetTime);
        previousResetTime.setUTCHours(previousResetTime.getUTCHours() - 5);
        // Get next reset time
        let nextResetHour = resetHours.find(h => h > currentHour);
        const nextResetTime = new Date(now);
        if (nextResetHour === undefined) {
            // Next reset is tomorrow at 00:00
            nextResetTime.setUTCDate(nextResetTime.getUTCDate() + 1);
            nextResetTime.setUTCHours(0, 0, 0, 0);
        }
        else {
            nextResetTime.setUTCHours(nextResetHour, 0, 0, 0);
        }
        // Filter usage data for current and previous reset windows
        const sessions = [];
        // Current reset window
        const currentWindowUsage = recentUsage.filter(u => {
            const timestamp = new Date(u.timestamp);
            return timestamp >= lastResetTime && timestamp < nextResetTime;
        });
        if (currentWindowUsage.length > 0) {
            sessions.push({
                id: lastResetTime.toISOString(),
                startTime: lastResetTime,
                endTime: nextResetTime,
                tokenUsage: currentWindowUsage,
                totalTokens: currentWindowUsage.reduce((sum, e) => sum + e.totalTokens, 0),
                totalCost: currentWindowUsage.reduce((sum, e) => sum + e.cost, 0)
            });
        }
        // Previous reset window
        const previousWindowUsage = recentUsage.filter(u => {
            const timestamp = new Date(u.timestamp);
            return timestamp >= previousResetTime && timestamp < lastResetTime;
        });
        if (previousWindowUsage.length > 0) {
            sessions.push({
                id: previousResetTime.toISOString(),
                startTime: previousResetTime,
                endTime: lastResetTime,
                tokenUsage: previousWindowUsage,
                totalTokens: previousWindowUsage.reduce((sum, e) => sum + e.totalTokens, 0),
                totalCost: previousWindowUsage.reduce((sum, e) => sum + e.cost, 0)
            });
        }
        // Sort by start time descending (most recent first)
        return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    }
    async findRecentFiles(hours, projectName) {
        const pattern = projectName
            ? path.join(this.projectPath, projectName, '**', '*.jsonl')
            : path.join(this.projectPath, '**', '*.jsonl');
        const files = await (0, glob_1.glob)(pattern);
        const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
        return files.filter(file => {
            const stats = fs.statSync(file);
            return stats.mtime.getTime() > cutoffTime;
        });
    }
    async parseJsonlFile(filePath, projectName) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n');
        const usage = [];
        const currentDate = new Date();
        // Extract project name from file path if not provided
        if (!projectName) {
            const relativePath = path.relative(this.projectPath, filePath);
            const pathParts = relativePath.split(path.sep);
            projectName = pathParts[0]; // First directory is the project name
        }
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                // Look for assistant messages with usage data (ccusage approach)
                if (data.message?.usage && data.timestamp) {
                    const usageData = data.message.usage;
                    const model = data.message.model || 'unknown';
                    // Check if timestamp is in the future and adjust if needed
                    let timestamp = new Date(data.timestamp);
                    const timestampStr = data.timestamp;
                    // Since today is July 2, 2025, we don't need to adjust timestamps
                    // The data from June-July 2025 is valid
                    // Use provided cost if available, otherwise calculate
                    let cost = 0;
                    let costBreakdown = undefined;
                    if (data.costUSD !== undefined) {
                        cost = data.costUSD;
                    }
                    else {
                        // Calculate cost from tokens using our pricing table
                        const modelKey = Object.keys(constants_1.MODEL_COSTS).find(k => model.includes(k));
                        if (modelKey) {
                            const costs = constants_1.MODEL_COSTS[modelKey];
                            const baseInputTokens = usageData.input_tokens || 0;
                            const cacheCreateTokens = usageData.cache_creation_input_tokens || 0;
                            const cacheReadTokens = usageData.cache_read_input_tokens || 0;
                            const outputTokens = usageData.output_tokens || 0;
                            // Calculate costs for each token type
                            const inputCost = (baseInputTokens / 1000000) * costs.input;
                            const outputCost = (outputTokens / 1000000) * costs.output;
                            const cacheWriteCost = (cacheCreateTokens / 1000000) * costs.cacheWrite;
                            const cacheReadCost = (cacheReadTokens / 1000000) * costs.cacheRead;
                            cost = inputCost + outputCost + cacheWriteCost + cacheReadCost;
                            // Store cost breakdown
                            costBreakdown = {
                                input: inputCost,
                                output: outputCost,
                                cacheWrite: cacheWriteCost,
                                cacheRead: cacheReadCost
                            };
                        }
                    }
                    const baseInputTokens = usageData.input_tokens || 0;
                    const outputTokens = usageData.output_tokens || 0;
                    const cacheCreateTokens = usageData.cache_creation_input_tokens || 0;
                    const cacheReadTokens = usageData.cache_read_input_tokens || 0;
                    const totalTokens = baseInputTokens + outputTokens + cacheCreateTokens + cacheReadTokens;
                    usage.push({
                        timestamp: timestamp.toISOString(),
                        model: model,
                        inputTokens: baseInputTokens,
                        outputTokens: outputTokens,
                        cacheCreateTokens: cacheCreateTokens,
                        cacheReadTokens: cacheReadTokens,
                        totalTokens: totalTokens,
                        cost: cost,
                        project: projectName,
                        costBreakdown: costBreakdown
                    });
                }
            }
            catch (e) {
                // Skip invalid lines
            }
        }
        return usage;
    }
}
exports.DataLoader = DataLoader;
//# sourceMappingURL=DataLoader.js.map