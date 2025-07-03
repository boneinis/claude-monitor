# Claude Monitor

A terminal-based real-time monitoring tool for Claude Code usage with optional web dashboard.

## Features

- 📊 Real-time token usage monitoring
- 💰 Cost tracking and breakdown by model
- 📈 Historical usage analytics
- ⚠️ Smart alerts for usage thresholds
- 🎯 Session-based tracking (5-hour windows)
- 🖥️ Beautiful terminal UI with keyboard navigation

## Installation

```bash
npm install -g claude-monitor
```

Or run locally:

```bash
npm install
npm run build
npm start
```

## Usage

```bash
# Launch interactive TUI
claude-monitor

# Launch web dashboard only
claude-monitor --web-only

# Launch TUI with web dashboard
claude-monitor --web

# Show daily report
claude-monitor --daily

# Custom refresh interval (milliseconds)
claude-monitor --refresh 1000

# Specify subscription plan
claude-monitor --plan Max20

# Custom web server port
claude-monitor --web-only --port 8080
```

## Keyboard Shortcuts

- `Tab` - Switch between panels
- `↑/↓` - Navigate within panels
- `Enter` - Show details
- `r` - Refresh data
- `?/h` - Show help
- `q` - Quit

## Plans Supported

- Free (2k daily / 1k session)
- Pro (7k daily / 3.5k session)
- Max5 (15k daily / 7.5k session)
- Max20 (60k daily / 30k session)

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