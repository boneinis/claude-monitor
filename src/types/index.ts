export interface TokenUsage {
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  cost: number;
  project?: string;
  costBreakdown?: {
    input: number;
    output: number;
    cacheWrite: number;
    cacheRead: number;
  };
}

export interface Session {
  id: string;
  startTime: Date;
  endTime?: Date;
  tokenUsage: TokenUsage[];
  totalTokens: number;
  totalCost: number;
}

export interface DailyStats {
  date: string;
  sessions: number;
  totalTokens: number;
  totalCost: number;
  tokensByModel: Record<string, number>;
  costByModel: Record<string, number>;
  cacheCost?: number;
  noCacheCost?: number;
  cacheSavings?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  days: number;
  sessions: number;
  totalTokens: number;
  totalCost: number;
  dailyAverage: number;
  tokensByModel: Record<string, number>;
  costByModel: Record<string, number>;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cacheCost?: number;
  noCacheCost?: number;
  cacheSavings?: number;
}

export interface MonthlyStats {
  month: string;
  year: number;
  days: number;
  sessions: number;
  totalTokens: number;
  totalCost: number;
  dailyAverage: number;
  weeklyAverage: number;
  tokensByModel: Record<string, number>;
  costByModel: Record<string, number>;
  planCost: number;
  apiEquivalentCost: number;
  savings: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cacheCost?: number;
  noCacheCost?: number;
  cacheSavings?: number;
}

export interface Plan {
  name: 'Free' | 'Pro' | 'Max5' | 'Max20' | 'Team';
  messagesPerSession?: number;
  messagesPerDay?: number;
  codePromptsPerSession: number;
  resetHours: number;
  monthlyCost?: number;
  sessionLimit?: number;
  estimatedTokensPerSession?: number;
}

export interface MonitorConfig {
  projectPath?: string;
  plan?: Plan;
  refreshInterval?: number;
  timezone?: string;
}

export interface Alert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: Date;
}