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
    // 1. Session starts at the beginning of the hour when activity begins
    // 2. Session lasts exactly 5 hours from that start hour
    // 3. New sessions don't auto-start - they begin when there's new activity
    
    const sessions: Session[] = [];
    let sessionStartTime: Date | null = null;
    let sessionEndTime: Date | null = null;
    let currentSessionUsage: TokenUsage[] = [];
    
    // Process usage chronologically to identify session boundaries
    for (let i = 0; i < recentUsage.length; i++) {
      const usage = recentUsage[i];
      const usageTime = new Date(usage.timestamp);
      
      if (!sessionStartTime) {
        // First usage - start new session at beginning of this hour
        sessionStartTime = new Date(usageTime);
        sessionStartTime.setMinutes(0, 0, 0);
        sessionEndTime = new Date(sessionStartTime);
        sessionEndTime.setHours(sessionEndTime.getHours() + 5);
        currentSessionUsage = [usage];
      } else if (usageTime >= sessionEndTime!) {
        // This usage is outside current session - save current session and start new one
        if (currentSessionUsage.length > 0) {
          sessions.push({
            id: sessionStartTime.toISOString(),
            startTime: sessionStartTime,
            endTime: sessionEndTime!,
            tokenUsage: currentSessionUsage,
            totalTokens: currentSessionUsage.reduce((sum, e) => sum + e.totalTokens, 0),
            totalCost: currentSessionUsage.reduce((sum, e) => sum + e.cost, 0)
          });
        }
        
        // Start new session at beginning of hour for this usage
        sessionStartTime = new Date(usageTime);
        sessionStartTime.setMinutes(0, 0, 0);
        sessionEndTime = new Date(sessionStartTime);
        sessionEndTime.setHours(sessionEndTime.getHours() + 5);
        currentSessionUsage = [usage];
      } else {
        // Usage within current session
        currentSessionUsage.push(usage);
      }
    }
    
    // Don't forget to add the last session
    if (sessionStartTime && currentSessionUsage.length > 0) {
      sessions.push({
        id: sessionStartTime.toISOString(),
        startTime: sessionStartTime,
        endTime: sessionEndTime!,
        tokenUsage: currentSessionUsage,
        totalTokens: currentSessionUsage.reduce((sum, e) => sum + e.totalTokens, 0),
        totalCost: currentSessionUsage.reduce((sum, e) => sum + e.cost, 0)
      });
    }
    
    // If the most recent session has ended and we're past its end time,
    // show it as the "current" session with 0 time remaining
    const mostRecentSession = sessions[0];
    if (mostRecentSession && mostRecentSession.endTime && now > mostRecentSession.endTime) {
      // No active session - the most recent one has expired
      // Dashboard will show this with "0h 0m" remaining
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