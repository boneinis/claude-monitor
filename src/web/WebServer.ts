import express from 'express';
import { MonitorEngine } from '../core/MonitorEngine';
import { PLANS } from '../core/constants';
import { UpdateChecker } from '../utils/updateChecker';
import path from 'path';
import { fileURLToPath } from 'url';

export class WebServer {
  private app: express.Application;
  private monitor: MonitorEngine;
  private server: any;

  constructor(monitor: MonitorEngine) {
    this.monitor = monitor;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../web/public')));

    // API endpoints
    this.app.get('/api/projects', async (req, res) => {
      try {
        const projects = await this.monitor.getProjects();
        res.json(projects);
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
      }
    });

    this.app.get('/api/stats', async (req, res) => {
      try {
        const project = req.query.project as string | undefined;
        const stats = await this.monitor.getCurrentStats(project);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    });

    this.app.get('/api/daily', async (req, res) => {
      try {
        const days = parseInt(req.query.days as string) || 7;
        const project = req.query.project as string | undefined;
        const dailyStats = await this.monitor.getDailyStats(days, project);
        res.json(dailyStats);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch daily stats' });
      }
    });

    this.app.get('/api/weekly', async (req, res) => {
      try {
        const weeks = parseInt(req.query.weeks as string) || 4;
        const project = req.query.project as string | undefined;
        const weeklyStats = await this.monitor.getWeeklyStats(weeks, project);
        res.json(weeklyStats);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weekly stats' });
      }
    });

    this.app.get('/api/monthly', async (req, res) => {
      try {
        const months = parseInt(req.query.months as string) || 3;
        const project = req.query.project as string | undefined;
        const monthlyStats = await this.monitor.getMonthlyStats(months, project);
        res.json(monthlyStats);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch monthly stats' });
      }
    });

    this.app.post('/api/plan', async (req, res) => {
      try {
        const { plan } = req.body;
        if (!plan || !PLANS[plan as keyof typeof PLANS]) {
          return res.status(400).json({ error: 'Invalid plan specified' });
        }
        
        this.monitor.setPlan(PLANS[plan as keyof typeof PLANS]);
        res.json({ success: true, plan });
      } catch (error) {
        res.status(500).json({ error: 'Failed to update plan' });
      }
    });

    this.app.get('/api/updates', async (req, res) => {
      try {
        const result = await UpdateChecker.checkForUpdatesInteractive();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to check for updates' });
      }
    });

    // Server-Sent Events for real-time updates
    this.app.get('/api/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const project = req.query.project as string | undefined;
      const sendUpdate = async () => {
        try {
          const stats = await this.monitor.getCurrentStats(project);
          res.write(`data: ${JSON.stringify(stats)}\n\n`);
        } catch (error) {
          console.error('Error sending SSE update:', error);
        }
      };

      // Send initial data
      sendUpdate();

      // Send updates every 5 seconds
      const interval = setInterval(sendUpdate, 5000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
      });
    });

    // Serve the dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/public/index.html'));
    });
  }

  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        console.log(`📊 Claude Monitor Web Dashboard: http://localhost:${port}`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use. Try a different port.`);
        }
        reject(error);
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}