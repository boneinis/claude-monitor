import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { glob } from 'glob';
import { TokenUsage, Session } from '../types';
import { MODEL_COSTS, SESSION_WINDOW_HOURS } from './constants';

export class DataLoader {
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || path.join(os.homedir(), '.claude', 'projects');
  }

  async getProjects(): Promise<string[]> {
    const pattern = path.join(this.projectPath, '*');
    const dirs = await glob(pattern);
    const projects: string[] = [];

    for (const dir of dirs) {
      const stats = fs.statSync(dir);
      if (stats.isDirectory()) {
        projects.push(path.basename(dir));
      }
    }

    return projects.sort();
  }

  async loadRecentData(hours: number = 24, projectName?: string): Promise<TokenUsage[]> {
    const files = await this.findRecentFiles(hours, projectName);
    const allUsage: TokenUsage[] = [];
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    for (const file of files) {
      const usage = await this.parseJsonlFile(file, projectName);
      // Filter to only include messages within the time window
      const recentUsage = usage.filter(u => new Date(u.timestamp) >= cutoffTime);
      allUsage.push(...recentUsage);
    }

    return allUsage.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async loadAllData(projectName?: string): Promise<TokenUsage[]> {
    const pattern = projectName 
      ? path.join(this.projectPath, projectName, '**', '*.jsonl')
      : path.join(this.projectPath, '**', '*.jsonl');
    const files = await glob(pattern);
    const allUsage: TokenUsage[] = [];

    for (const file of files) {
      const usage = await this.parseJsonlFile(file, projectName);
      allUsage.push(...usage);
    }

    return allUsage.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async loadTodayData(projectName?: string): Promise<TokenUsage[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // Use local midnight instead of UTC
    
    const files = await this.findRecentFiles(24, projectName);
    const todayUsage: TokenUsage[] = [];

    for (const file of files) {
      const usage = await this.parseJsonlFile(file, projectName);
      const todayData = usage.filter(u => 
        new Date(u.timestamp) >= today
      );
      todayUsage.push(...todayData);
    }

    return todayUsage.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async getCurrentSessions(projectName?: string): Promise<Session[]> {
    const now = new Date();
    const recentUsage = await this.loadRecentData(SESSION_WINDOW_HOURS * 3, projectName); // Get more data to ensure we have full sessions
    
    
    if (recentUsage.length === 0) {
      return [];
    }

    // Reset windows based on user observations: UTC 0, 3, 9, 14, 19 (8pm, 11pm, 5am, 10am, 3pm EDT)
    const resetHours = [0, 3, 9, 14, 19];
    
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
    
    // Get previous reset time (find the previous reset hour)
    const previousResetTime = new Date(lastResetTime);
    const lastResetIndex = resetHours.indexOf(lastResetHour);
    const previousResetIndex = lastResetIndex > 0 ? lastResetIndex - 1 : resetHours.length - 1;
    const previousResetHour = resetHours[previousResetIndex];
    
    previousResetTime.setUTCHours(previousResetHour, 0, 0, 0);
    if (previousResetHour > lastResetHour) {
      // Previous reset was yesterday
      previousResetTime.setUTCDate(previousResetTime.getUTCDate() - 1);
    }
    
    // Get next reset time
    let nextResetHour = resetHours.find(h => h > currentHour);
    const nextResetTime = new Date(now);
    if (nextResetHour === undefined) {
      // Next reset is tomorrow at 00:00
      nextResetTime.setUTCDate(nextResetTime.getUTCDate() + 1);
      nextResetTime.setUTCHours(0, 0, 0, 0);
    } else {
      nextResetTime.setUTCHours(nextResetHour, 0, 0, 0);
    }
    
    // Filter usage data for current and previous reset windows
    const sessions: Session[] = [];
    
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

  private async findRecentFiles(hours: number, projectName?: string): Promise<string[]> {
    const pattern = projectName
      ? path.join(this.projectPath, projectName, '**', '*.jsonl')
      : path.join(this.projectPath, '**', '*.jsonl');
    const files = await glob(pattern);
    
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    return files.filter(file => {
      const stats = fs.statSync(file);
      return stats.mtime.getTime() > cutoffTime;
    });
  }

  private async parseJsonlFile(filePath: string, projectName?: string): Promise<TokenUsage[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const usage: TokenUsage[] = [];
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
          } else {
            // Calculate cost from tokens using our pricing table
            const modelKey = Object.keys(MODEL_COSTS).find(k => 
              model.includes(k)
            );
            
            if (modelKey) {
              const costs = MODEL_COSTS[modelKey as keyof typeof MODEL_COSTS];
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
      } catch (e) {
        // Skip invalid lines
      }
    }

    return usage;
  }
}