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
        // Ensure the path exists and is a directory
        if (!fs.existsSync(this.projectPath)) {
            throw new Error(`Claude projects directory not found: ${this.projectPath}`);
        }
        if (!fs.statSync(this.projectPath).isDirectory()) {
            throw new Error(`Path is not a directory: ${this.projectPath}`);
        }
    }
    async getProjects() {
        const pattern = path.join(this.projectPath, '*');
        let dirs;
        try {
            dirs = await (0, glob_1.glob)(pattern);
        }
        catch (error) {
            console.error('Error scanning for projects:', error);
            return [];
        }
        const projects = [];
        for (const dir of dirs) {
            try {
                const stats = fs.statSync(dir);
                if (stats.isDirectory()) {
                    projects.push(path.basename(dir));
                }
            }
            catch (error) {
                console.error(`Error checking directory ${dir}:`, error);
                // Continue with other directories
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
        // Only load 12 hours of data (enough for 2+ sessions)
        const recentUsage = await this.loadRecentData(12, projectName);
        if (recentUsage.length === 0) {
            return [];
        }
        // Sessions work as follows:
        // 1. Session starts at the beginning of the hour when sustained activity begins
        // 2. Session lasts exactly 5 hours from that start hour
        // 3. New sessions don't auto-start - they begin when there's new activity
        // 4. Light activity (< 10 messages in first 30 min) doesn't establish a session if followed by heavier activity
        // Process usage chronologically and detect session boundaries
        // Standard logic: Activity in hour X starts a session at hour X
        const sessions = [];
        let currentSession = null;
        // Sort usage by timestamp
        const sortedUsage = [...recentUsage].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        for (const usage of sortedUsage) {
            const usageTime = new Date(usage.timestamp);
            // Check if we need a new session
            if (!currentSession || usageTime >= currentSession.end) {
                // Save previous session if it exists
                if (currentSession && currentSession.usage.length > 0) {
                    sessions.push({
                        id: currentSession.start.toISOString(),
                        startTime: currentSession.start,
                        endTime: currentSession.end,
                        tokenUsage: currentSession.usage,
                        totalTokens: currentSession.usage.reduce((sum, e) => sum + e.totalTokens, 0),
                        totalCost: currentSession.usage.reduce((sum, e) => sum + e.cost, 0)
                    });
                }
                // Create new session starting at the beginning of the current hour
                const sessionStart = new Date(usageTime);
                sessionStart.setMinutes(0, 0, 0);
                sessionStart.setMilliseconds(0);
                const sessionEnd = new Date(sessionStart);
                sessionEnd.setHours(sessionEnd.getHours() + constants_1.SESSION_WINDOW_HOURS);
                currentSession = {
                    start: sessionStart,
                    end: sessionEnd,
                    usage: []
                };
            }
            // Add usage to current session
            currentSession.usage.push(usage);
        }
        // Don't forget the last session
        if (currentSession && currentSession.usage.length > 0) {
            sessions.push({
                id: currentSession.start.toISOString(),
                startTime: currentSession.start,
                endTime: currentSession.end,
                tokenUsage: currentSession.usage,
                totalTokens: currentSession.usage.reduce((sum, e) => sum + e.totalTokens, 0),
                totalCost: currentSession.usage.reduce((sum, e) => sum + e.cost, 0)
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
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        }
        catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return [];
        }
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
                // Look for assistant messages with usage data
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