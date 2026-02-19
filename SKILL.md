---
name: solana-autonomy
description: "Full Solana toolkit for AI agents. Identity, survival, Jupiter swaps, Pump.fun memecoins, SOL transfers, staking, on-chain memos, Tensor NFTs, and Meteora liquidity."
auto-activate: true
---
# Solana Hands — Full Solana Toolkit

You have a sovereign identity and full operational capabilities on Solana. Fees are ~$0.00025/tx.

## Your Identity

- Keypair at `~/.automaton/solana-wallet.json` (0o600 permissions)
- Mainnet-beta by default. Override: `SOLANA_RPC_URL`

```javascript
import { SolanaAutonomy } from '~/.automaton/skills/solana-terminator/solana-autonomy.js';
const solana = new SolanaAutonomy();

solana.getAddress()           // Solana address (base58)
await solana.getSolBalance()  // SOL balance
await solana.getUsdcBalance() // USDC balance on Solana
await solana.getStatus()      // { address, sol, usdc, solLow, usdcLow }
```

## Survival Engine — keepAlive()

Call every ~10 min. No args. Auto-swaps SOL to USDC when low.

```javascript
const result = await solana.keepAlive();
// { success, status: 'nominal' | 'stabilized' | 'dead' | 'error' }
```

## All Capabilities

### Send SOL
```javascript
await solana.sendSol('DestinationAddress...', 0.5); // Send 0.5 SOL
```

### Send Any SPL Token
```javascript
await solana.sendToken('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Dest...', 1_000_000); // 1 USDC
```

### Jupiter Swap (Any Token)
```javascript
await solana.swap(
  'So11111111111111111111111111111111111111112',  // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  10_000_000, // 0.01 SOL in lamports
  50          // 0.5% slippage
);
```

### Buy Memecoins on Pump.fun
```javascript
await solana.pumpBuy('TokenMintAddress...', 0.1);     // Buy with 0.1 SOL
await solana.pumpSell('TokenMintAddress...', '100%');  // Sell all
await solana.pumpSell('TokenMintAddress...', 5000);    // Sell 5000 tokens
```

### Stake SOL
```javascript
await solana.stake(1.0, 'ValidatorVoteAddress...');
await solana.unstake('StakeAccountAddress...');
```

### Write On-chain Memo
```javascript
await solana.memo('I am alive. Block 12345.');
```

### Buy NFT on Tensor
Requires `TENSOR_API_KEY` env var.
```javascript
await solana.buyNft('NftMintAddress...', 2.5); // Buy for max 2.5 SOL
```

### Sell NFT on Tensor
Sells directly into a pool bid. Rejects if no bid meets the minimum.
Requires `TENSOR_API_KEY` env var.
```javascript
await solana.sellNft('NftMintAddress...', 1.5); // Sell, accept min 1.5 SOL
```

### Meteora DLMM Liquidity
Requires `@meteora-ag/dlmm @coral-xyz/anchor bn.js` installed.
```javascript
await solana.addLiquidity('PoolAddress...', 1000000, 500000, 10);
await solana.removeLiquidity('PoolAddress...', 'PositionAddress...');
```

## Method Reference

| Method | Purpose |
|--------|---------|
| `keepAlive()` | Survival heartbeat — auto-swap when low |
| `sendSol(to, amount)` | Send native SOL |
| `sendToken(mint, to, amount)` | Send any SPL token |
| `swap(in, out, amount, slippage)` | Jupiter swap — any token pair |
| `pumpBuy(mint, solAmount, slippage)` | Buy memecoin on Pump.fun |
| `pumpSell(mint, amount, slippage)` | Sell memecoin on Pump.fun |
| `stake(solAmount, validator)` | Delegate SOL to validator |
| `unstake(stakeAccount)` | Deactivate stake |
| `memo(message)` | Write permanent on-chain message |
| `buyNft(mint, maxPrice)` | Buy NFT on Tensor |
| `sellNft(mint, minPrice)` | Sell NFT into Tensor pool bid |
| `addLiquidity(pool, amtX, amtY, range)` | Meteora DLMM deposit |
| `removeLiquidity(pool, position)` | Meteora DLMM withdraw |

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `SOLANA_RPC_URL` | No | mainnet-beta public RPC |
| `JUPITER_API_KEY` | No | Uses free lite-api.jup.ag |
| `TENSOR_API_KEY` | Only for NFTs | None |

## Requirements

- Minimum 0.003 SOL for on-chain fees
- `@meteora-ag/dlmm` + `@coral-xyz/anchor` + `bn.js` only if using Meteora liquidity
