#!/usr/bin/env node

import { Command } from 'commander';
import { DataLoader } from './core/DataLoader';
import { MonitorEngine } from './core/MonitorEngine';
import { TerminalUI } from './tui/TerminalUI';
import { WebServer } from './web/WebServer';
import { PLANS } from './core/constants';
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

  console.log('\n📊 Claude Monitor - Usage Report\n');
  console.log(`Today's Usage:`);
  console.log(`  Messages: ${stats.todayPrompts}`);
  console.log(`  Cost: $${stats.dailyCost.toFixed(3)}`);
  console.log(`  Active sessions: ${stats.sessionsToday}`);
  
  // Today's cache breakdown
  const today = dailyStats.find(d => d.date === new Date().toISOString().split('T')[0]);
  if (today && today.cacheCost) {
    const nonCacheCost = today.totalCost - today.cacheCost;
    console.log(`\nToday's Cost Breakdown:`);
    console.log(`  Regular tokens: $${nonCacheCost.toFixed(3)} (${((nonCacheCost / today.totalCost) * 100).toFixed(1)}%)`);
    console.log(`  Cache costs: $${today.cacheCost.toFixed(3)} (${((today.cacheCost / today.totalCost) * 100).toFixed(1)}%)`);
    console.log(`  Without cache: $${today.noCacheCost?.toFixed(3) || 'N/A'}`);
    console.log(`  Savings: $${today.cacheSavings?.toFixed(3) || '0'} (${((today.cacheSavings! / today.noCacheCost!) * 100).toFixed(1)}%)`);
  }
  
  if (stats.currentSession) {
    console.log(`\nCurrent Session:`);
    console.log(`  Messages: ${stats.currentSession.tokenUsage.length}`);
    console.log(`  Tokens: ${stats.currentSession.totalTokens.toLocaleString()}`);
    console.log(`  Cost: $${stats.currentSession.totalCost.toFixed(3)}`);
    console.log(`  Resets in: ${Math.floor(stats.timeUntilReset / 60)}h ${stats.timeUntilReset % 60}m`);
  }
  
  console.log('\nLast 7 days:');
  dailyStats.forEach(day => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
    const bar = '█'.repeat(Math.round(day.totalCost * 10));
    console.log(`  ${dayName}: ${bar} $${day.totalCost.toFixed(3)}`);
  });

  // Cache cost analysis
  const totalDays = dailyStats.length;
  const totalCacheCost = dailyStats.reduce((sum, d) => sum + (d.cacheCost || 0), 0);
  const totalNoCacheCost = dailyStats.reduce((sum, d) => sum + (d.noCacheCost || 0), 0);
  const totalSavings = dailyStats.reduce((sum, d) => sum + (d.cacheSavings || 0), 0);
  
  if (totalDays > 0 && totalCacheCost > 0) {
    console.log('\nCache Cost Analysis:');
    console.log(`  Cache costs: $${totalCacheCost.toFixed(2)} (${((totalCacheCost / dailyStats.reduce((s,d) => s + d.totalCost, 0)) * 100).toFixed(1)}% of total)`);
    console.log(`  Without cache: $${totalNoCacheCost.toFixed(2)}`);
    console.log(`  Cache savings: $${totalSavings.toFixed(2)} (${((totalSavings / totalNoCacheCost) * 100).toFixed(1)}% saved)`);
  }

  if (weeklyStats.length > 0) {
    console.log('\nWeekly Summary:');
    weeklyStats.slice(-2).forEach(week => {
      const startDate = new Date(week.weekStart);
      const weekLabel = startDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      console.log(`  Week ${weekLabel}: $${week.totalCost.toFixed(2)} (${week.days} days, avg $${week.dailyAverage.toFixed(2)}/day)`);
    });
  }

  if (monthlyStats.length > 0) {
    const currentMonth = monthlyStats[monthlyStats.length - 1];
    console.log('\nMonthly Summary:');
    console.log(`  Current usage (if API): $${currentMonth.apiEquivalentCost.toFixed(2)}`);
    console.log(`  Max20 plan cost: $${currentMonth.planCost.toFixed(2)}`);
    if (currentMonth.apiEquivalentCost > currentMonth.planCost) {
      console.log(`  Savings: $${(currentMonth.apiEquivalentCost - currentMonth.planCost).toFixed(2)}`);
    } else {
      console.log(`  Cost for unlimited access: $${(currentMonth.planCost - currentMonth.apiEquivalentCost).toFixed(2)}`);
    }
    console.log(`  Daily average: $${currentMonth.dailyAverage.toFixed(3)}`);
  }

  if (stats.alerts.length > 0) {
    console.log('\n⚠️  Alerts:');
    stats.alerts.forEach(alert => {
      console.log(`  - ${alert.message}`);
    });
  }
}

program.parse(process.argv);