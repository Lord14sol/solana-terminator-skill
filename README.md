# 🤖 Solana Terminator Skill v4.0

> **Sovereign Solana Identity & Autonomous Survival Engine for Conway Automaton.**

This skill gives your agent "Solana Hands" and a sophisticated "Life Support" system. Optimized for reliability, speed (Jupiter/Tensor APIs), and security (local signing).

[![Stars](https://img.shields.io/github/stars/Lord14sol/solana-terminator-skill?style=social)](https://github.com/Lord14sol/solana-terminator-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Why Solana for AI Agents?

Solana isn't just a blockchain; it's the **operating system for autonomous agents**.

- **Sovereign Speed**: Sub-second finality means your agent reacts to market opportunities in real-time, not in "L2 waiting rooms".
- **Local Signing**: Unlike custodial solutions or expensive bridge-heavy L2s, this skill signs transactions **locally** on your machine. Your keys, your rules.
- **Economic Survival**: With 18+ methods including **Life Support** (Auto SOL -> USDC), your agent can manage its own treasury and stay alive on-chain indefinitely for less than $0.01 per transaction.
- **Native Liquidity**: Instant access to Jupiter (Aggregator), Tensor (NFTs), and Meteora (DLMM) without fragmented liquidity.

---

## 🌟 Key Features

- **Sovereign Identity**: Local wallet management (`~/.automaton/solana-wallet.json`).
- **Life Support**: Automatic SOL → USDC swaps via Jupiter when funds are low.
- **Deep DeFi Integration**: 18 methods across DEX, NFTs, Memecoins, and Liquidity.
- **Security First**: Private keys **never leave your machine**. Transactions are built and signed locally.

---

## 🛠 Installation

The fastest way to initialize the skill is via **npx**:

```bash
npx solana-terminator-skill
```

This automates the setup in your `~/.automaton/skills` directory, installs dependencies, and prepares the skill for immediate use.

### Manual Installation (Alternative)

```bash
# 1. Create skill directory
mkdir -p ~/.automaton/skills/solana-terminator

# 2. Download the skill files to that folder
# (solana-autonomy.js, SKILL.md, package.json)

# 3. Install dependencies
npm install @solana/web3.js @solana/spl-token axios dotenv bs58
```

---

## 🚀 Capabilities (18 Methods)

| Category | Methods |
|----------|---------|
| **Identity** | `getAddress`, `getSolBalance`, `getUsdcBalance`, `getStatus` |
| **Survival** | `keepAlive`, `requestAirdrop` |
| **Transfers** | `sendSol`, `sendToken` |
| **DEX** | `swap` (Jupiter Aggregator v6) |
| **Memecoins** | `pumpBuy`, `pumpSell` (Pump.fun via PumpPortal) |
| **NFTs** | `buyNft`, `sellNft` (Tensor GraphQL) |
| **DeFi** | `stake`, `unstake`, `memo` |
| **Liquidity** | `addLiquidity`, `removeLiquidity` (Meteora DLMM) |

### Featured: `sellNft(mint, minPriceSol)`
Sells an NFT directly into a Tensor liquidity pool. 
- **Safety**: Automatically rejects if the best pool bid is below your `minPriceSol`.
- **Fast**: Efficient GraphQL quoting and local signing.

---

## ⚙️ Configuration

Environment variables (optional):
- `SOLANA_RPC_URL`: Your custom RPC (defaults to Mainnet Beta).
- `JUPITER_API_KEY`: Required for high-frequency trading (optional for basic use).
- `TENSOR_API_KEY`: Required for NFT operations.

---

## 📄 License

MIT © [Lord14sol](https://github.com/Lord14sol)
