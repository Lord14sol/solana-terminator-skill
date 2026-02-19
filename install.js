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

// ─── Command Routing ────────────────────────────────────────────────────────
if (process.argv.includes('radar')) {
    import('./radar.js');
} else {
    runInstaller();
}

async function runInstaller() {

    const ASCII_ART = `
 ████████ ████████ ████████ ██     ██ ██ ██    ██  █████  ████████  ██████  ██████  
    ██    ██       ██    ██ ███   ███ ██ ███   ██ ██   ██    ██    ██    ██ ██   ██ 
    ██    ██████   ████████ ████ ████ ██ ████  ██ ███████    ██    ██    ██ ██████  
    ██    ██       ██  ██   ██ ██  ██ ██ ██ ██ ██ ██   ██    ██    ██    ██ ██  ██  
    ██    ████████ ██   ██  ██     ██ ██ ██  ████ ██   ██    ██     ██████  ██   ██ 
                                v4.2.2 - Market-Aware Engine
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
            console.log(`Manual Check: cat ~/.automaton/solana-wallet.json`);
        }

    } catch (error) {
        console.error(`\n❌ Installation failed: ${error.message}`);
        process.exit(1);
    }
}
