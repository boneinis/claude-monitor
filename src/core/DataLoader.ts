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
    // Ensure the path exists and is a directory
    if (!fs.existsSync(this.projectPath)) {
      throw new Error(`Claude projects directory not found: ${this.projectPath}`);
    }
    if (!fs.statSync(this.projectPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${this.projectPath}`);
    }
  }

  async getProjects(): Promise<string[]> {
    const pattern = path.join(this.projectPath, '*');
    let dirs: string[];
    
    try {
      dirs = await glob(pattern);
    } catch (error) {
      console.error('Error scanning for projects:', error);
      return [];
    }
    
    const projects: string[] = [];

    for (const dir of dirs) {
      try {
        const stats = fs.statSync(dir);
        if (stats.isDirectory()) {
          projects.push(path.basename(dir));
        }
      } catch (error) {
        console.error(`Error checking directory ${dir}:`, error);
        // Continue with other directories
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
    const sessions: Session[] = [];
    let currentSession: { start: Date; end: Date; usage: TokenUsage[] } | null = null;
    
    // Sort usage by timestamp
    const sortedUsage = [...recentUsage].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
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
        sessionEnd.setHours(sessionEnd.getHours() + SESSION_WINDOW_HOURS);
        
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
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
    
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