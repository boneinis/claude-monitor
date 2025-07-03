#!/bin/bash

# Create app bundle structure
APP_NAME="Claude Monitor"
APP_PATH="$HOME/Desktop/$APP_NAME.app"
CONTENTS="$APP_PATH/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"

# Clean up old app if exists
rm -rf "$APP_PATH"

# Create directories
mkdir -p "$MACOS"
mkdir -p "$RESOURCES"

# Create Info.plist
cat > "$CONTENTS/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIdentifier</key>
    <string>com.claude.monitor</string>
    <key>CFBundleName</key>
    <string>Claude Monitor</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
</dict>
</plist>
EOF

# Create the launcher script that will run in Terminal
cat > "$MACOS/launcher" << 'EOF'
#!/bin/bash

# Launch Terminal with our script
osascript << EOA
tell application "Terminal"
    activate
    set newTab to do script "cd '/Users/irvinbowman/Claude usage/claude-monitor' && bash './launch-scripts/launch-claude-monitor.sh'"
end tell
EOA
EOF

# Make launcher executable
chmod +x "$MACOS/launcher"

echo "Created app at: $APP_PATH"
echo "You can now double-click 'Claude Monitor' on your Desktop"