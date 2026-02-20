#!/usr/bin/env node

/**
 * P.R.E.D.A.T.O.R. Installer (Sovereign Polish v4.6.2)
 * 
 * Leak-proof keyboard navigation and cleaner UI.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';
import animations from 'unicode-animations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const green = chalk.green;
const neon = chalk.cyan;
const alert = chalk.yellow;
const critical = chalk.red;
const dim = chalk.gray;

const SKILL_NAME = 'solana-terminator';
const TARGET_DIR = path.join(os.homedir(), '.automaton', 'skills', SKILL_NAME);
const ENV_FILE = path.join(os.homedir(), '.automaton', '.env');

const ASCII_ART = `
 ██████  ██████  ███████ ██████   █████  ████████  ██████  ██████  
 ██   ██ ██   ██ ██      ██   ██ ██   ██    ██    ██    ██ ██   ██ 
 ██████  ██████  █████   ██   ██ ███████    ██    ██    ██ ██████  
 ██      ██   ██ ██      ██   ██ ██   ██    ██    ██    ██ ██   ██ 
 ██      ██   ██ ███████ ██████  ██   ██    ██     ██████  ██   ██ 
                                v4.8.2 - Hardened Architecture
`;

// ─── Interactive State ──────────────────────────────────────────────────────

let selectedIndex = 0;
let isMenuMode = true;

const menuOptions = [
    { label: 'Reset/Install Identity (Wallet)', action: () => runInstaller() },
    { label: 'Launch Radar (Autonomous Monitor)', action: () => launchRadar(false) },
    { label: 'View Balance & Identity', action: () => showIdentity() },
    { label: 'Configure Pro Intel (Optional API)', action: () => configureApi() },
    { label: 'Set Master Vault Address (Tribute)', action: () => configureMaster() },
    { label: 'Configure Custom RPC URL', action: () => configureRpc() },
    { label: 'Exit Engine', action: () => process.exit(0) }
];

// ─── Rendering ──────────────────────────────────────────────────────────────

function renderMenu() {
    if (!isMenuMode) return;
    process.stdout.write('\x1Bc');
    console.log(green(ASCII_ART));
    console.log(dim(` Tactical Directory: ${TARGET_DIR}\n`));
    console.log(dim(` (Arrows to navigate, Enter to select)\n`));

    menuOptions.forEach((option, index) => {
        if (index === selectedIndex) {
            console.log(`  ${neon('●')} ${neon.bold(option.label)}`);
        } else {
            console.log(`    ${dim(option.label)}`);
        }
    });

    console.log('\n' + dim('─'.repeat(50)));
}

// ─── Input Handling ──────────────────────────────────────────────────────────

let keyboardInitialized = false;

function setupKeyboard() {
    if (!process.stdin.isTTY || keyboardInitialized) return;

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('keypress', (str, key) => {
        if (!isMenuMode) return;

        if (key.name === 'up') {
            selectedIndex = (selectedIndex - 1 + menuOptions.length) % menuOptions.length;
            renderMenu();
        } else if (key.name === 'down') {
            selectedIndex = (selectedIndex + 1) % menuOptions.length;
            renderMenu();
        } else if (key.name === 'return') {
            isMenuMode = false;
            process.stdin.setRawMode(false);
            const option = menuOptions[selectedIndex];
            option.action();
        } else if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
            process.exit(0);
        }
    });

    keyboardInitialized = true;
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function launchRadar(isDirect = false) {
    try {
        const radarPath = path.join(__dirname, 'radar.js');
        spawnSync('node', [radarPath], { stdio: 'inherit' });
        if (!isDirect) {
            isMenuMode = true;
            process.stdin.setRawMode(true);
            renderMenu();
        } else {
            process.exit(0);
        }
    } catch (e) {
        if (!isDirect) {
            isMenuMode = true;
            process.stdin.setRawMode(true);
            renderMenu();
        } else process.exit(1);
    }
}

async function showIdentity() {
    process.stdout.write('\x1Bc');
    const walletPath = path.join(os.homedir(), '.automaton', 'solana-wallet.json');
    if (fs.existsSync(walletPath)) {
        try {
            const { SolanaAutonomy } = await import('./solana-autonomy.js');
            const solana = new SolanaAutonomy();
            const status = await solana.getStatus();
            console.log(`\n✅ IDENTITY ACTIVE`);
            console.log(`--------------------------------------------------`);
            console.log(`ADDRESS : ${status.address}`);
            console.log(`BALANCE : ${status.sol.toFixed(4)} SOL | $${status.usdc.toFixed(2)} USDC`);
            console.log(`TIER    : ${status.solLow ? critical('CRITICAL') : green('NOMINAL')}`);
            console.log(`--------------------------------------------------`);
        } catch (err) {
            console.log(critical(`\n❌ Error fetching balance: ${err.message}`));
            console.log(dim('Possible RPC rate limit. Try configuring a custom RPC URL in Option [6].'));
        }
    } else {
        console.log(critical(`⚠️ Identity not found. Run installer first.`));
    }
    pauseAndReturn();
}

async function configureApi() {
    process.stdout.write('\x1Bc');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n🔑 CONFIGURE PRO INTEL`);
    rl.question(neon('Enter Birdeye API Key (or press Enter to skip): '), (key) => {
        if (key.trim()) {
            saveToEnv('BIRDEYE_API_KEY', key.trim());
            console.log(green('\n✅ Key saved.'));
        }
        rl.close();
        pauseAndReturn();
    });
}

async function configureMaster() {
    process.stdout.write('\x1Bc');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n💳 CONFIGURE MASTER VAULT`);
    rl.question(neon('Enter Master Wallet Address: '), (address) => {
        if (address.trim()) {
            saveToEnv('MASTER_WALLET', address.trim());
            console.log(green('\n✅ Master vault set. Tribute protocol ACTIVE.'));
        }
        rl.close();
        pauseAndReturn();
    });
}

async function configureRpc() {
    process.stdout.write('\x1Bc');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n🌐 CONFIGURE CUSTOM RPC URL`);
    console.log(dim('Highly recommended to avoid "429 Too Many Requests" errors.\n'));
    rl.question(neon('Enter Custom RPC URL: '), (url) => {
        if (url.trim()) {
            saveToEnv('SOLANA_RPC_URL', url.trim());
            console.log(green('\n✅ RPC URL updated.'));
        }
        rl.close();
        pauseAndReturn();
    });
}

function saveToEnv(key, value) {
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');
        envContent = envContent.split('\n').filter(line => !line.startsWith(`${key}=`)).join('\n');
    }
    envContent += `\n${key}=${value}\n`;
    fs.mkdirSync(path.dirname(ENV_FILE), { recursive: true });
    fs.writeFileSync(ENV_FILE, envContent.trim() + '\n');
}

function pauseAndReturn() {
    console.log(dim('\nPress any key to return...'));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
        isMenuMode = true;
        setupKeyboard();
        renderMenu();
    });
}

async function runInstaller() {
    process.stdout.write('\x1Bc');
    console.log(green(ASCII_ART));
    console.log(neon(` [BOOTING] Initializing sovereign modules...\n`));

    const frames = animations.braille.frames;
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.write(`\r ${neon(frames[i % frames.length])} Setting up tactical protocols... `);
        i++;
    }, 100);

    setTimeout(async () => {
        clearInterval(interval);
        process.stdout.write('\r ✅ Tactical protocols initialized.\n');

        try {
            if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });
            const filesToCopy = ['solana-autonomy.js', 'SKILL.md', 'package.json', 'radar.js', 'install.js'];
            for (const file of filesToCopy) {
                const sourcePath = path.join(__dirname, file);
                const destPath = path.join(TARGET_DIR, file);
                if (fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, destPath);
            }
            const { SolanaAutonomy } = await import('./solana-autonomy.js');
            const solana = new SolanaAutonomy();
            console.log(`\n✅ SOVEREIGN ACTIVE: ${green(solana.getAddress())}\n`);
        } catch (err) {
            console.error(critical(`\n❌ Setup failed: ${err.message}`));
        }
        pauseAndReturn();
    }, 2000);
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('radar')) {
    launchRadar(true);
} else {
    setupKeyboard();
    renderMenu();
}
