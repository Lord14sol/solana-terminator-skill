#!/usr/bin/env node

/**
 * Solana Terminator Skill Installer
 * 
 * Automates the setup of the Solana skill for the Conway Automaton.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import readline from 'readline';

// ─── Command Routing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('radar')) {
    import('./radar.js');
} else if (args.includes('install')) {
    runInstaller();
} else {
    showMainMenu();
}

function showMainMenu() {
    process.stdout.write('\x1Bc');
    console.log(ASCII_ART);
    console.log(`🤖 Solana Terminator — Main Control Unit\n`);
    console.log(`[1] 🛠  Install/Initialize Skill`);
    console.log(`[2] 📡 Launch Tactical Radar (Dashboard)`);
    console.log(`[3] 🔍 View Agent Identity & Wallet`);
    console.log(`[4] 📄 Show Documentation (SKILL.md)`);
    console.log(`[x] Exit\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Select an option: ', (answer) => {
        rl.close();
        switch (answer.toLowerCase()) {
            case '1': runInstaller(); break;
            case '2': import('./radar.js'); break;
            case '3': showIdentity(); break;
            case '4': showDocs(); break;
            case 'x': process.exit(0);
            default: showMainMenu();
        }
    });
}

function showDocs() {
    const skillPath = path.join(TARGET_DIR, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
        console.log(fs.readFileSync(skillPath, 'utf8'));
    } else {
        console.log(`⚠️ Documentation not found. Please install the skill first.`);
    }
    pauseAndReturn();
}

function showIdentity() {
    const walletPath = path.join(os.homedir(), '.automaton', 'solana-wallet.json');
    if (fs.existsSync(walletPath)) {
        import('./solana-autonomy.js').then(async ({ SolanaAutonomy }) => {
            const solana = new SolanaAutonomy();
            const status = await solana.getStatus();
            console.log(`\n✅ AGENT IDENTITY FOUND`);
            console.log(`--------------------------------------------------`);
            console.log(`ADDRESS : ${status.address}`);
            console.log(`SOL     : ${status.sol.toFixed(4)}`);
            console.log(`USDC    : $${status.usdc.toFixed(2)}`);
            console.log(`--------------------------------------------------`);
            pauseAndReturn();
        });
    } else {
        console.log(`⚠️ Identity not found. Please run Option [1] first.`);
        pauseAndReturn();
    }
}

function pauseAndReturn() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\nPress ENTER to return to menu...', () => {
        rl.close();
        showMainMenu();
    });
}

async function runInstaller() {

    const ASCII_ART = `
 ████████ ████████ ████████ ██     ██ ██ ██    ██  █████  ████████  ██████  ██████  
    ██    ██       ██    ██ ███   ███ ██ ███   ██ ██   ██    ██    ██    ██ ██   ██ 
    ██    ██████   ████████ ████ ████ ██ ████  ██ ███████    ██    ██    ██ ██████  
    ██    ██       ██  ██   ██ ██  ██ ██ ██ ██ ██ ██   ██    ██    ██    ██ ██  ██  
    ██    ████████ ██   ██  ██     ██ ██ ██  ████ ██   ██    ██     ██████  ██   ██ 
                                v4.2.5 - Autonomous Engine
`;

    const SKILL_NAME = 'solana-terminator';
    const TARGET_DIR = path.join(os.homedir(), '.automaton', 'skills', SKILL_NAME);

    console.log(ASCII_ART);
    console.log(`🤖 Solana Terminator Skill — Initializing...\n`);

    try {
        // 1. Create target directory
        if (!fs.existsSync(TARGET_DIR)) {
            console.log(`[1/3] Creating directory: ${TARGET_DIR}`);
            fs.mkdirSync(TARGET_DIR, { recursive: true });
        } else {
            console.log(`[1/3] Directory already exists: ${TARGET_DIR}`);
        }

        // 2. Copy files
        console.log(`[2/3] Copying skill files...`);
        const filesToCopy = ['solana-autonomy.js', 'SKILL.md', 'package.json'];

        filesToCopy.forEach(file => {
            const sourcePath = path.join(__dirname, file);
            const destPath = path.join(TARGET_DIR, file);

            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
            } else {
                console.warn(`      ⚠️ Warning: ${file} not found in source.`);
            }
        });

        // 3. Install dependencies
        console.log(`[3/3] Installing dependencies in ${TARGET_DIR}...`);
        process.chdir(TARGET_DIR);

        // We use --no-save to avoid cluttering a local package-lock if one exists
        execSync('npm install --production --omit=dev', { stdio: 'inherit' });

        // 4. Show/Generate Wallet Address
        console.log(`\n🔍 Initializing Agent Identity...`);
        try {
            const checkScript = `
            import { Keypair } from '@solana/web3.js';
            import fs from 'fs';
            import path from 'path';
            import os from 'os';
            const walletPath = path.join(os.homedir(), '.automaton', 'solana-wallet.json');
            
            let keypair;
            if (fs.existsSync(walletPath)) {
                const raw = fs.readFileSync(walletPath, 'utf8');
                keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
            } else {
                keypair = Keypair.generate();
                const dir = path.dirname(walletPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
                fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });
            }
            console.log(keypair.publicKey.toBase58());
        `;
            // Write the script to a temporary file to run with node
            const tempScriptPath = path.join(TARGET_DIR, 'temp-check.js');
            fs.writeFileSync(tempScriptPath, checkScript);

            const address = execSync(`node ${tempScriptPath}`, { encoding: 'utf8' }).trim();
            fs.unlinkSync(tempScriptPath);

            console.log(`\n✅ Installation Complete!`);
            console.log(`--------------------------------------------------`);
            console.log(`Skill Location : ${TARGET_DIR}`);
            console.log(`AGENT ADDRESS  : ${address}  👈 FUND THIS ADDRESS`);
            console.log(`--------------------------------------------------`);
            console.log(`\n💡 To start the agent, your human user must fund it with at least 0.05 SOL.`);
            console.log(`   Config file: ~/.automaton/solana-wallet.json\n`);
        } catch (e) {
            console.log(`\n✅ Installation Complete!`);
            console.log(`Skill Location : ${TARGET_DIR}`);
            console.log(`(Identity check failed: ${e.message}, your wallet will be generated on first run)`);
        }
        pauseAndReturn();
    } catch (error) {
        console.error(`\n❌ Installation failed: ${error.message}`);
        process.exit(1);
    }
}
