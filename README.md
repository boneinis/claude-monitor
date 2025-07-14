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

### 🖥️ **macOS App Bundle**
```bash
# Double-click to launch:
launch-scripts/Claude Monitor.app
```
- Native macOS application experience
- Custom app icon and proper bundle structure
- Appears in Applications folder and Dock
- Launches web interface automatically

### ⚡ **Auto-Setup Launcher**
```bash
# Double-click to launch:
launch-scripts/Claude Monitor.command
```
- Automatically installs dependencies if needed
- Builds project if necessary
- Kills existing instances to prevent conflicts
- Opens browser automatically
- **Recommended for first-time users**

### 🚀 **Quick Launcher**
```bash
# Run from terminal:
./launch-scripts/launch-claude-monitor.sh
```
- Lightweight script for daily use
- Assumes project is already built
- Opens web interface at localhost:3000

### 📋 **Setup Instructions**
1. **First time**: Use `Claude Monitor.command` (handles all setup)
2. **Regular use**: Use `Claude Monitor.app` (native macOS experience)  
3. **Advanced users**: Use shell scripts or npm commands

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

- Node.js 16+
- Claude Code with usage logs in `~/.claude/projects/`

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