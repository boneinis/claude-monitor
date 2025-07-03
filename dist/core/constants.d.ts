export declare const MODEL_COSTS: {
    'claude-sonnet-4-20250514': {
        input: number;
        output: number;
        cacheWrite: number;
        cacheRead: number;
    };
    'claude-3-5-sonnet-20241022': {
        input: number;
        output: number;
        cacheWrite: number;
        cacheRead: number;
    };
    'claude-3-5-haiku-20241022': {
        input: number;
        output: number;
        cacheWrite: number;
        cacheRead: number;
    };
    'claude-3-opus-20240229': {
        input: number;
        output: number;
        cacheWrite: number;
        cacheRead: number;
    };
    'claude-opus-4-20250514': {
        input: number;
        output: number;
        cacheWrite: number;
        cacheRead: number;
    };
};
export declare const PLANS: {
    Free: {
        name: "Free";
        messagesPerDay: number;
        codePromptsPerSession: number;
        resetHours: number;
        monthlyCost: number;
        sessionLimit: number;
        estimatedTokensPerSession: number;
    };
    Pro: {
        name: "Pro";
        messagesPerSession: number;
        codePromptsPerSession: number;
        resetHours: number;
        monthlyCost: number;
        sessionLimit: number;
        estimatedTokensPerSession: number;
    };
    Max5: {
        name: "Max5";
        messagesPerSession: number;
        codePromptsPerSession: number;
        resetHours: number;
        monthlyCost: number;
        sessionLimit: number;
        estimatedTokensPerSession: number;
    };
    Max20: {
        name: "Max20";
        messagesPerSession: number;
        codePromptsPerSession: number;
        resetHours: number;
        monthlyCost: number;
        sessionLimit: number;
        estimatedTokensPerSession: number;
    };
    Team: {
        name: "Team";
        messagesPerSession: number;
        codePromptsPerSession: number;
        resetHours: number;
        monthlyCost: number;
        sessionLimit: number;
        estimatedTokensPerSession: number;
    };
};
export declare const SESSION_WINDOW_HOURS = 5;
export declare const DEFAULT_REFRESH_INTERVAL = 3000;
//# sourceMappingURL=constants.d.ts.map