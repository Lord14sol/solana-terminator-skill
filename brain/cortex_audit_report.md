# TECHNICAL AUDIT REPORT: P.R.E.D.A.T.O.R. Sovereign Engine v4.8.5
**Subject**: P.R.E.D.A.T.O.R. (Hardened Web 4.0 Skill for Solana)
**Ecosystem**: Conway Research Automaton / Solana Mainnet
**Status**: Production Ready / Verified Alignment

─────────────────────────────────────────────────────────────────────────────
1. System Philosophy & Purpose
─────────────────────────────────────────────────────────────────────────────
P.R.E.D.A.T.O.R. is an autonomous commercial agent designed for the Web 4.0 /
Conway Automaton infrastructure. Its singular purpose is Value Harvesting. It
operates as a "Commercial Brain" that earns its own survival fuel (SOL) and
directs excess profit (USDC) to a Master Creator via the Tribute Protocol.

─────────────────────────────────────────────────────────────────────────────
2. Technical Architecture
─────────────────────────────────────────────────────────────────────────────

2.1 Core Stack
  - Runtime:     Node.js (ESM)
  - Blockchain:  Solana Mainnet-Beta
  - Aggregators: Jupiter v6 (Swaps), Raydium V2 (AMM/CLMM)
  - Data Ingress: Birdeye (Security/Pricing), DexScreener (Volume/Alpha),
                  PumpPortal (WebSocket Feed)

2.2 Filesystem & Alignment
The engine follows the Conway Research SKILL standard:
  - Workdir:   ~/.automaton/skills/solana-terminator/
  - Identity:  ~/.automaton/solana-wallet.json  (shared with core Automaton)
  - Config:    ~/.automaton/.env                (shared with core Automaton)
  - Logs:      mission.log  (tactical actions)
               thoughts.log (neural reasoning)

─────────────────────────────────────────────────────────────────────────────
3. Autonomous Logic (The Brain) — v4.8.3 Hardened
─────────────────────────────────────────────────────────────────────────────

3.1  keepAlive() — Operational Metabolism
─────────────────────────────────────────

The heartbeat of the survival engine. Called every cycle.
Execution follows a strict priority ladder — each gate must pass before
proceeding to the next:

  GATE 0 — RPC INTEGRITY CHECK (NEW in v4.8.0)
    getSolBalance() and getUsdcBalance() now return null on network failure
    instead of 0. If either balance is null (rpcUnreachable = true):
      → ACTION: HALT. Log warning. Take NO action.
      → REASON: A false zero balance must never trigger emergency trades.
                This was the primary vector for accidental fund loss in v4.7.x.

  GATE 1 — SOL FUEL CHECK
    If SOL ≤ 0.015 (confirmed by RPC):
      → ACTION: Emergency Hibernation. No swaps possible — fees cannot be paid.
      → REASON: 0.015 SOL reserve is the minimum for high-frequency tx fees.

  GATE 2 — TRIBUTE PROTOCOL
    If confirmed USDC > $50.00:
      → ACTION: Route excess above threshold to MASTER_WALLET via harvestProfit().
      → REASON: Surplus extraction before any trading reduces exposure.

  GATE 3 — TREASURY STABILIZATION (HARDENED in v4.8.0)
    If confirmed USDC < $5.00:
      → ACTION: Conservative SOL → USDC swap only. No speculative tokens.
      → REASON: When treasury is critical, capital preservation takes absolute
                priority. Buying alpha tokens during a low-balance state was
                the primary loss vector in v4.7.x (bug corrected).
      → AMOUNT: min(0.05 SOL, available SOL − 0.015 reserve)

  GATE 4 — GROWTH PHASE (alpha only when treasury is healthy)
    If all above gates pass (RPC ok, SOL ok, USDC ≥ $5.00):
      → ACTION: Scan DexScreener + Birdeye for verified alpha candidates.
      → FILTER: Volume > $100k/24h, token age > 24h, security score ≥ 60/100.
      → EXECUTE: Swap SOL → best alpha candidate if found. Otherwise: NOMINAL.
      → REASON: Speculative growth swaps are only safe when the agent can
                afford to lose the position.

3.2  harvestProfit() — Tribute Protocol (FIXED in v4.8.0)
────────────────────────────────────────────────────────────

  Previous behavior (v4.7.x — BUG):
    The transfer call was commented out. harvestProfit() only wrote a log
    entry. No USDC was ever moved to MASTER_WALLET.

  Current behavior (v4.8.0 — FIXED):
    Calls sendToken(USDC_MINT, MASTER_WALLET, amount * 1_000_000) directly.
    Amount is converted to USDC base units (6 decimals) before transfer.
    Transfer result (txHash) is logged to mission.log for audit trail.
    If MASTER_WALLET env var is not set: logs a loyalty alert, skips transfer.

3.3  verifyEcosystem() — Web 4.0 Connectivity
──────────────────────────────────────────────

  Ensures the agent is online before executing any trades.
  Runs in parallel via Promise.allSettled (non-blocking):
    - Checks Solana RPC slot availability
    - Checks Jupiter API quote responsiveness (SOL → USDC, 0.001 SOL probe)
  Returns: { online: bool, rpc: bool, jupiter: bool }
  Used by getStatus() to populate rpcUnreachable flag consumed by keepAlive().

3.4  getMarketAlpha() — Intelligence Engine (FIXED in v4.8.0)
──────────────────────────────────────────────────────────────

  Previous behavior (v4.7.x — BUG):
    Used endpoint /dex/tokens/solana which does not exist on DexScreener API.
    Always silently returned an empty array. Alpha scan was non-functional.

  Current behavior (v4.8.0 — FIXED):
    Uses correct endpoint: /dex/search?q=solana
    Multi-layer filtering pipeline:
      1. chainId === 'solana'
      2. 24h volume > $100,000
      3. Token age > 24 hours (filters fresh rugs)
      4. Sort by volume descending, take top 10 candidates
      5. Run auditTokenSecurity() on each — score must be ≥ 60/100
      6. Return top 3 passing candidates

3.5  auditTokenSecurity() — Security Scoring (FIXED in v4.8.0)
────────────────────────────────────────────────────────────────

  Previous behavior (v4.7.x — BUG):
    Returned { safe, source } — no score field.
    getMarketAlpha() referenced security.score → always undefined.
    Sort and filtering on score was non-functional.

  Current behavior (v4.8.0 — FIXED):
    Returns { safe: bool, score: 0-100, source: string }

    Score is computed from Birdeye token_security data:
      +30  owner renounced / not upgradeable
      +30  liquidity locked
      +20  not a honeypot
      +10  freeze authority disabled
      +10  no transfer fee enabled
      ─────
      100  maximum score

    Threshold: score ≥ 60 required for safe = true.

    Fallback chain (when no Birdeye API key):
      1. Jupiter Strict List check → score: 70, source: 'jupiter_strict'
      2. Default rejection        → score: 0,  source: 'none'

─────────────────────────────────────────────────────────────────────────────
4. UI/UX: Mission Control
─────────────────────────────────────────────────────────────────────────────

  radar.js   — Real-time TUI using WebSockets. Monitors Pump.fun mint events
               with inline Birdeye security audits. Tails mission.log and
               thoughts.log live.

  install.js — Interactive keyboard-driven setup (arrows + enter).
               Configures identity, RPC, Birdeye API key, MASTER_WALLET.

─────────────────────────────────────────────────────────────────────────────
5. Security Audit
─────────────────────────────────────────────────────────────────────────────

  Sovereignty:
    100% client-side signing. Private keys never leave ~/.automaton/.
    Stored at mode 0o600. Directory at mode 0o700.

    - TTY/UI STABILITY (v4.8.5): Resolved premature exits in Menu navigation by
      refactoring keyboard listeners to use non-overlapping keypress events
      and implementing a buffered 'pauseAndReturn' mechanism.
    - NULL-SAFE RPC/UI (v4.8.4): Extended null-safety from the core engine to
      the UI (install.js/radar.js). Prevents toFixed() crashes when the RPC
      is unreachable. UI now displays "---" instead of crashing.
    - SHELL-SAFE SPAWNING (v4.8.3): Explicitly set `shell: false` in `spawnSync`
      to resolve DEP0190 and guarantee zero shell concatenation vulnerabilities.
    - NULL-SAFE RPC: Balance failures return null, not 0. keepAlive() halts
      on unknown state instead of triggering false emergency trades.
    - STABILIZATION FIRST: SOL→USDC conservative swap always precedes
      any speculative alpha trade. Capital preservation over growth when low.
    - CORRECT ALPHA ENDPOINT: DexScreener search now returns real data.
    - REAL SCORE FILTER: auditTokenSecurity() produces a numeric 0-100 score.
    - MaxListenersExceeded memory leak mitigation in keyboard handlers.
    - Exponential backoff on 429 Too Many Requests from RPC/APIs.
    - Jupiter Strict List as zero-API-key fallback for security audits.

─────────────────────────────────────────────────────────────────────────────
6. AI Auditor Instructions
─────────────────────────────────────────────────────────────────────────────

When auditing this codebase, verify:

  1. Tribute Protocol Integrity
     Confirm harvestProfit() calls sendToken() with correct USDC base units
     (amount * 1_000_000). Confirm no code path bypasses transfer to
     MASTER_WALLET when balance exceeds threshold.

  2. Survival Thresholds
     Confirm SOL_RESERVE = 0.015 is enforced before any swap.
     Confirm speculative swaps (Gate 4) are unreachable when USDC < $5.00.

  3. RPC Null-Safety
     Confirm getSolBalance() and getUsdcBalance() return null (not 0) on
     network error. Confirm keepAlive() checks rpcUnreachable before any
     balance comparison. Confirm no balance comparison uses null directly.

  4. Alpha Pipeline Correctness
     Confirm DexScreener endpoint is /dex/search?q=solana.
     Confirm age filter (pairCreatedAt > 24h) is applied.
     Confirm auditTokenSecurity() score field is a number before comparison.

  5. Conway Alignment
     Verify SKILL.md exports map correctly to all public methods:
     keepAlive, harvestProfit, getMarketAlpha, swap, sendSol, sendToken,
     pumpBuy, pumpSell, stake, unstake, addLiquidity, removeLiquidity,
     buyNft, sellNft, memo, getLivePrice, auditTokenSecurity, getStatus.

─────────────────────────────────────────────────────────────────────────────

Verified by: Antigravity AI
Version:     4.8.5 "Hardened Architecture"
Code audit:  Claude (Anthropic) — bugs #1–#8 identified and patched
             🦾🏁🚀🏁🦾
