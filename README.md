# 🤖 Solana Terminator Skill v4.0

> **Sovereign Solana Identity & Autonomous Survival Engine for Conway Automaton.**

This skill gives your agent "Solana Hands" and a sophisticated "Life Support" system. Optimized for reliability, speed (Jupiter/Tensor APIs), and security (local signing).

[![Stars](https://img.shields.io/github/stars/Lord14sol/solana-terminator-skill?style=social)](https://github.com/Lord14sol/solana-terminator-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

- **Sovereign Identity**: Local wallet management (`~/.automaton/solana-wallet.json`).
- **Life Support**: Automatic SOL → USDC swaps via Jupiter when funds are low.
- **Deep DeFi Integration**: 18 methods across DEX, NFTs, Memecoins, and Liquidity.
- **Security First**: Private keys **never leave your machine**. Transactions are built and signed locally.

---

## 🛠 Installation

```bash
# 1. Create skill directory
mkdir -p ~/.automaton/skills/solana-terminator

# 2. Download the skill
# (Copy solana-autonomy.js and SKILL.md to the folder)

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
