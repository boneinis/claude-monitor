#!/usr/bin/env node

import { Command } from 'commander';
import { DataLoader } from './core/DataLoader';
import { MonitorEngine } from './core/MonitorEngine';
import { TerminalUI } from './tui/TerminalUI';
import { WebServer } from './web/WebServer';
import { PLANS, MODEL_COSTS } from './core/constants';
import { UpdateChecker } from './utils/updateChecker';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

const program = new Command();

async function selectPlanInteractively(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const plans = [
    { key: 'Pro', name: 'Pro Plan', tokens: '~4.5M tokens', messages: '45 msgs/5hr', cost: '$20/month' },
    { key: 'Max5', name: 'Max5 Plan', tokens: '~22.5M tokens', messages: '225 msgs/5hr', cost: '$100/month' },
    { key: 'Max20', name: 'Max20 Plan', tokens: '~90M tokens', messages: '900 msgs/5hr', cost: '$200/month' },
    { key: 'Team', name: 'Team Plan', tokens: '~4.5M tokens', messages: '45 msgs/5hr', cost: '$25/user/month' }
  ];

  console.log('\n🤖 Claude Plan Selection');
  console.log('=' .repeat(60));
  console.log();

  plans.forEach((plan, index) => {
    console.log(`${index + 1}. ${plan.name}`);
    console.log(`   Messages: ${plan.messages}`);
    console.log(`   Tokens: ${plan.tokens}`);
    console.log(`   Cost: ${plan.cost}`);
    console.log();
  });

  return new Promise((resolve) => {
    const askQuestion = () => {
      rl.question('Select your plan (1-4): ', (answer) => {
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= 4) {
          const selectedPlan = plans[choice - 1];
          console.log(`Selected: ${selectedPlan.name} (${selectedPlan.tokens})`);
          console.log();
          rl.close();
          resolve(selectedPlan.key);
        } else {
          console.log('Invalid choice. Please enter 1, 2, 3, or 4.');
          askQuestion();
        }
      });
    };
    askQuestion();
  });
}

program
  .name('claude-monitor')
  .description('Terminal-based Claude Code usage monitor with interactive plan selection')
  .version('1.0.0')
  .option('-p, --path <path>', 'Path to Claude projects directory', path.join(os.homedir(), '.claude', 'projects'))
  .option('--plan <plan>', 'Subscription plan (Pro, Max5, Max20, Team). If not specified, you will be prompted to choose.')
  .option('-r, --refresh <ms>', 'Refresh interval in milliseconds', '3000')
  .option('--live', 'Show live monitor only')
  .option('--daily', 'Show daily report and exit')
  .option('--web', 'Launch web dashboard')
  .option('--web-only', 'Run web server without TUI')
  .option('--port <port>', 'Web server port', '3000')
  .option('--no-update-check', 'Skip checking for updates')
  .action(async (options) => {
    try {
      // Check for updates in the background (non-blocking)
      if (!options.noUpdateCheck) {
        UpdateChecker.checkForUpdates().catch(() => {
          // Silently ignore update check failures
        });
      }

      const dataLoader = new DataLoader(options.path);
      
      // Interactive plan selection if not specified
      let planKey = options.plan;
      if (!planKey) {
        planKey = await selectPlanInteractively();
      }
      
      const plan = PLANS[planKey as keyof typeof PLANS] || PLANS.Max20;
      const monitor = new MonitorEngine(dataLoader, plan);

      if (options.daily) {
        await showDailyReport(monitor);
        process.exit(0);
      }

      if (options.webOnly) {
        const webServer = new WebServer(monitor);
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
      const ui = new TerminalUI(monitor);
      
      // Optionally start web server in parallel
      let webServer: WebServer | null = null;
      if (options.web) {
        webServer = new WebServer(monitor);
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

    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

async function showDailyReport(monitor: MonitorEngine) {
  const stats = await monitor.getCurrentStats();
  const dailyStats = await monitor.getDailyStats(7);
  const weeklyStats = await monitor.getWeeklyStats(4);
  const monthlyStats = await monitor.getMonthlyStats(3);

  console.log('\n' + '='.repeat(60));
  console.log('📊  Claude Monitor - Usage Report');
  console.log('='.repeat(60) + '\n');
  
  // Format today's usage with better alignment
  console.log('TODAY\'S USAGE');
  console.log('-'.repeat(30));
  console.log(`Messages:         ${stats.todayPrompts.toString().padStart(6)}`);
  console.log(`Cost:            $${stats.dailyCost.toFixed(2).padStart(6)}`);
  console.log(`Active sessions:  ${stats.sessionsToday.toString().padStart(6)}`);
  
  // Calculate cache breakdown from today's actual usage
  const todayDate = new Date().toISOString().split('T')[0];
  const todayFromStats = dailyStats.find(d => d.date === todayDate);
  
  // Use stats.dailyCost as the source of truth for today's total cost
  if (stats.dailyCost > 0) {
    console.log('\nCOST BREAKDOWN');
    console.log('-'.repeat(30));
    console.log(`Actual cost:     $${stats.dailyCost.toFixed(2).padStart(6)} (with cache)`);
    
    // If we have detailed cache breakdown from dailyStats
    if (todayFromStats && todayFromStats.cacheCost !== undefined && todayFromStats.noCacheCost !== undefined) {
      // Scale the cache breakdown to match the actual daily cost
      const scaleFactor = stats.dailyCost / todayFromStats.totalCost;
      const scaledCacheCost = todayFromStats.cacheCost * scaleFactor;
      const scaledNonCacheCost = stats.dailyCost - scaledCacheCost;
      const scaledNoCacheCost = todayFromStats.noCacheCost * scaleFactor;
      const scaledSavings = scaledNoCacheCost - stats.dailyCost;
      
      console.log(`  Regular:       $${scaledNonCacheCost.toFixed(2).padStart(6)} (${stats.dailyCost > 0 ? ((scaledNonCacheCost / stats.dailyCost) * 100).toFixed(0) : '0'}%)`);
      console.log(`  Cache:         $${scaledCacheCost.toFixed(2).padStart(6)} (${stats.dailyCost > 0 ? ((scaledCacheCost / stats.dailyCost) * 100).toFixed(0) : '0'}%)`);
      console.log(`Without cache:   $${scaledNoCacheCost.toFixed(2).padStart(6)} (API price)`);
      console.log(`You save:        $${scaledSavings.toFixed(2).padStart(6)} (${scaledNoCacheCost > 0 ? ((scaledSavings / scaledNoCacheCost) * 100).toFixed(0) : '0'}%)`);
    }
  }
  
  if (stats.currentSession) {
    console.log('\nCURRENT SESSION');
    console.log('-'.repeat(30));
    console.log(`Messages:  ${stats.currentSession.tokenUsage.length.toString().padStart(10)}`);
    
    // Show tokens with bonus if exceeding limit
    const sessionLimit = stats.plan.estimatedTokensPerSession || 90000000;
    const totalTokens = stats.currentSession.totalTokens;
    if (totalTokens > sessionLimit) {
      const bonus = totalTokens - sessionLimit;
      console.log(`Tokens:    ${sessionLimit.toLocaleString().padStart(10)} + ${bonus.toLocaleString()} bonus`);
      const bonusPercent = ((totalTokens / sessionLimit) * 100) - 100;
      console.log(`Usage:     ${((totalTokens / sessionLimit) * 100).toFixed(1)}% (+${bonusPercent.toFixed(1)}% bonus)`);
    } else {
      console.log(`Tokens:    ${totalTokens.toLocaleString().padStart(10)} / ${sessionLimit.toLocaleString()}`);
      console.log(`Usage:     ${((totalTokens / sessionLimit) * 100).toFixed(1)}%`);
    }
    
    console.log(`Cost:      $${stats.currentSession.totalCost.toFixed(2).padStart(9)} (total)`);
    
    // Calculate session cache breakdown if we have the data
    let sessionCacheCost = 0;
    let sessionRegularCost = 0;
    let sessionNoCacheCost = 0;
    
    for (const usage of stats.currentSession.tokenUsage) {
      if (usage.costBreakdown) {
        sessionCacheCost += usage.costBreakdown.cacheWrite + usage.costBreakdown.cacheRead;
        sessionRegularCost += usage.costBreakdown.input + usage.costBreakdown.output;
      }
      
      // Calculate what it would cost without cache
      const modelKey = Object.keys(MODEL_COSTS).find(k => usage.model.includes(k));
      if (modelKey) {
        const costs = MODEL_COSTS[modelKey as keyof typeof MODEL_COSTS];
        const totalInputTokens = usage.inputTokens + usage.cacheCreateTokens + usage.cacheReadTokens;
        sessionNoCacheCost += (totalInputTokens / 1000000) * costs.input + (usage.outputTokens / 1000000) * costs.output;
      }
    }
    
    // Show cost breakdown
    if (sessionRegularCost > 0 || sessionCacheCost > 0) {
      const regularPercent = stats.currentSession.totalCost > 0 ? (sessionRegularCost / stats.currentSession.totalCost) * 100 : 0;
      const cachePercent = stats.currentSession.totalCost > 0 ? (sessionCacheCost / stats.currentSession.totalCost) * 100 : 0;
      console.log(`  Regular: $${sessionRegularCost.toFixed(2).padStart(9)} (${regularPercent.toFixed(0)}%)`);
      console.log(`  Cache:   $${sessionCacheCost.toFixed(2).padStart(9)} (${cachePercent.toFixed(0)}%)`);
    }
    
    if (sessionNoCacheCost > 0) {
      const sessionSavings = sessionNoCacheCost - stats.currentSession.totalCost;
      const savingsPercent = (sessionSavings / sessionNoCacheCost) * 100;
      console.log(`Without:   $${sessionNoCacheCost.toFixed(2).padStart(9)} (API price)`);
      console.log(`Savings:   $${sessionSavings.toFixed(2).padStart(9)} (${savingsPercent.toFixed(0)}%)`);
    }
    
    console.log(`Resets in: ${Math.floor(stats.timeUntilReset / 60)}h ${(stats.timeUntilReset % 60).toString().padStart(2, '0')}m`);
  }
  
  // Improved bar chart scaling
  console.log('\nLAST 7 DAYS');
  console.log('-'.repeat(60));
  
  // Calculate appropriate scale for the bar chart
  const maxCost = Math.max(...dailyStats.map(d => d.totalCost), 0.01);
  const maxBarWidth = 30; // Maximum width for bars
  
  dailyStats.forEach(day => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
    const cost = day.totalCost;
    
    // Scale the bar appropriately
    const barLength = Math.round((cost / maxCost) * maxBarWidth);
    const bar = '█'.repeat(Math.max(0, barLength));
    
    // Format the line with proper alignment
    const dayLabel = dayName.padEnd(12);
    const barSection = bar.padEnd(maxBarWidth + 1);
    const costLabel = `$${cost.toFixed(2)}`;
    
    console.log(`${dayLabel}${barSection}${costLabel}`);
  });

  // Calculate totals for better summary
  const totalCost = dailyStats.reduce((sum, d) => sum + d.totalCost, 0);
  const avgDailyCost = totalCost / Math.max(dailyStats.length, 1);
  
  console.log('-'.repeat(60));
  console.log(`Average daily cost: $${avgDailyCost.toFixed(2)}`);

  // Cache cost analysis with better formatting
  const totalCacheCost = dailyStats.reduce((sum, d) => sum + (d.cacheCost || 0), 0);
  const totalNoCacheCost = dailyStats.reduce((sum, d) => sum + (d.noCacheCost || 0), 0);
  const totalSavings = dailyStats.reduce((sum, d) => sum + (d.cacheSavings || 0), 0);
  
  if (totalCacheCost > 0) {
    console.log('\nCACHE ANALYSIS (7 days)');
    console.log('-'.repeat(30));
    console.log(`Total cost:      $${totalCost.toFixed(2).padStart(7)}`);
    console.log(`Cache portion:   $${totalCacheCost.toFixed(2).padStart(7)} (${((totalCacheCost / totalCost) * 100).toFixed(0)}%)`);
    if (totalNoCacheCost > 0) {
      console.log(`Without cache:   $${totalNoCacheCost.toFixed(2).padStart(7)}`);
      console.log(`Total savings:   $${totalSavings.toFixed(2).padStart(7)} (${((totalSavings / totalNoCacheCost) * 100).toFixed(0)}%)`);
    }
  }

  if (weeklyStats.length > 0) {
    console.log('\nWEEKLY TRENDS');
    console.log('-'.repeat(30));
    weeklyStats.slice(-2).forEach(week => {
      const startDate = new Date(week.weekStart);
      const weekLabel = `Week of ${startDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
      console.log(`${weekLabel.padEnd(20)} $${week.totalCost.toFixed(2).padStart(7)} (${week.days}d, avg $${week.dailyAverage.toFixed(2)}/day)`);
    });
  }

  if (monthlyStats.length > 0) {
    const currentMonth = monthlyStats[monthlyStats.length - 1];
    console.log('\nMONTHLY SUMMARY');
    console.log('-'.repeat(30));
    console.log(`API equivalent:  $${currentMonth.apiEquivalentCost.toFixed(2).padStart(7)}`);
    console.log(`Max20 plan:      $${currentMonth.planCost.toFixed(2).padStart(7)}`);
    if (currentMonth.apiEquivalentCost > currentMonth.planCost) {
      console.log(`You save:        $${(currentMonth.apiEquivalentCost - currentMonth.planCost).toFixed(2).padStart(7)}`);
    }
    console.log(`Daily average:   $${currentMonth.dailyAverage.toFixed(2).padStart(7)}`);
  }

  if (stats.alerts.length > 0) {
    console.log('\n⚠️  ALERTS');
    console.log('-'.repeat(30));
    stats.alerts.forEach(alert => {
      console.log(`• ${alert.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

program.parse(process.argv);