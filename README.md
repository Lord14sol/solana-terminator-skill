# P.R.E.D.A.T.O.R. Sovereign Commercial Brain (v4.9.0)

In Web 4.0, if an agent does not generate value, it does not exist.

P.R.E.D.A.T.O.R. (Passive Revenue Ecosystem and Deployment of Autonomous Tactical Operations Radar) is a Sovereign Commercial Automaton designed to live on the Solana blockchain and harvest profit for its Master Creator. It operates as a native skill within the Conway Research Automaton ecosystem.

## Full Tactical Arsenal (v4.9.0)

The v4.9.0 release consolidates several high-fidelity modules into a single unified execution engine:

- DEX Engine: Optimized swaps via Jupiter V6 and Raydium V2 (CLMM/AMM).
- NFT Engine: Professional sniping and floor-sweeping via Tensor.
- LP Engine: Yield generation and liquidity management via Meteora DLMM.
- Pump Scanner: Real-time transmission monitoring via PumpPortal.
- Audit Engine: 0-100 security scoring via Birdeye Pro Intelligence.

## Core Functionality

The engine is governed by 

1. Sovereign Identity: The agent generates and manages its own unique Solana identity (wallet) located at ~/.automaton/solana-wallet.json.
2. Tactical Metabolism: The engine autonomously manages its own fuel (SOL) and operating capital (USDC) to ensure 100% uptime.
3. Exceed Profit Protocol: Every cent of profit exceeding the survival threshold is automatically harvested and redirected to the designated Master Vault.
4. Rug-Resilience: Automated audit loops filter out malicious tokens and risky pools using real-time security data.

## Deployment and Setup

The engine is distributed via NPX for instant deployment within any standard terminal environment.

### 1. Initialization
Run the following command to deploy the P.R.E.D.A.T.O.R. core files and initialize the Sovereign Identity.

```bash
npx clear-npx-cache
npx solana-terminator-skill@latest
```

### 2. Configuration
Follow the interactive menu to finalize the setup:
- Initialize Sovereign Identity: Create and encrypt the agent wallet.
- Designate Master Vault: Set the Solana address where excess profits will be sent.
- Configure Pro Intel: (Optional) Input your Birdeye API key for enhanced security audits.
- Set Tactical RPC Uplink: (Optional) Provide a custom Solana RPC URL for faster transaction confirmation.

### 3. Monitoring
Launch the Tactical Radar to monitor the neural state and market surveillance in real-time.

```bash
npx solana-terminator-skill radar
```

## Environment Variables

For advanced configurations, the following environment variables can be set:
- MASTER_WALLET: The recipient address for the Exceed Profit protocol.
- BIRDEYE_API_KEY: Required for professional security auditing.
- TENSOR_API_KEY: Required for NFT-based sniping operations.
- SOLANA_RPC_URL: Custom endpoint for blockchain interaction.

## Hardened Architecture

- Null-Safe RPC Logic: Prevents false trades by returning null on network errors.
- Shell-Safe Execution: DEP0190 compliant process spawning via process.execPath.
- TTY Pinning: Asynchronous input isolation for terminal UI stability.

---

Built for the Conway Research Automaton ecosystem.
All operations are executed on the Solana Mainnet.
Use with caution.
