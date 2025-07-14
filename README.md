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

## Keyboard Shortcuts

- `Tab` - Switch between panels
- `↑/↓` - Navigate within panels
- `Enter` - Show details
- `r` - Refresh data
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