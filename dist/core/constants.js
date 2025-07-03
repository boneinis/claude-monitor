"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REFRESH_INTERVAL = exports.SESSION_WINDOW_HOURS = exports.PLANS = exports.MODEL_COSTS = void 0;
exports.MODEL_COSTS = {
    'claude-sonnet-4-20250514': {
        input: 3,
        output: 15,
        cacheWrite: 3.75,
        cacheRead: 0.3
    },
    'claude-3-5-sonnet-20241022': {
        input: 3,
        output: 15,
        cacheWrite: 3.75,
        cacheRead: 0.3
    },
    'claude-3-5-haiku-20241022': {
        input: 0.8,
        output: 4,
        cacheWrite: 1,
        cacheRead: 0.08
    },
    'claude-3-opus-20240229': {
        input: 15,
        output: 75,
        cacheWrite: 18.75,
        cacheRead: 1.5
    },
    'claude-opus-4-20250514': {
        input: 15,
        output: 75,
        cacheWrite: 18.75,
        cacheRead: 1.5
    }
};
exports.PLANS = {
    Free: {
        name: 'Free',
        messagesPerDay: 40,
        codePromptsPerSession: 0, // No Claude Code access
        resetHours: 24,
        monthlyCost: 0,
        sessionLimit: 0,
        estimatedTokensPerSession: 0
    },
    Pro: {
        name: 'Pro',
        messagesPerSession: 45, // Every 5 hours
        codePromptsPerSession: 25, // Approximate mid-range of 10-40
        resetHours: 5,
        monthlyCost: 20,
        sessionLimit: 999, // No practical limit
        estimatedTokensPerSession: 4500000 // ~4.5M tokens with cache contexts
    },
    Max5: {
        name: 'Max5',
        messagesPerSession: 225, // Every 5 hours (5x Pro)
        codePromptsPerSession: 125, // Approximate mid-range of 50-200
        resetHours: 5,
        monthlyCost: 100,
        sessionLimit: 50, // 50 sessions per month
        estimatedTokensPerSession: 22500000 // ~22.5M tokens with cache contexts
    },
    Max20: {
        name: 'Max20',
        messagesPerSession: 900, // Every 5 hours (20x Pro)
        codePromptsPerSession: 500, // Approximate mid-range of 200-800
        resetHours: 5,
        monthlyCost: 200,
        sessionLimit: 50, // 50 sessions per month
        estimatedTokensPerSession: 90000000 // ~90M tokens based on actual usage with large cache contexts
    },
    Team: {
        name: 'Team',
        messagesPerSession: 45, // Same as Pro
        codePromptsPerSession: 25,
        resetHours: 5,
        monthlyCost: 25, // Per user
        sessionLimit: 999,
        estimatedTokensPerSession: 4500000 // Same as Pro with cache contexts
    }
};
exports.SESSION_WINDOW_HOURS = 5;
exports.DEFAULT_REFRESH_INTERVAL = 3000;
//# sourceMappingURL=constants.js.map