#!/usr/bin/env node

/**
 * Tactical Survival Dashboard (Radar)
 * 
 * Matrix/Cyberpunk style terminal for real-time Solana autonomous monitoring.
 */

import chalk from 'chalk';
import WebSocket from 'ws';
import { SolanaAutonomy } from './solana-autonomy.js';
import readline from 'readline';

const solana = new SolanaAutonomy();
const green = chalk.green;
const neon = chalk.cyan;
const alert = chalk.yellow;
const critical = chalk.red;
const dim = chalk.gray;

// ─── State ──────────────────────────────────────────────────────────────────

let status = {
    sol: 0,
    usdc: 0,
    tier: 'NOMINAL',
    logs: [],
    mints: []
};

let intervals = [];
let wsClient = null;

// ─── UI Helpers ─────────────────────────────────────────────────────────────

function clear() {
    process.stdout.write('\x1Bc');
}

function line() {
    console.log(dim('─'.repeat(process.stdout.columns || 80)));
}

function header(text) {
    console.log(chalk.bgBlack.white.bold(`  ${text}  `));
}

// ─── Rendering ──────────────────────────────────────────────────────────────

async function render() {
    clear();
    console.log(green.bold(`
 ██████  ██████  ██       █████  ███    ██  █████      ██████   █████  ██████   █████  ██████  
██      ██    ██ ██      ██   ██ ████   ██ ██   ██     ██   ██ ██   ██ ██   ██ ██   ██ ██   ██ 
  █████  ██    ██ ██      ███████ ██ ██  ██ ███████     ██████  ███████ ██   ██ ███████ ██████  
      ██ ██    ██ ██      ██   ██ ██  ██ ██ ██   ██     ██   ██ ██   ██ ██   ██ ██   ██ ██   ██ 
 ██████   ██████  ███████ ██   ██ ██   ████ ██   ██     ██   ██ ██   ██ ██████  ██   ██ ██████  
                                                                             v4.3.2 RADAR
    `));

    line();
    header('VITAL SIGNS');
    const tierColor = status.tier === 'NOMINAL' ? green : (status.tier === 'WARNING' ? alert : critical);
    console.log(`  SOL: ${neon(status.sol.toFixed(4))} | USDC: ${neon('$' + status.usdc.toFixed(2))} | TIER: ${tierColor.bold(status.tier)}`);

    line();
    header('PREDATOR RADAR (Pump.fun Live)');
    const recentMints = status.mints.slice(-8).reverse();
    if (recentMints.length === 0) {
        console.log(dim('  Waiting for new transmissions...'));
    } else {
        recentMints.forEach(m => {
            const secBadge = m.safe ? green('🛡️  SAFE') : critical('⚠️  RISKY');
            console.log(`  [${dim(m.time)}] ${neon(m.symbol.padEnd(8))} | VOL: ${alert(m.vol)} | ${secBadge} | ${dim(m.mint.slice(0, 8) + '...')}`);
        });
    }

    line();
    header('DECISION LOG');
    const recentLogs = status.logs.slice(-5).reverse();
    recentLogs.forEach(l => {
        console.log(`  ${dim('>')} ${l}`);
    });

    line();
    console.log(green('  COMMAND CENTER ACTIVE. REASONING IN PROGRESS...'));
    console.log(dim('  Press [q] to return to menu | [Ctrl+C] to quit'));
}

// ─── Logic ──────────────────────────────────────────────────────────────────

async function updateVitals() {
    try {
        const stats = await solana.getStatus();
        status.sol = stats.sol;
        status.usdc = stats.usdc;
        status.tier = stats.solLow ? 'CRITICAL' : (stats.usdcLow ? 'WARNING' : 'NOMINAL');
    } catch (err) {
        status.logs.push(critical(`Vitals check failed: ${err.message}`));
    }
}

function startWebSocket() {
    wsClient = new WebSocket('wss://pumpportal.fun/api/data');

    wsClient.on('open', () => {
        wsClient.send(JSON.stringify({ method: 'subscribeNewToken' }));
        status.logs.push(green('Uplink established with PumpPortal WS.'));
    });

    wsClient.on('message', async (data) => {
        const payload = JSON.parse(data);
        if (payload.txType === 'create') {
            const security = await solana.auditTokenSecurity(payload.mint);
            status.mints.push({
                time: new Date().toLocaleTimeString(),
                symbol: payload.symbol,
                mint: payload.mint,
                vol: '$0', // New mint
                safe: security.safe
            });

            if (security.safe) {
                status.logs.push(neon(`Target detected: ${payload.symbol}. Volume spike expected. Security verified.`));
            }
        }
    });

    wsClient.on('error', (err) => {
        status.logs.push(critical(`WebSocket error: ${err.message}`));
    });
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function bootstrap(onExit) {
    // 1. Initialize Keyboard immediately to prevent hang-lock
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();

    const cleanup = () => {
        intervals.forEach(clearInterval);
        if (wsClient) wsClient.close();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.pause();
    };

    const keyListener = (str, key) => {
        if (key && (key.name === 'q' || (key.ctrl && key.name === 'c'))) {
            cleanup();
            if (key.ctrl && key.name === 'c') {
                process.exit(0);
            } else {
                if (onExit) onExit();
            }
        }
    };

    // Fallback data listener if keypress fails
    const dataListener = (data) => {
        const str = data.toString();
        if (str === 'q') {
            cleanup();
            process.stdin.removeListener('data', dataListener);
            if (onExit) onExit();
        }
    };

    process.stdin.on('keypress', keyListener);
    process.stdin.on('data', dataListener);

    // 2. Start Logic
    status.logs.push('Initializing Solana Autonomy identity...');
    render(); // Initial empty render

    await updateVitals();
    startWebSocket();

    const interval = setInterval(async () => {
        await updateVitals();
        render();
    }, 2000);
    intervals.push(interval);

    render();
}

// Support direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
    bootstrap(() => process.exit(0));
}
