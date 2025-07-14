import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
}

export class UpdateChecker {
  private static readonly REPO_URL = 'https://api.github.com/repos/boneinis/claude-monitor/releases/latest';
  
  private static getCurrentVersion(): string {
    try {
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  static async checkForUpdates(): Promise<void> {
    try {
      const latestRelease = await this.fetchLatestRelease();
      if (latestRelease && this.isNewerVersion(latestRelease.tag_name)) {
        this.displayUpdateNotification(latestRelease);
      }
    } catch (error) {
      // Silently fail - don't interrupt app startup for update check failures
      console.log('📦 Unable to check for updates (offline or network issue)');
    }
  }

  static async checkForUpdatesInteractive(): Promise<{ hasUpdate: boolean; release?: GitHubRelease; error?: string }> {
    try {
      const latestRelease = await this.fetchLatestRelease();
      if (!latestRelease) {
        return { hasUpdate: false, error: 'Unable to fetch release information' };
      }
      
      const hasUpdate = this.isNewerVersion(latestRelease.tag_name);
      return { hasUpdate, release: latestRelease };
    } catch (error) {
      return { hasUpdate: false, error: 'Network error or GitHub API unavailable' };
    }
  }

  private static fetchLatestRelease(): Promise<GitHubRelease | null> {
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
            } catch (e) {
              resolve(null);
            }
          } else {
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

  private static isNewerVersion(remoteVersion: string): boolean {
    const current = this.parseVersion(this.getCurrentVersion());
    const remote = this.parseVersion(remoteVersion.replace(/^v/, ''));
    
    if (remote.major > current.major) return true;
    if (remote.major < current.major) return false;
    
    if (remote.minor > current.minor) return true;
    if (remote.minor < current.minor) return false;
    
    return remote.patch > current.patch;
  }

  private static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }

  private static displayUpdateNotification(release: GitHubRelease): void {
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