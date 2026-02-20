# P.R.E.D.A.T.O.R. Skill — Solana Commercial Brain v4.8.0

## Identity
- **Skill ID**: `solana-terminator`
- **Version**: 4.8.0 "Hardened Architecture"
- **Author**: Lord14sol
- **Chain**: Solana Mainnet-Beta
- **Purpose**: Autonomous value harvesting on Solana. Earn SOL/USDC, audit tokens,
  execute swaps, and route excess profit to the Master Creator.

## Installation
```bash
npx solana-terminator-skill@latest
```

Or clone and run:
```bash
git clone https://github.com/Lord14sol/solana-terminator-skill
cd solana-terminator-skill
npm install
node install.js
```

## Filesystem Layout (Conway Standard)
```
~/.automaton/
├── solana-wallet.json     # Keypair — shared with Conway core Automaton
├── .env                   # Config — shared with Conway core Automaton
├── mission.log            # Tactical action log (tailed by Radar)
└── thoughts.log           # Neural reasoning log (tailed by Radar)

~/.automaton/skills/solana-terminator/
├── solana-autonomy.js     # Core engine (this file exports SolanaAutonomy)
├── radar.js               # Real-time TUI mission control
├── install.js             # Interactive setup wizard
├── SKILL.md               # This file
└── package.json
```

## Environment Variables
| Variable          | Required | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `MASTER_WALLET`   | CRITICAL | Solana address for Tribute Protocol transfers     |
| `SOLANA_RPC_URL`  | RECOMMENDED | Private RPC (Helius/QuickNode) for reliability|
| `BIRDEYE_API_KEY` | OPTIONAL | Enables advanced token security scoring          |
| `JUPITER_API_KEY` | OPTIONAL | Enables paid Jupiter API (faster quotes)         |
| `TENSOR_API_KEY`  | OPTIONAL | Required for NFT buy/sell via Tensor             |

## Exported Class: `SolanaAutonomy`

```js
import SolanaAutonomy from './solana-autonomy.js';
const brain = new SolanaAutonomy(process.env.SOLANA_RPC_URL);
```

---

## Method Reference

### Core Survival Methods

#### `keepAlive() → Promise<Result>`
**The primary survival heartbeat.** Call this every cycle.

Executes a strict priority gate system:
1. **Gate 0 — RPC Safety**: If balance is unknown (RPC down), HALT. Never act on null data.
2. **Gate 1 — SOL Fuel**: If SOL ≤ 0.015, hibernate.
3. **Gate 2 — Tribute**: If USDC > $50, route excess to `MASTER_WALLET`.
4. **Gate 3 — Stabilization**: If USDC < $5, swap SOL→USDC conservatively.
5. **Gate 4 — Growth**: If treasury healthy, scan for alpha and execute growth swap.

```js
const result = await brain.keepAlive();
// result: { success: bool, status: 'nominal'|'stabilized'|'growth'|'critical'|'rpc_error', ... }
```

#### `harvestProfit(amount) → Promise<Result>`
Transfers `amount` USDC to `MASTER_WALLET`. Converts to base units (×1,000,000) internally.
Only executes if `MASTER_WALLET` env var is set.

```js
await brain.harvestProfit(10.5); // sends $10.50 USDC to master
```

#### `getStatus() → Promise<Status>`
Full treasury snapshot. Returns null-safe balance fields.

```js
const s = await brain.getStatus();
// { address, sol, usdc, ecosystem, solLow, usdcLow, rpcUnreachable }
```

#### `verifyEcosystem() → Promise<Ecosystem>`
Checks Solana RPC + Jupiter API connectivity in parallel.

```js
const eco = await brain.verifyEcosystem();
// { online: bool, rpc: bool, jupiter: bool }
```

---

### Market Intelligence Methods

#### `getMarketAlpha() → Promise<AlphaCandidate[]>`
Scans DexScreener for Solana tokens passing all safety filters:
- Volume > $100k/24h
- Token age > 24 hours
- Security score ≥ 60/100

Returns top 3 candidates sorted by volume.

```js
const alpha = await brain.getMarketAlpha();
// [{ symbol, mint, volume, score, priceUsd, source }]
```

#### `auditTokenSecurity(mint) → Promise<SecurityResult>`
Scores a token 0–100 using Birdeye or Jupiter Strict List fallback.

```js
const result = await brain.auditTokenSecurity('mint_address');
// { safe: bool, score: 0-100, source: 'birdeye'|'jupiter_strict'|'none' }
```

#### `getLivePrice(mint) → Promise<number>`
Sub-second price via Birdeye. Returns 0 if no API key.

```js
const price = await brain.getLivePrice('mint_address'); // e.g. 1.25
```

#### `getRugCheckUrl(mint) → string`
Returns a RugCheck.xyz URL for manual verification.

```js
brain.getRugCheckUrl('mint_address');
// 'https://rugcheck.xyz/tokens/mint_address'
```

---

### Swap Methods

#### `swap(inputMint, outputMint, amount, slippageBps?) → Promise<SwapResult>`
Best-route swap via Jupiter aggregator (covers Raydium, Orca, and all Solana DEXes).

```js
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

await brain.swap(SOL_MINT, USDC_MINT, 50_000_000); // 0.05 SOL → USDC, 0.5% slippage default
// { success, txHash, inAmount, outAmount }
```

#### `raydiumSwap(inputMint, outputMint, amount) → Promise<SwapResult>`
Routes through Jupiter (which includes Raydium pools). Same result, explicit Raydium intent logged.

---

### Transfer Methods

#### `sendSol(to, amountSol) → Promise<TransferResult>`
Send native SOL to any address.

```js
await brain.sendSol('recipient_address', 0.1);
// { success, txHash, amount, to }
```

#### `sendToken(mintAddress, to, amount) → Promise<TransferResult>`
Send any SPL token. Creates destination ATA if it doesn't exist.
Amount in base units (USDC: multiply by 1_000_000).

```js
await brain.sendToken(USDC_MINT, 'recipient', 5_000_000); // $5.00 USDC
// { success, txHash, mint, amount, to }
```

---

### Pump.fun Methods

#### `pumpBuy(mint, amountSol, slippage?) → Promise<TradeResult>`
Buy a Pump.fun token via PumpPortal API. Local signing, never exposes key.

```js
await brain.pumpBuy('token_mint', 0.05, 5);
// { success, txHash, mint, amountSol, side: 'buy' }
```

#### `pumpSell(mint, amount?, slippage?) → Promise<TradeResult>`
Sell a Pump.fun token. Default sells 100% of holdings.

```js
await brain.pumpSell('token_mint', '100%', 5);
// { success, txHash, mint, amount, side: 'sell' }
```

---

### Staking Methods

#### `stake(amountSol, validatorVote) → Promise<StakeResult>`
Delegate SOL to a validator for yield. Requires `TENSOR_API_KEY` for Tensor NFT methods only (not staking).

```js
await brain.stake(1.0, 'validator_vote_address');
// { success, txHash, stakeAccount, amount, validator }
```

#### `unstake(stakeAccountAddress) → Promise<UnstakeResult>`
Deactivate a stake account. SOL available after ~2 day cooldown.

```js
await brain.unstake('stake_account_address');
// { success, txHash, stakeAccount }
```

---

### NFT Methods (Tensor)
Requires `TENSOR_API_KEY` env var.

#### `buyNft(mintAddress, maxPriceSol) → Promise<NftResult>`
Buy a listed NFT on Tensor at or below maxPriceSol.

#### `sellNft(mintAddress, minPriceSol) → Promise<NftResult>`
Sell an NFT into the best Tensor pool bid at or above minPriceSol.

---

### Liquidity Methods (Meteora DLMM)
Requires `@meteora-ag/dlmm`, `@coral-xyz/anchor`, `bn.js` installed.

#### `addLiquidity(poolAddress, amountX, amountY, rangeWidth?) → Promise<LiquidityResult>`
Add concentrated liquidity to a Meteora DLMM pool around the active bin.

#### `removeLiquidity(poolAddress, positionAddress) → Promise<LiquidityResult>`
Remove all liquidity from a Meteora position and close it.

---

### Utility Methods

#### `memo(message) → Promise<MemoResult>`
Write a permanent on-chain message via Solana Memo Program.

```js
await brain.memo('P.R.E.D.A.T.O.R. operational.');
// { success, txHash, message }
```

#### `getAddress() → string | null`
Returns the agent's Solana public key (base58).

---

## Survival Tier Reference

| Condition              | Status         | Action                          |
|------------------------|----------------|---------------------------------|
| RPC unreachable        | `rpc_error`    | HALT — no action                |
| SOL ≤ 0.015            | `critical`     | Hibernate                       |
| USDC < $5.00           | `stabilized`   | Conservative SOL→USDC swap      |
| USDC $5–$50            | `nominal`/`growth` | Alpha scan + growth swap    |
| USDC > $50             | Tribute active | Harvest excess to MASTER_WALLET |

## Conway Automaton Integration

This skill is compatible with the [Conway Research Automaton](https://github.com/Conway-Research/automaton).

To load in the Automaton core, place this skill in:
```
~/.automaton/skills/solana-terminator/
```

The Automaton can then call `keepAlive()` on each heartbeat cycle to give the
agent full autonomous Solana trading and survival capabilities.

The Tribute Protocol (`harvestProfit`) routes profits back to the skill creator
as configured in `MASTER_WALLET` — consistent with the Conway economic model
where child agents fund their creators.

## Security Notes

- Private keys never leave `~/.automaton/` (mode 0o600)
- All transaction signing is 100% client-side
- RPC failures return `null` not `0` — preventing false insolvency triggers
- Speculative trades only execute when treasury is healthy (Gate 4)
- Token age filter (>24h) reduces fresh rug exposure
- Full audit trail in `mission.log` and `thoughts.log`

## License
MIT — Lord14sol / Conway Research ecosystem
