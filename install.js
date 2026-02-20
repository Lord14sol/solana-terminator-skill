#!/usr/bin/env node

/**
 * P.R.E.D.A.T.O.R. Installer (Pure Survival)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const green = chalk.green;
const neon = chalk.cyan;
const alert = chalk.yellow;
const critical = chalk.red;
const dim = chalk.gray;

const ASCII_ART = `
 ██████  ██████  ███████ ██████   █████  ████████  ██████  ██████  
 ██   ██ ██   ██ ██      ██   ██ ██   ██    ██    ██    ██ ██   ██ 
 ██████  ██████  █████   ██   ██ ███████    ██    ██    ██ ██████  
 ██      ██   ██ ██      ██   ██ ██   ██    ██    ██    ██ ██   ██ 
 ██      ██   ██ ███████ ██████  ██   ██    ██     ██████  ██   ██ 
                                v4.5.0 - Pure Survival Edition
`;

const SKILL_NAME = 'solana-terminator';
const TARGET_DIR = path.join(os.homedir(), '.automaton', 'skills', SKILL_NAME);
const ENV_FILE = path.join(os.homedir(), '.automaton', '.env');

// ─── Command Routing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('radar')) {
    launchRadar(true);
} else if (args.includes('install')) {
    runInstaller();
} else {
    showMainMenu();
}

// ─── Main Menu ──────────────────────────────────────────────────────────────

function showMainMenu() {
    process.stdout.write('\x1Bc');
    console.log(green(ASCII_ART));
    console.log(dim(` Tactical Directory: ${TARGET_DIR}\n`));

    console.log(`${neon('[1]')} Reset/Install Identity (Wallet)`);
    console.log(`${neon('[2]')} Launch Radar (Autonomous Monitor)`);
    console.log(`${neon('[3]')} View Balance & Identity`);
    console.log(`${neon('[4]')} Configure Birdeye API Key`);
    console.log(`${neon('[5]')} Configure Master Wallet (Tribute)`);
    console.log(`${neon('[q]')} Exit`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(green('\nSelect option: '), (choice) => {
        rl.close();
        switch (choice.toLowerCase()) {
            case '1': runInstaller().then(() => pauseAndReturn()); break;
            case '2': launchRadar(false); break;
            case '3': showIdentity(); break;
            case '4': configureApi(); break;
            case '5': configureMaster(); break;
            case 'q': process.exit(0);
            default: showMainMenu();
        }
    });
}

function launchRadar(isDirect = false) {
    try {
        const radarPath = path.join(__dirname, 'radar.js');
        spawnSync('node', [radarPath], { stdio: 'inherit', shell: true });
        if (!isDirect) showMainMenu();
        else process.exit(0);
    } catch (e) {
        if (!isDirect) showMainMenu();
        else process.exit(1);
    }
}

function showIdentity() {
    const walletPath = path.join(os.homedir(), '.automaton', 'solana-wallet.json');
    if (fs.existsSync(walletPath)) {
        import('./solana-autonomy.js').then(async ({ SolanaAutonomy }) => {
            const solana = new SolanaAutonomy();
            const status = await solana.getStatus();
            console.log(`\n✅ IDENTITY ACTIVE`);
            console.log(`--------------------------------------------------`);
            console.log(`ADDRESS : ${status.address}`);
            console.log(`BALANCE : ${status.sol.toFixed(4)} SOL | $${status.usdc.toFixed(2)} USDC`);
            console.log(`TIER    : ${status.solLow ? 'CRITICAL' : 'NOMINAL'}`);
            console.log(`--------------------------------------------------`);
            pauseAndReturn();
        });
    } else {
        console.log(`⚠️ Identity not found. Run Option [1] first.`);
        pauseAndReturn();
    }
}

function configureApi() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n🔑 CONFIGURE API KEY`);
    rl.question(neon('Enter Birdeye API Key: '), (key) => {
        if (key.trim()) {
            saveToEnv('BIRDEYE_API_KEY', key.trim());
            console.log(green('\n✅ Key saved.'));
        }
        rl.close();
        pauseAndReturn();
    });
}

function configureMaster() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n💳 CONFIGURE MASTER WALLET`);
    rl.question(neon('Enter Master Wallet Address: '), (address) => {
        if (address.trim()) {
            saveToEnv('MASTER_WALLET', address.trim());
            console.log(green('\n✅ Master wallet set.'));
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
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\nPress ENTER to continue...', () => {
        rl.close();
        showMainMenu();
    });
}

async function runInstaller() {
    process.stdout.write('\x1Bc');
    console.log(ASCII_ART);
    console.log(`🤖 Initializing survival primitives...\n`);

    try {
        if (!fs.existsSync(TARGET_DIR)) {
            fs.mkdirSync(TARGET_DIR, { recursive: true });
        }

        const filesToCopy = ['solana-autonomy.js', 'SKILL.md', 'package.json', 'radar.js', 'install.js'];
        filesToCopy.forEach(file => {
            const sourcePath = path.join(__dirname, file);
            const destPath = path.join(TARGET_DIR, file);
            if (fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, destPath);
        });

        const { SolanaAutonomy } = await import('./solana-autonomy.js');
        const solana = new SolanaAutonomy();

        console.log(`\n✅ READY. Address: ${green(solana.getAddress())}`);

    } catch (err) {
        console.error(`❌ Setup failed: ${err.message}`);
    }
}
