#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { App } from './app.js';

// Parse CLI arguments
const args = process.argv.slice(2);
const mockMode = args.includes('--mock');

// Debug file for logging (since console.log breaks Ink)
import * as fs from 'node:fs';
import * as path from 'node:path';

const DEBUG_LOG = path.join(process.cwd(), 'tinyagi-tui-debug.log');

// Override console methods to write to file instead of stdout
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function debugLog(...args: unknown[]) {
  try {
    const line = `[${new Date().toISOString()}] ${args.map(String).join(' ')}\n`;
    fs.appendFileSync(DEBUG_LOG, line);
  } catch {
    // Ignore write errors
  }
}

console.log = debugLog;
console.error = debugLog;
console.warn = debugLog;

// Render the full-screen app
const { waitUntilExit, unmount } = render(
  <App mockMode={mockMode} />,
  {
    exitOnCtrlC: true,
  }
);

// Graceful exit
async function cleanup() {
  unmount();
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

waitUntilExit().then(() => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}).catch(() => {
  process.exit(1);
});
