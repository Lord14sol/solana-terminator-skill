#!/usr/bin/env node

/**
 * P.R.E.D.A.T.O.R. Tactical Radar
 * 
 * Matrix/Cyberpunk style terminal for real-time Solana autonomous monitoring.
 */

import chalk from 'chalk';
import WebSocket from 'ws';
import { SolanaAutonomy } from './solana-autonomy.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const solana = new SolanaAutonomy();
const green = chalk.green;
const neon = chalk.cyan;
const alert = chalk.yellow;
const critical = chalk.red;
const dim = chalk.gray;

const MISSION_LOG_PATH = path.join(os.homedir(), '.automaton', 'mission.log');
const THOUGHTS_LOG_PATH = path.join(os.homedir(), '.automaton', 'thoughts.log');

// ─── State ──────────────────────────────────────────────────────────────────

let status = {
    sol: 0,
    usdc: 0,
    tier: 'NOMINAL',
    missionLogs: [],
    thoughtLogs: [],
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
 ██████  ██████  ███████ ██████   █████  ████████  ██████  ██████  
 ██   ██ ██   ██ ██      ██   ██ ██   ██    ██    ██    ██ ██   ██ 
 ██████  ██████  █████   ██   ██ ███████    ██    ██    ██ ██████  
 ██      ██   ██ ██      ██   ██ ██   ██    ██    ██    ██ ██   ██ 
 ██      ██   ██ ███████ ██████  ██   ██    ██     ██████  ██   ██ 
                                                                           v4.3.15 RADAR
    `));

    line();
    header('VITAL SIGNS');
    const tierColor = status.tier === 'NOMINAL' ? green : (status.tier === 'WARNING' ? alert : critical);
    console.log(`  SOL: ${neon(status.sol.toFixed(4))} | USDC: ${neon('$' + status.usdc.toFixed(2))} | TIER: ${tierColor.bold(status.tier)}`);

    line();
    header('NEURAL REFLECTION (Internal Reasoning)');
    const thoughts = status.thoughtLogs.slice(-3).reverse();
    if (thoughts.length === 0) {
        console.log(dim('  Synchronizing with the neural engine...'));
    } else {
        thoughts.forEach(t => {
            console.log(`  ${neon('🧠')} ${chalk.italic(t)}`);
        });
    }

    line();
    header('MISSION CONTROL (The Brain Logs)');
    const missionLogs = status.missionLogs.slice(-3).reverse();
    if (missionLogs.length === 0) {
        console.log(dim('  Waiting for the Brain...'));
    } else {
        missionLogs.forEach(l => {
            console.log(`  ${green('⦿')} ${l}`);
        });
    }

    line();
    header('P.R.E.D.A.T.O.R. RADAR (Market Live)');
    const recentMints = status.mints.slice(-3).reverse();
    if (recentMints.length === 0) {
        console.log(dim('  Awaiting transmissions from PumpPortal...'));
    } else {
        recentMints.forEach(m => {
            let secBadge;
            if (m.source === 'jupiter_strict') {
                secBadge = green('🛡️  VERIF');
            } else if (m.source === 'birdeye') {
                secBadge = m.safe ? green('🛡️  SAFE') : critical('⚠️  RISKY');
            } else {
                secBadge = critical('⚠️  RISKY');
            }
            console.log(`  [${dim(m.time)}] ${neon(m.symbol.padEnd(8))} | ${secBadge} | ${dim(m.mint.slice(0, 16))}`);
        });
    }

    line();
    header('AUTONOMIC MODULES STATUS');
    const birdEyeStatus = process.env.BIRDEYE_API_KEY ? green('ACTIVE') : alert('FREE_MODE');
    const tributeStatus = process.env.MASTER_WALLET ? green('ALIGNED') : alert('UNSET');
    console.log(`  Security: Birdeye (${birdEyeStatus}) | Jupiter Fallback (${green('ON')})`);
    console.log(`  Protocol: ${green('TRIBUTE v1.0')} | Tribute Target: ${tributeStatus}`);

    line();
    console.log(green('  COMMAND CENTER ACTIVE. PRESS [q] TO EXIT.'));
}

// ─── Logic ──────────────────────────────────────────────────────────────────

async function runAutonomousCycle() {
    try {
        await solana.keepAlive();
        const stats = await solana.getStatus();
        status.sol = stats.sol;
        status.usdc = stats.usdc;
        status.tier = stats.solLow ? 'CRITICAL' : (stats.usdcLow ? 'WARNING' : 'NOMINAL');
    } catch (err) {
        // ignore
    }
}

function startWebSocket() {
    try {
        wsClient = new WebSocket('wss://pumpportal.fun/api/data');
        wsClient.on('open', () => {
            wsClient.send(JSON.stringify({ method: 'subscribeNewToken' }));
        });
        wsClient.on('message', async (data) => {
            const payload = JSON.parse(data);
            if (payload.txType === 'create') {
                const security = await solana.auditTokenSecurity(payload.mint);
                status.mints.push({
                    time: new Date().toLocaleTimeString(),
                    symbol: payload.symbol,
                    mint: payload.mint,
                    vol: '$0',
                    safe: security.safe,
                    source: security.source
                });
            }
        });
    } catch (e) {
        // ignore
    }
}

function tailLogs() {
    // Mission Logs
    if (fs.existsSync(MISSION_LOG_PATH)) {
        status.missionLogs = fs.readFileSync(MISSION_LOG_PATH, 'utf8').split('\n').filter(Boolean).slice(-10);
        fs.watchFile(MISSION_LOG_PATH, { interval: 1000 }, () => {
            status.missionLogs = fs.readFileSync(MISSION_LOG_PATH, 'utf8').split('\n').filter(Boolean).slice(-10);
            render();
        });
    }
    // Thoughts Logs
    if (fs.existsSync(THOUGHTS_LOG_PATH)) {
        status.thoughtLogs = fs.readFileSync(THOUGHTS_LOG_PATH, 'utf8').split('\n').filter(Boolean).slice(-10);
        fs.watchFile(THOUGHTS_LOG_PATH, { interval: 1000 }, () => {
            status.thoughtLogs = fs.readFileSync(THOUGHTS_LOG_PATH, 'utf8').split('\n').filter(Boolean).slice(-10);
            render();
        });
    } else {
        fs.mkdirSync(path.dirname(THOUGHTS_LOG_PATH), { recursive: true });
        fs.writeFileSync(THOUGHTS_LOG_PATH, '');
    }
}

// ─── Process Management ──────────────────────────────────────────────────────

function setupKeyboard() {
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
        if (key === 'q' || key === '\u0003' || key === '\u0004') {
            intervals.forEach(clearInterval);
            if (wsClient) wsClient.close();
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\n');
            process.exit(0);
        }
    });

    process.on('SIGTERM', () => process.exit(0));
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
    setupKeyboard();
    tailLogs();

    const freeMode = !process.env.BIRDEYE_API_KEY;
    if (freeMode) {
        solana.logThought('Freedom Mode: Activated. Using Jupiter Strict List for security...');
    }
    solana.logThought('Uplink established. Engaging P.R.E.D.A.T.O.R. Surveillance loop...');

    render();

    await runAutonomousCycle();
    startWebSocket();

    const brainInterval = setInterval(async () => {
        await runAutonomousCycle();
    }, 10000);
    intervals.push(brainInterval);

    const uiInterval = setInterval(() => {
        render();
    }, 3000);
    intervals.push(uiInterval);

    render();
}

main().catch(err => {
    console.error(critical(`FATAL ERROR: ${err.message}`));
    process.exit(1);
});
