#!/usr/bin/env node

/**
 * Cross-platform Claude Monitor Launcher
 * Works on Windows, macOS, and Linux
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectDir = path.join(__dirname, '..');
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';

console.log('🚀 Starting Claude Monitor...\n');

// Change to project directory
process.chdir(projectDir);

// Check if dependencies are installed
if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    const npmInstall = spawn(isWindows ? 'npm.cmd' : 'npm', ['install'], {
        stdio: 'inherit'
    });
    
    npmInstall.on('close', (code) => {
        if (code === 0) {
            checkBuildAndStart();
        } else {
            console.error('❌ Failed to install dependencies');
            process.exit(1);
        }
    });
} else {
    checkBuildAndStart();
}

function checkBuildAndStart() {
    // Check if project is built
    if (!fs.existsSync('dist')) {
        console.log('🔨 Building project...');
        const npmBuild = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'build'], {
            stdio: 'inherit'
        });
        
        npmBuild.on('close', (code) => {
            if (code === 0) {
                startServer();
            } else {
                console.error('❌ Failed to build project');
                process.exit(1);
            }
        });
    } else {
        startServer();
    }
}

function startServer() {
    // Kill existing instances on port 3000
    const killCommand = isWindows 
        ? 'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3000\') do taskkill /f /pid %a'
        : 'lsof -ti:3000 | xargs kill -9';
    
    exec(killCommand, (error) => {
        // Ignore errors (no existing process is fine)
        
        console.log('🌐 Starting web server...');
        
        // Start the monitor
        const monitor = spawn('node', ['dist/index.js', '--web-only', '--plan', 'Max20'], {
            detached: !isWindows,
            stdio: isWindows ? 'inherit' : ['ignore', 'pipe', 'pipe']
        });
        
        if (!isWindows) {
            monitor.unref();
        }
        
        // Wait for server to start
        setTimeout(() => {
            console.log('🎉 Claude Monitor is running at http://localhost:3000');
            
            // Open browser
            const openCommand = isWindows ? 'start ""' : isMac ? 'open' : 'xdg-open';
            exec(`${openCommand} http://localhost:3000`);
            
            if (isWindows) {
                console.log('\n📌 Close this window to stop the monitor');
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.on('data', () => process.exit(0));
            } else {
                console.log('✅ Monitor started in background');
                process.exit(0);
            }
        }, 3000);
    });
}