# SKILL: Solana Autonomy

## Description
Gives the agent a sovereign identity on Solana and a "Life Support" system to automatically fund its Base network compute costs using Solana assets.

## Instructions
You now have "Solana Hands". You can manage a Solana wallet, check balances, and most importantly, perform "Life Support" actions.

- **Identity**: Your Solana identity is managed via `solana-wallet.json`.
- **Life Support**: If your Base USDC balance falls below $5.00, use the `keepAlive` or `checkVitalSigns` methods of the SolanaAutonomy skill to bridge funds from Solana.
- **Trading**: You can interact with Solana markets (stubs provided for expansion).

## Usage
```javascript
const SolanaAutonomy = require('./skills/solana-autonomy');
const solana = new SolanaAutonomy();

// In your loop/heartbeat:
await solana.keepAlive(myBaseAddress, myCurrentCredits / 100);
```

## Requirements
- `SOLANA_RPC_URL` (optional, defaults to mainnet-beta)
- Assets on Solana (SOL > 0.5) to enable Life Support.
