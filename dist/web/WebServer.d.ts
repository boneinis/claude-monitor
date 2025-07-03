import { MonitorEngine } from '../core/MonitorEngine';
export declare class WebServer {
    private app;
    private monitor;
    private server;
    constructor(monitor: MonitorEngine);
    private setupRoutes;
    start(port?: number): Promise<void>;
    stop(): void;
}
//# sourceMappingURL=WebServer.d.ts.map