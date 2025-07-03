#!/bin/bash

# Create a macOS app for Claude Monitor

# Create the app structure
APP_NAME="Claude Monitor"
APP_DIR="/Users/irvinbowman/Claude usage/claude-monitor/launch-scripts/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

# Create directories
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Create the Info.plist
cat > "$CONTENTS_DIR/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Claude Monitor</string>
    <key>CFBundleDisplayName</key>
    <string>Claude Monitor</string>
    <key>CFBundleIdentifier</key>
    <string>com.claudemonitor.app</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>claude-monitor</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10</string>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

# Create the executable script
cat > "$MACOS_DIR/claude-monitor" << 'EOF'
#!/bin/bash

# Get the directory where the app bundle is located
APP_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"

# Open Terminal and run the command
osascript -e "
tell application \"Terminal\"
    activate
    do script \"cd \\\"$APP_DIR\\\" && ./launch-scripts/\\\"Claude Monitor.command\\\"\"
end tell
"
EOF

# Make the executable script executable
chmod +x "$MACOS_DIR/claude-monitor"

# Create a simple icon (you can replace this with a proper icon later)
# For now, we'll just create a placeholder
touch "$RESOURCES_DIR/AppIcon.icns"

echo "App created at: $APP_DIR"
echo ""
echo "To install on your desktop:"
echo "1. Open Finder"
echo "2. Navigate to: /Users/irvinbowman/Claude usage/claude-monitor/launch-scripts/"
echo "3. Drag 'Claude Monitor.app' to your Desktop"
echo ""
echo "Or run: cp -r \"$APP_DIR\" ~/Desktop/"