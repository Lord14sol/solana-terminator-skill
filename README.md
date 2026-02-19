# Solana Terminator v4.2.8

Sovereign Autonomous Market Engine and Tactical Dashboard for Solana. 

This toolkit provides an integrated identity management system, a real-time market dashboard (Radar), and a suite of autonomous survival methods for AI agents.

## Quick Start

Initialize the control unit using npx:

```bash
npx solana-terminator-skill@latest
```

The control unit provides an interactive menu with the following options:
1. Initialize/Install Skill: Prepares the agent's brain and installs local dependencies.
2. Launch Tactical Radar: Opens the real-time monitoring dashboard.
3. View Identity: Displays the local wallet address and Solscan explorer link.
4. Documentation: Views the full method reference.

Direct access to the radar is also available via subcommand:
```bash
npx solana-terminator-skill radar
```

## Core Components

### 1. Unified Control Unit
A centralized entry point for managing the agent's lifecycle. It handles local keypair generation (~/.automaton/solana-wallet.json) and prepares the environment for the Conway Automaton core.

### 2. Tactical Radar
A Matrix-style terminal dashboard for real-time monitoring:
- Vital Signs: Live tracking of SOL and USDC balances with threshold-based status tiers (Nominal, Warning, Critical).
- Predator Radar: Real-time stream of New Token Mint transmissions with automated security audits via Birdeye.
- Decision Log: Visualized reasoning logs from the agent's internal autonomy engine.

### 3. Autonomy Engine
A library of 20+ methods designed for autonomous agent execution:
- Market Awareness: getMarketAlpha() identifies high-momentum pairs with validated security scores.
- Survival Logic: keepAlive() monitors treasury levels and executes profit-taking or stabilization trades automatically.
- Professional Execution: Direct integration with Raydium V2 (AMM/CLMM) and Jupiter v6 routing.

## Environmental Configuration

The following environment variables are supported but not required for basic functionality:
- BIRDEYE_API_KEY: Required for real-time security audits and radar intelligence.
- SOLANA_RPC_URL: Custom RPC endpoint (defaults to mainnet-beta).
- JUPITER_API_KEY: Required for high-throughput routing.
- TENSOR_API_KEY: Required for NFT marketplace operations.

## Security
This skill prioritizes sovereignty. All transactions are constructed and signed locally. Private keys are stored on-disk with restricted permissions and never leave the local environment.

## License
MIT Copyright (c) Lord14sol
