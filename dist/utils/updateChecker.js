"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateChecker = void 0;
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class UpdateChecker {
    static REPO_URL = 'https://api.github.com/repos/boneinis/claude-monitor/releases/latest';
    static getCurrentVersion() {
        try {
            const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return packageJson.version || '1.0.0';
        }
        catch {
            return '1.0.0';
        }
    }
    static async checkForUpdates() {
        try {
            const latestRelease = await this.fetchLatestRelease();
            if (latestRelease && this.isNewerVersion(latestRelease.tag_name)) {
                this.displayUpdateNotification(latestRelease);
            }
        }
        catch (error) {
            // Silently fail - don't interrupt app startup for update check failures
            console.log('📦 Unable to check for updates (offline or network issue)');
        }
    }
    static fetchLatestRelease() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: '/repos/boneinis/claude-monitor/releases/latest',
                method: 'GET',
                headers: {
                    'User-Agent': 'claude-monitor-app'
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const release = JSON.parse(data);
                            resolve(release);
                        }
                        catch (e) {
                            resolve(null);
                        }
                    }
                    else {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => {
                resolve(null);
            });
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(null);
            });
            req.end();
        });
    }
    static isNewerVersion(remoteVersion) {
        const current = this.parseVersion(this.getCurrentVersion());
        const remote = this.parseVersion(remoteVersion.replace(/^v/, ''));
        if (remote.major > current.major)
            return true;
        if (remote.major < current.major)
            return false;
        if (remote.minor > current.minor)
            return true;
        if (remote.minor < current.minor)
            return false;
        return remote.patch > current.patch;
    }
    static parseVersion(version) {
        const parts = version.split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
        };
    }
    static displayUpdateNotification(release) {
        console.log('\n🚀 ════════════════════════════════════════════════════════════');
        console.log('   UPDATE AVAILABLE');
        console.log('════════════════════════════════════════════════════════════');
        console.log(`📦 Current version: v${this.getCurrentVersion()}`);
        console.log(`✨ Latest version:  ${release.tag_name}`);
        console.log(`📅 Released: ${new Date(release.published_at).toLocaleDateString()}`);
        console.log(`🔗 Download: ${release.html_url}`);
        console.log('════════════════════════════════════════════════════════════\n');
    }
}
exports.UpdateChecker = UpdateChecker;
//# sourceMappingURL=updateChecker.js.map