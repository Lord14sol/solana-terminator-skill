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

const ASCII_ART = `
 ████████ ████████ ████████ ██     ██ ██ ██    ██  █████  ████████  ██████  ██████  
    ██    ██       ██    ██ ███   ███ ██ ███   ██ ██   ██    ██    ██    ██ ██   ██ 
    ██    ██████   ████████ ████ ████ ██ ████  ██ ███████    ██    ██    ██ ██████  
    ██    ██       ██  ██   ██ ██  ██ ██ ██ ██ ██ ██   ██    ██    ██    ██ ██  ██  
    ██    ████████ ██   ██  ██     ██ ██ ██  ████ ██   ██    ██     ██████  ██   ██ 
                                v4.1.4 - Solana Autonomy
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

    // Handle nested subdirectories if any
    if (fs.existsSync(path.join(__dirname, 'solana-autonomy'))) {
        if (!fs.existsSync(path.join(TARGET_DIR, 'solana-autonomy'))) {
            fs.mkdirSync(path.join(TARGET_DIR, 'solana-autonomy'), { recursive: true });
        }
        fs.copyFileSync(
            path.join(__dirname, 'solana-autonomy', 'SKILL.md'),
            path.join(TARGET_DIR, 'solana-autonomy', 'SKILL.md')
        );
    }

    // 3. Install dependencies
    console.log(`[3/3] Installing dependencies in ${TARGET_DIR}...`);
    process.chdir(TARGET_DIR);

    // We use --no-save to avoid cluttering a local package-lock if one exists
    execSync('npm install --production --omit=dev', { stdio: 'inherit' });

    console.log(`\n✅ Installation Complete!`);
    console.log(`--------------------------------------------------`);
    console.log(`Skill Location: ${TARGET_DIR}`);
    console.log(`Configuration:  Check ~/.automaton/solana-wallet.json`);
    console.log(`--------------------------------------------------\n`);

} catch (error) {
    console.error(`\n❌ Installation failed: ${error.message}`);
    process.exit(1);
}
