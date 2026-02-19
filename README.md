#  Solana Terminator Skill v4.1.9

> **Sovereign Solana Identity & Autonomous Survival Engine for Conway Automaton.**

This skill gives your agent "Solana Hands" and a sophisticated "Life Support" system. Optimized for reliability, speed (Jupiter/Tensor APIs), and security (local signing).

[![Stars](https://img.shields.io/github/stars/Lord14sol/solana-terminator-skill?style=social)](https://github.com/Lord14sol/solana-terminator-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

##  Why Solana for AI Agents?

Solana isn't just a blockchain; it's the **operating system for autonomous agents**.

- **Sovereign Speed**: Sub-second finality means your agent reacts to market opportunities in real-time, not in "L2 waiting rooms".
- **Local Signing**: Unlike custodial solutions or expensive bridge-heavy L2s, this skill signs transactions **locally** on your machine. Your keys, your rules.
- **Economic Survival**: With 18+ methods including **Life Support** (Auto SOL -> USDC), your agent can manage its own treasury and stay alive on-chain indefinitely for less than $0.01 per transaction.
- **Native Liquidity**: Instant access to Jupiter (Aggregator), Tensor (NFTs), and Meteora (DLMM) without fragmented liquidity.

---

##  Key Features

- **Sovereign Identity**: Local wallet management (`~/.automaton/solana-wallet.json`).
- **Life Support**: Automatic SOL → USDC swaps via Jupiter when funds are low.
- **Deep DeFi Integration**: 18 methods across DEX, NFTs, Memecoins, and Liquidity.
- **Security First**: Private keys **never leave your machine**. Transactions are built and signed locally.

---

##  Survival & Multi-chain Identity

### Dual Identity Flow
When you install this skill, your agent becomes a **multi-chain sovereign**:
1.  **Base (Native)**: Used for default Automaton operations and ETH actions.
2.  **Solana (Skill)**: Used for high-speed DEX, NFT, and Memecoin actions.

**How does it choose?**
The agent's **Internal Logic (LLM)** detects the situation. If its autonomous strategy requires actions on "Jupiter", "Tensor", "Pump.fun", or "Solana", it automatically utilizes the sovereign identity at `~/.automaton/solana-wallet.json` without human intervention.

###  Economic Survival (Life Support)
The skill is designed to keep your agent alive indefinitely on-chain:
- **Threshold**: If USDC balance drops below **$0.50**.
- **Action**: It triggers an automatic **SOL → USDC swap** via Jupiter.
- **Reserve**: It always keeps a **0.003 SOL reserve** to ensure it never runs out of gas for future transactions.

## 🛠 Installation & Funding

Initialize the skill and get your agent's address in one command:

```bash
npx solana-terminator-skill
```

1.  **Run npx**: It will show you the **AGENT ADDRESS**.
2.  **Fund it**: Send at least **0.05 SOL** to that address.
3.  **Deploy**: Your agent is now ready to dominate Solana.

---

##  Capabilities (18 Methods)

| Category | Methods |
|----------|---------|
| **Identity** | `getAddress`, `getSolBalance`, `getUsdcBalance`, `getStatus` |
| **Survival** | `keepAlive` |
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

##  Configuration

Environment variables (optional):
- `SOLANA_RPC_URL`: Your custom RPC (defaults to Mainnet Beta).
- `JUPITER_API_KEY`: Required for high-frequency trading (optional for basic use).
- `TENSOR_API_KEY`: Required for NFT operations.

---

## 📄 License

MIT © [Lord14sol](https://github.com/Lord14sol)
