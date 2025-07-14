# Claude Monitor

A real-time terminal and web-based monitor for Claude Code usage, costs, and session tracking.

## Quick Start

### Simple Commands

**Daily Report:**
```bash
npm run daily
```

**Live Monitor (TUI):**
```bash
npm run monitor
```

**Web Dashboard:**
```bash
npm run monitor -- --web
```

### Installation

**Local Setup (recommended):**
```bash
# 1. Clone and install
git clone <repository-url>
cd claude-monitor
npm install

# 2. Use simple commands
npm run daily        # Quick daily report  
npm run monitor      # Live monitoring TUI
```

**Global Installation:**
```bash
npm run install-global
# Then use anywhere:
claude-monitor --daily
claude-monitor --plan Max20
```

## Features

- 📊 **Real-time monitoring** with live TUI updates every 3 seconds
- 💰 **Cost tracking** with cache vs regular token breakdown
- 📈 **Progress bars** for session usage and time remaining
- 🎯 **Bonus token detection** when exceeding plan limits
- 📅 **Historical data** with 7-day charts and weekly/monthly trends
- 🌐 **Web dashboard** for browser-based monitoring
- ⚡ **Accurate session detection** with proper 5-hour window tracking
- 💾 **Cache cost analysis** showing savings from token caching
- 🔄 **Update checking** with automatic startup checks and manual 'u' key
- 🖥️ **Desktop shortcuts** with native macOS app and auto-setup launchers

## Detailed Usage

### Daily Report
```bash
npm run daily                    # Quick cost summary
npm start -- --daily --plan Pro # Specify plan
```

### Live Monitor
```bash
npm run monitor                  # Interactive TUI
npm start -- --plan Max20       # With specific plan
npm start -- --web              # Include web dashboard
npm start -- --web-only         # Web dashboard only
```

### All Options
```bash
npm start -- --help             # See all available options
```

## Desktop Shortcuts

For easier access, several desktop launchers are available in the `launch-scripts/` directory:

### 🌐 **Cross-Platform Launcher (Recommended)**
```bash
# Works on Windows, macOS, and Linux:
node launch-scripts/start-monitor.js
```
- **Universal compatibility** across all operating systems
- Automatically installs dependencies if needed
- Builds project if necessary
- Opens browser automatically
- **Best choice for all users**

### 🪟 **Windows Launchers**
```batch
# Double-click to launch:
launch-scripts/Claude Monitor.bat
# Or use PowerShell:
launch-scripts/launch-claude-monitor.ps1
# Quick start (assumes built):
launch-scripts/quick-start.cmd
```
- Native Windows batch and PowerShell scripts
- Auto-setup with dependency installation
- Handles port conflicts automatically
- Opens browser automatically

### 🍎 **macOS Launchers**
```bash
# Native macOS app (double-click):
launch-scripts/Claude Monitor.app
# Terminal script (double-click):
launch-scripts/Claude Monitor.command
# Shell script:
./launch-scripts/launch-claude-monitor.sh
```
- Native macOS application experience
- Custom app icon and proper bundle structure
- Appears in Applications folder and Dock

### 📋 **Setup Instructions**
1. **Any OS**: Use `node launch-scripts/start-monitor.js` (universal)
2. **Windows**: Use `Claude Monitor.bat` (native Windows experience)
3. **macOS**: Use `Claude Monitor.app` (native macOS experience)
4. **Advanced users**: Use npm commands directly

## Keyboard Shortcuts

**TUI (Terminal Interface):**
- `Tab` - Switch between panels
- `↑/↓` - Navigate within panels
- `Enter` - Show details
- `r` - Refresh data
- `s` - Switch plan (Pro/Max5/Max20/Team)
- `u` - Check for updates
- `p` - Show projects
- `?/h` - Show help
- `q` - Quit

## Plans Supported

- **Pro** - 45 msgs/5hr (~4.5M tokens) - $20/month
- **Max5** - 225 msgs/5hr (~22.5M tokens) - $100/month  
- **Max20** - 900 msgs/5hr (~90M tokens) - $200/month
- **Team** - 45 msgs/5hr (~4.5M tokens) - $25/user/month

## Requirements

- **Node.js 16+** (Windows, macOS, Linux)
- **Claude Code** with usage logs in:
  - **Windows**: `%USERPROFILE%\.claude\projects\`
  - **macOS/Linux**: `~/.claude/projects/`

## Platform Compatibility

✅ **Fully Compatible:**
- Windows 10/11 (with Node.js)
- macOS 10.10+ (with Node.js)  
- Linux distributions (with Node.js)

✅ **All Features Work:**
- Terminal UI (TUI) with blessed library
- Web dashboard with Express server
- File system monitoring and parsing
- Update checking via GitHub API

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## License

MIT