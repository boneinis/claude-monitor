"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebServer = void 0;
const express_1 = __importDefault(require("express"));
const constants_1 = require("../core/constants");
const updateChecker_1 = require("../utils/updateChecker");
const path_1 = __importDefault(require("path"));
class WebServer {
    app;
    monitor;
    server;
    constructor(monitor) {
        this.monitor = monitor;
        this.app = (0, express_1.default)();
        this.setupRoutes();
    }
    setupRoutes() {
        // Parse JSON bodies
        this.app.use(express_1.default.json());
        // Serve static files
        this.app.use(express_1.default.static(path_1.default.join(__dirname, '../web/public')));
        // API endpoints
        this.app.get('/api/projects', async (req, res) => {
            try {
                const projects = await this.monitor.getProjects();
                res.json(projects);
            }
            catch (error) {
                console.error('Error fetching projects:', error);
                res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
            }
        });
        this.app.get('/api/stats', async (req, res) => {
            try {
                const project = req.query.project;
                const stats = await this.monitor.getCurrentStats(project);
                res.json(stats);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch stats' });
            }
        });
        this.app.get('/api/daily', async (req, res) => {
            try {
                const days = parseInt(req.query.days) || 7;
                const project = req.query.project;
                const dailyStats = await this.monitor.getDailyStats(days, project);
                res.json(dailyStats);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch daily stats' });
            }
        });
        this.app.get('/api/weekly', async (req, res) => {
            try {
                const weeks = parseInt(req.query.weeks) || 4;
                const project = req.query.project;
                const weeklyStats = await this.monitor.getWeeklyStats(weeks, project);
                res.json(weeklyStats);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch weekly stats' });
            }
        });
        this.app.get('/api/monthly', async (req, res) => {
            try {
                const months = parseInt(req.query.months) || 3;
                const project = req.query.project;
                const monthlyStats = await this.monitor.getMonthlyStats(months, project);
                res.json(monthlyStats);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch monthly stats' });
            }
        });
        this.app.post('/api/plan', async (req, res) => {
            try {
                const { plan } = req.body;
                if (!plan || !constants_1.PLANS[plan]) {
                    return res.status(400).json({ error: 'Invalid plan specified' });
                }
                this.monitor.setPlan(constants_1.PLANS[plan]);
                res.json({ success: true, plan });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to update plan' });
            }
        });
        this.app.get('/api/updates', async (req, res) => {
            try {
                const result = await updateChecker_1.UpdateChecker.checkForUpdatesInteractive();
                res.json(result);
            }
            catch (error) {
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
            const project = req.query.project;
            const sendUpdate = async () => {
                try {
                    const stats = await this.monitor.getCurrentStats(project);
                    res.write(`data: ${JSON.stringify(stats)}\n\n`);
                }
                catch (error) {
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
            res.sendFile(path_1.default.join(__dirname, '../web/public/index.html'));
        });
    }
    async start(port = 3000) {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, () => {
                console.log(`📊 Claude Monitor Web Dashboard: http://localhost:${port}`);
                resolve();
            });
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${port} is already in use. Try a different port.`);
                }
                reject(error);
            });
        });
    }
    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}
exports.WebServer = WebServer;
//# sourceMappingURL=WebServer.js.map