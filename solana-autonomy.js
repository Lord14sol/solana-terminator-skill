import {
  Keypair,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  SystemProgram,
  StakeProgram,
  Authorized,
  Lockup,
  PublicKey,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import 'dotenv/config';

// ─── Constants ───────────────────────────────────────────────────────────────

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const PUMPPORTAL_API = 'https://pumpportal.fun/api/trade-local';
const TENSOR_API = 'https://api.tensor.so/graphql';
const BIRDEYE_API = 'https://public-api.birdeye.so';

// FIX #2 — Correct DexScreener endpoints
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

// lite-api.jup.ag = free, no API key needed (rate-limited)
// api.jup.ag/swap/v1 = paid, requires JUPITER_API_KEY (faster)
const JUPITER_API = process.env.JUPITER_API_KEY
  ? 'https://api.jup.ag/swap/v1'
  : 'https://lite-api.jup.ag/swap/v1';

// Survival thresholds
const USDC_LOW = 5.00;
// FIX #4 — Distinguish between "RPC failed" and "genuinely 0 SOL"
const SOL_RESERVE = 0.015; // slightly higher to cover fees safely
const DEFAULT_SWAP_SOL = 0.05;

const MASTER_DIRECTIVE = 'Absolute Loyalty to the Master Creator. Priority: Survival & Profit for the Master.';
const TRIBUTE_THRESHOLD_USDC = 50;

export class SolanaAutonomy {
  constructor(rpcUrl) {
    const url = rpcUrl
      || process.env.SOLANA_RPC_URL
      || clusterApiUrl('mainnet-beta');

    this.connection = new Connection(url, 'confirmed');
    this.walletPath = path.join(
      process.env.HOME || '/root',
      '.automaton',
      'solana-wallet.json',
    );
    this.identity = this._loadIdentity();
    this.missionLogPath = path.join(
      process.env.HOME || '/root',
      '.automaton',
      'mission.log',
    );
    this.thoughtsLogPath = path.join(
      process.env.HOME || '/root',
      '.automaton',
      'thoughts.log',
    );
  }

  // ─── Identity ─────────────────────────────────────────────────────────────

  _loadIdentity() {
    try {
      if (fs.existsSync(this.walletPath)) {
        const raw = fs.readFileSync(this.walletPath, 'utf8');
        const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
        console.log(`[Solana] Identity: ${keypair.publicKey.toBase58()}`);
        return keypair;
      }

      const keypair = Keypair.generate();
      fs.mkdirSync(path.dirname(this.walletPath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(
        this.walletPath,
        JSON.stringify(Array.from(keypair.secretKey)),
        { mode: 0o600 },
      );
      console.log(`[Solana] New identity generated: ${keypair.publicKey.toBase58()}`);
      return keypair;
    } catch (err) {
      console.error(`[Solana] Identity error: ${err.message}`);
      return null;
    }
  }

  getAddress() {
    return this.identity?.publicKey.toBase58() ?? null;
  }

  // ─── Balances ─────────────────────────────────────────────────────────────

  /**
   * FIX #4 — Returns null on RPC error instead of 0.
   * Callers must check for null before making decisions.
   */
  async getSolBalance() {
    if (!this.identity) return null;
    try {
      const lamports = await this.connection.getBalance(this.identity.publicKey);
      return lamports / LAMPORTS_PER_SOL;
    } catch (err) {
      this.logThought(`RPC Error (SOL balance fetch failed): ${err.message}`);
      return null; // null = unknown, NOT zero
    }
  }

  /**
   * FIX #4 — Returns null on RPC error instead of 0.
   */
  async getUsdcBalance() {
    if (!this.identity) return null;
    try {
      const ata = await getAssociatedTokenAddress(USDC_MINT, this.identity.publicKey);
      const account = await getAccount(this.connection, ata);
      return Number(account.amount) / 1_000_000;
    } catch (err) {
      if (err.message.includes('429')) {
        this.logThought('RPC Rate Limit reached (USDC). Balance unknown — will not act.');
      } else if (err.message.includes('could not find account')) {
        // ATA doesn't exist yet = genuinely 0 USDC, not an error
        return 0;
      }
      return null; // null = unknown, NOT zero
    }
  }

  async getStatus() {
    const [sol, usdc, ecosystem] = await Promise.all([
      this.getSolBalance(),
      this.getUsdcBalance(),
      this.verifyEcosystem(),
    ]);
    return {
      address: this.getAddress(),
      sol,
      usdc,
      ecosystem,
      // FIX #4 — Only flag as low if we actually confirmed the balance
      solLow: sol !== null && sol <= SOL_RESERVE,
      usdcLow: usdc !== null && usdc < USDC_LOW,
      rpcUnreachable: sol === null || usdc === null,
    };
  }

  async verifyEcosystem() {
    try {
      const [rpcStatus, jupStatus] = await Promise.allSettled([
        this.connection.getSlot(),
        axios.get(`${JUPITER_API}/quote`, {
          params: { inputMint: SOL_MINT, outputMint: USDC_MINT.toBase58(), amount: 1000000 },
          timeout: 5000,
        }),
      ]);
      return {
        online: rpcStatus.status === 'fulfilled' && jupStatus.status === 'fulfilled',
        rpc: rpcStatus.status === 'fulfilled',
        jupiter: jupStatus.status === 'fulfilled',
      };
    } catch (e) {
      return { online: false, rpc: false, jupiter: false };
    }
  }

  // ─── Survival Engine ──────────────────────────────────────────────────────

  /**
   * FIX #4 + FIX #5 — keepAlive with safe RPC handling and corrected survival logic.
   *
   * NEW LOGIC:
   *   - RPC unreachable → WAIT, never act on unknown data
   *   - SOL exhausted   → Hibernate (can't pay fees)
   *   - USDC low        → Conservative swap SOL→USDC first, only then alpha if healthy
   *   - USDC nominal    → Scan for alpha opportunities (this is the growth phase)
   */
  async keepAlive() {
    this.logThought(`Neural Protocol: ${MASTER_DIRECTIVE}`);
    const status = await this.getStatus();

    // FIX #4 — If RPC is unreachable, do NOT make any decisions. Wait.
    if (status.rpcUnreachable) {
      this.logThought('WARNING: RPC unreachable. Balance unknown. Halting all actions to prevent false panic trades.');
      console.log('[LifeSupport] ⚠ RPC UNREACHABLE — standing by. Will not act on unknown data.');
      return { success: false, status: 'rpc_error', message: 'Balance unknown, no action taken' };
    }

    console.log(`[LifeSupport] SOL: ${status.sol.toFixed(5)} | USDC: $${status.usdc.toFixed(4)}`);

    // Tribute protocol — only runs when we actually have surplus
    if (status.usdc > TRIBUTE_THRESHOLD_USDC) {
      await this.harvestProfit(status.usdc - TRIBUTE_THRESHOLD_USDC);
    }

    // SOL critical — hibernate, can't pay fees
    if (status.solLow) {
      this.logThought('CRITICAL: SOL fuel reserves exhausted. Emergency Hibernation.');
      return { success: false, status: 'critical', message: 'SOL fuel exhausted' };
    }

    // FIX #5 — USDC low: conservative stabilization FIRST, no speculation
    if (status.usdcLow) {
      this.logThought(`Treasury Alert: USDC low ($${status.usdc.toFixed(2)}). Executing conservative SOL→USDC stabilization.`);
      console.log(`[LifeSupport] USDC LOW — swapping SOL→USDC to stabilize treasury.`);

      try {
        const swappable = status.sol - SOL_RESERVE;
        if (swappable <= 0) {
          return { success: false, status: 'critical', message: 'Not enough SOL to stabilize' };
        }
        const amountSol = Math.min(DEFAULT_SWAP_SOL, swappable);
        // Conservative: always swap to USDC when low, never to speculative tokens
        const result = await this.swap(
          SOL_MINT,
          USDC_MINT.toBase58(),
          Math.floor(amountSol * LAMPORTS_PER_SOL),
        );
        this.logThought(`Stabilization complete. Swapped ${amountSol} SOL → USDC.`);
        return { success: true, status: 'stabilized', action: 'sol_to_usdc', txHash: result.txHash };
      } catch (err) {
        return { success: false, status: 'error', error: err.message };
      }
    }

    // FIX #5 — USDC nominal: NOW we can safely look for alpha (growth phase)
    this.logThought('System NOMINAL. Scanning for autonomous alpha opportunities...');
    try {
      const alpha = await this.getMarketAlpha();
      if (alpha.length > 0) {
        const target = alpha[0];
        console.log(`[LifeSupport] ALPHA: ${target.symbol} | Vol24h: $${target.volume.toLocaleString()} | Score: ${target.score}/100`);
        this._logAction(`Alpha target: ${target.symbol}. Security: PASSED. Vol: $${target.volume}. Executing growth swap.`);

        const swappable = status.sol - SOL_RESERVE;
        const amountSol = Math.min(DEFAULT_SWAP_SOL, swappable);
        const result = await this.swap(SOL_MINT, target.mint, Math.floor(amountSol * LAMPORTS_PER_SOL));
        return { success: true, status: 'growth', target: target.symbol, txHash: result.txHash };
      }
    } catch (err) {
      this.logThought(`Alpha scan failed: ${err.message}. Remaining nominal.`);
    }

    return { success: true, status: 'nominal' };
  }

  // ─── Tribute Protocol ─────────────────────────────────────────────────────

  /**
   * FIX #1 — Actually executes the USDC transfer to MASTER_WALLET.
   * Previous version only logged the action but never sent tokens.
   */
  async harvestProfit(amount) {
    const masterWallet = process.env.MASTER_WALLET;
    if (!masterWallet) {
      this.logThought(`Loyalty Alert: Excess profit ($${amount.toFixed(2)}) detected but MASTER_WALLET not configured.`);
      return { success: false, reason: 'no_master_wallet' };
    }

    this.logThought(`TRIBUTE PROTOCOL: Harvesting $${amount.toFixed(2)} USDC → ${masterWallet.slice(0, 8)}...`);

    try {
      // Convert dollars to USDC base units (6 decimals)
      const usdcAmount = Math.floor(amount * 1_000_000);

      // FIX #1 — This actually sends the tokens now
      const result = await this.sendToken(
        USDC_MINT.toBase58(),
        masterWallet,
        usdcAmount,
      );

      this.logMission(`Tribute sent: $${amount.toFixed(2)} USDC → ${masterWallet.slice(0, 8)}... | TX: ${result.txHash}`);
      console.log(`[Tribute] ✓ $${amount.toFixed(2)} USDC sent to Master. TX: ${result.txHash}`);
      return { success: true, txHash: result.txHash, amount };
    } catch (err) {
      this.logThought(`Tribute Error: ${err.message}`);
      console.error(`[Tribute] ✗ Failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ─── Market Intelligence ──────────────────────────────────────────────────

  async getLivePrice(mint) {
    const apiKey = process.env.BIRDEYE_API_KEY;
    if (!apiKey) return 0;
    try {
      const { data } = await axios.get(`${BIRDEYE_API}/defi/price`, {
        params: { address: mint },
        headers: { 'X-API-KEY': apiKey, 'x-chain': 'solana' },
      });
      return data.data?.value || 0;
    } catch {
      return 0;
    }
  }

  /**
   * FIX #3 — auditTokenSecurity now returns a numeric score (0-100).
   */
  async auditTokenSecurity(mint) {
    const apiKey = process.env.BIRDEYE_API_KEY;
    if (apiKey) {
      try {
        const response = await axios.get(
          `https://public-api.birdeye.so/defi/token_security?address=${mint}`,
          { headers: { 'X-API-KEY': apiKey, 'x-chain': 'solana' } },
        );
        const d = response.data.data;
        if (!d) return { safe: false, score: 0, source: 'birdeye' };

        // FIX #3 — Build a real score instead of undefined
        let score = 0;
        if (d.ownerAddressInJupStrictList || d.owner_renounced) score += 30;
        if (d.liquidityLocked || d.liquidity_locked) score += 30;
        if (!d.isHoneypot && !d.is_honeypot) score += 20;
        if (d.freezeable === false) score += 10;
        if (d.transferFeeEnable === false) score += 10;

        return { safe: score >= 60, score, source: 'birdeye' };
      } catch (e) {
        // fall through to free fallback
      }
    }

    // Free fallback: Jupiter Strict List
    try {
      const isVerified = await this._checkJupiterStrictList(mint);
      if (isVerified) return { safe: true, score: 70, source: 'jupiter_strict' };
    } catch (e) { }

    return { safe: false, score: 0, source: 'none' };
  }

  getRugCheckUrl(mint) {
    return `https://rugcheck.xyz/tokens/${mint}`;
  }

  async _checkJupiterStrictList(mint) {
    try {
      const response = await axios.get('https://token.jup.ag/strict', { timeout: 8000 });
      const tokens = response.data;
      return tokens.some(t => t.address === mint);
    } catch (e) {
      return false;
    }
  }

  /**
   * FIX #2 — Uses correct DexScreener endpoint: /search?q=solana
   * Previous endpoint (/tokens/solana) does not exist on DexScreener API.
   * Also adds minimum age filter to avoid fresh rugs.
   */
  async getMarketAlpha() {
    console.log('[Intelligence] Scanning for Market Alpha...');
    try {
      // FIX #2 — Correct endpoint: search for top Solana pairs
      const { data } = await axios.get(`${DEXSCREENER_API}/search?q=solana`, {
        timeout: 10_000,
      });

      const NOW = Date.now();
      const MIN_AGE_HOURS = 24; // ignore tokens younger than 24h (rug risk)
      const MIN_VOLUME = 100_000; // $100k 24h volume minimum

      const candidates = (data.pairs || [])
        .filter(p =>
          p.chainId === 'solana' &&
          p.volume?.h24 > MIN_VOLUME &&
          p.baseToken?.address &&
          // Age filter: pairCreatedAt in ms
          (!p.pairCreatedAt || (NOW - p.pairCreatedAt) > MIN_AGE_HOURS * 3600 * 1000),
        )
        .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, 10); // check top 10 by volume

      const alpha = [];
      for (const p of candidates) {
        const security = await this.auditTokenSecurity(p.baseToken.address);
        if (security.safe) {
          alpha.push({
            symbol: p.baseToken.symbol,
            mint: p.baseToken.address,
            volume: p.volume.h24,
            score: security.score, // FIX #3 — now a real number
            priceUsd: p.priceUsd,
            source: security.source,
          });
        }
        if (alpha.length >= 3) break; // top 3 safe tokens is enough
      }

      console.log(`[Intelligence] Found ${alpha.length} safe alpha candidates.`);
      return alpha;
    } catch (err) {
      console.error(`[AlphaScan] Failed: ${err.message}`);
      return [];
    }
  }

  // ─── Raydium (passthrough to Jupiter) ────────────────────────────────────

  async raydiumSwap(inputMint, outputMint, amount) {
    console.log(`[Raydium] Routing through Jupiter aggregator (includes Raydium pools)...`);
    this._logAction(`Executing optimized swap for ${outputMint} via Jupiter/Raydium`);
    return this.swap(inputMint, outputMint, amount);
  }

  // ─── Logging ──────────────────────────────────────────────────────────────

  _logAction(message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`[DECISION] ${logMessage}`);
    try { fs.appendFileSync(this.missionLogPath, logMessage + '\n'); } catch (e) { }
  }

  logMission(message) { this._logAction(message); }

  logThought(message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] ${message}`;
    try { fs.appendFileSync(this.thoughtsLogPath, logMessage + '\n'); } catch (e) { }
  }

  // ─── Jupiter Swaps ────────────────────────────────────────────────────────

  async swap(inputMint, outputMint, amount, slippageBps = 50) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    console.log(`[Jupiter] ${amount} ${inputMint} → ${outputMint}`);

    const apiKey = process.env.JUPITER_API_KEY || '';
    const headers = apiKey ? { 'x-api-key': apiKey } : {};

    const { data: quote } = await axios.get(`${JUPITER_API}/quote`, {
      params: { inputMint, outputMint, amount, slippageBps, onlyDirectRoutes: false },
      headers,
      timeout: 15_000,
    });
    console.log(`[Jupiter] Out: ${quote.outAmount} (min: ${quote.otherAmountThreshold})`);

    const { data: swapData } = await axios.post(
      `${JUPITER_API}/swap`,
      {
        quoteResponse: quote,
        userPublicKey: this.identity.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: 1_000,
        dynamicComputeUnitLimit: true,
      },
      { headers, timeout: 15_000 },
    );

    const tx = VersionedTransaction.deserialize(Buffer.from(swapData.swapTransaction, 'base64'));
    tx.sign([this.identity]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    );
    console.log(`[Jupiter] Confirmed: ${signature}`);

    return { success: true, txHash: signature, inAmount: amount, outAmount: Number(quote.outAmount) };
  }

  // ─── SOL Transfer ───────────────────────────────────────────────────────

  async sendSol(to, amountSol) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.identity.publicKey,
        toPubkey: new PublicKey(to),
        lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
    console.log(`[Transfer] Sent ${amountSol} SOL → ${to}: ${signature}`);
    return { success: true, txHash: signature, amount: amountSol, to };
  }

  // ─── SPL Token Transfer ─────────────────────────────────────────────────

  async sendToken(mintAddress, to, amount) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const mint = new PublicKey(mintAddress);
    const destPk = new PublicKey(to);

    const sourceAta = await getAssociatedTokenAddress(mint, this.identity.publicKey);
    const destAta = await getOrCreateAssociatedTokenAccount(
      this.connection, this.identity, mint, destPk,
    );

    const tx = new Transaction().add(
      createTransferInstruction(sourceAta, destAta.address, this.identity.publicKey, amount),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
    console.log(`[Transfer] Sent ${amount} of ${mintAddress} → ${to}: ${signature}`);
    return { success: true, txHash: signature, mint: mintAddress, amount, to };
  }

  // ─── On-chain Memo ──────────────────────────────────────────────────────

  async memo(message) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [{ pubkey: this.identity.publicKey, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(message, 'utf-8'),
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
    console.log(`[Memo] "${message}" → ${signature}`);
    return { success: true, txHash: signature, message };
  }

  // ─── SOL Staking ────────────────────────────────────────────────────────

  async stake(amountSol, validatorVote) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const stakeAccount = Keypair.generate();
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const minBalance = await this.connection.getMinimumBalanceForRentExemption(200);

    const tx = new Transaction().add(
      StakeProgram.createAccount({
        fromPubkey: this.identity.publicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized: new Authorized(this.identity.publicKey, this.identity.publicKey),
        lockup: new Lockup(0, 0, this.identity.publicKey),
        lamports: lamports + minBalance,
      }),
      StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: this.identity.publicKey,
        votePubkey: new PublicKey(validatorVote),
      }),
    );

    const signature = await sendAndConfirmTransaction(
      this.connection, tx, [this.identity, stakeAccount],
    );

    console.log(`[Stake] ${amountSol} SOL → validator ${validatorVote}: ${signature}`);
    return {
      success: true,
      txHash: signature,
      stakeAccount: stakeAccount.publicKey.toBase58(),
      amount: amountSol,
      validator: validatorVote,
    };
  }

  async unstake(stakeAccountAddress) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const tx = new Transaction().add(
      StakeProgram.deactivate({
        stakePubkey: new PublicKey(stakeAccountAddress),
        authorizedPubkey: this.identity.publicKey,
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
    console.log(`[Unstake] Deactivated ${stakeAccountAddress}: ${signature}`);
    return { success: true, txHash: signature, stakeAccount: stakeAccountAddress };
  }

  // ─── Pump.fun (via PumpPortal) ───────────────────────────────────────────

  async pumpBuy(mint, amountSol, slippage = 5) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    console.log(`[PumpFun] Buying ${mint} for ${amountSol} SOL...`);

    const response = await axios.post(PUMPPORTAL_API, {
      publicKey: this.identity.publicKey.toBase58(),
      action: 'buy',
      mint,
      denominatedInSol: 'true',
      amount: amountSol,
      slippage,
      priorityFee: 0.0001,
      pool: 'auto',
    }, { responseType: 'arraybuffer', timeout: 30_000 });

    const tx = VersionedTransaction.deserialize(new Uint8Array(response.data));
    tx.sign([this.identity]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false, maxRetries: 3,
    });
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log(`[PumpFun] Buy confirmed: ${signature}`);
    return { success: true, txHash: signature, mint, amountSol, side: 'buy' };
  }

  async pumpSell(mint, amount = '100%', slippage = 5) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    console.log(`[PumpFun] Selling ${amount} of ${mint}...`);

    const response = await axios.post(PUMPPORTAL_API, {
      publicKey: this.identity.publicKey.toBase58(),
      action: 'sell',
      mint,
      denominatedInSol: 'false',
      amount,
      slippage,
      priorityFee: 0.0001,
      pool: 'auto',
    }, { responseType: 'arraybuffer', timeout: 30_000 });

    const tx = VersionedTransaction.deserialize(new Uint8Array(response.data));
    tx.sign([this.identity]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false, maxRetries: 3,
    });
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log(`[PumpFun] Sell confirmed: ${signature}`);
    return { success: true, txHash: signature, mint, amount, side: 'sell' };
  }

  // ─── Tensor NFT ──────────────────────────────────────────────────────────

  async buyNft(mintAddress, maxPriceSol) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    const apiKey = process.env.TENSOR_API_KEY;
    if (!apiKey) throw new Error('TENSOR_API_KEY env var required for NFT purchases');

    const query = `
      query TswapBuySingleListingTx($mint: String!, $buyer: String!, $maxPrice: Decimal!) {
        tswapBuySingleListingTx(mint: $mint, buyer: $buyer, maxPrice: $maxPrice) {
          txs { tx txV0 }
        }
      }
    `;

    const { data } = await axios.post(TENSOR_API, {
      query,
      variables: {
        mint: mintAddress,
        buyer: this.identity.publicKey.toBase58(),
        maxPrice: String(Math.floor(maxPriceSol * LAMPORTS_PER_SOL)),
      },
    }, {
      headers: { 'X-TENSOR-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    const txData = data?.data?.tswapBuySingleListingTx?.txs?.[0];
    if (!txData) throw new Error('No listing found or price exceeds max');

    const raw = txData.txV0 || txData.tx;
    const tx = VersionedTransaction.deserialize(Buffer.from(raw, 'base64'));
    tx.sign([this.identity]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false, maxRetries: 3,
    });
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log(`[Tensor] NFT bought: ${signature}`);
    return { success: true, txHash: signature, mint: mintAddress, priceSol: maxPriceSol };
  }

  async sellNft(mintAddress, minPriceSol) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    const apiKey = process.env.TENSOR_API_KEY;
    if (!apiKey) throw new Error('TENSOR_API_KEY env var required for NFT sales');

    const listQuery = `
      query TswapSellNftTx($mint: String!, $seller: String!, $minPrice: Decimal!) {
        tswapSellNftTokenPoolTx(mint: $mint, seller: $seller, minPrice: $minPrice) {
          txs { tx txV0 }
        }
      }
    `;

    const { data } = await axios.post(TENSOR_API, {
      query: listQuery,
      variables: {
        mint: mintAddress,
        seller: this.identity.publicKey.toBase58(),
        minPrice: String(Math.floor(minPriceSol * LAMPORTS_PER_SOL)),
      },
    }, {
      headers: { 'X-TENSOR-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    const txData = data?.data?.tswapSellNftTokenPoolTx?.txs?.[0];
    if (!txData) throw new Error('No pool bid found at or above minPriceSol');

    const raw = txData.txV0 || txData.tx;
    const tx = VersionedTransaction.deserialize(Buffer.from(raw, 'base64'));
    tx.sign([this.identity]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false, maxRetries: 3,
    });
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log(`[Tensor] NFT sold: ${signature}`);
    return { success: true, txHash: signature, mint: mintAddress, minPriceSol, side: 'sell' };
  }

  // ─── Meteora DLMM Liquidity ─────────────────────────────────────────────

  async addLiquidity(poolAddress, amountX, amountY, rangeWidth = 10) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    let DLMM, StrategyType, BN;
    try {
      const dlmmMod = await import('@meteora-ag/dlmm');
      DLMM = dlmmMod.default || dlmmMod.DLMM;
      StrategyType = dlmmMod.StrategyType;
      BN = (await import('bn.js')).default;
    } catch {
      throw new Error('Install @meteora-ag/dlmm @coral-xyz/anchor bn.js for Meteora liquidity');
    }

    const pool = await DLMM.create(this.connection, new PublicKey(poolAddress));
    const activeBin = await pool.getActiveBin();
    const minBinId = activeBin.binId - rangeWidth;
    const maxBinId = activeBin.binId + rangeWidth;

    const newPosition = Keypair.generate();

    const createTx = await pool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: newPosition.publicKey,
      user: this.identity.publicKey,
      totalXAmount: new BN(amountX),
      totalYAmount: new BN(amountY),
      strategy: { maxBinId, minBinId, strategyType: StrategyType.Spot },
    });

    const signature = await sendAndConfirmTransaction(
      this.connection, createTx, [this.identity, newPosition],
    );

    console.log(`[Meteora] Liquidity added: ${signature}`);
    return {
      success: true,
      txHash: signature,
      pool: poolAddress,
      position: newPosition.publicKey.toBase58(),
    };
  }

  async removeLiquidity(poolAddress, positionAddress) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    let DLMM, BN;
    try {
      const dlmmMod = await import('@meteora-ag/dlmm');
      DLMM = dlmmMod.default || dlmmMod.DLMM;
      BN = (await import('bn.js')).default;
    } catch {
      throw new Error('Install @meteora-ag/dlmm @coral-xyz/anchor bn.js for Meteora liquidity');
    }

    const pool = await DLMM.create(this.connection, new PublicKey(poolAddress));
    const { userPositions } = await pool.getPositionsByUserAndLbPair(this.identity.publicKey);
    const position = userPositions.find(p => p.publicKey.toBase58() === positionAddress);
    if (!position) throw new Error('Position not found');

    const binIds = position.positionData.positionBinData.map(b => b.binId);

    const removeTx = await pool.removeLiquidity({
      position: new PublicKey(positionAddress),
      user: this.identity.publicKey,
      fromBinId: binIds[0],
      toBinId: binIds[binIds.length - 1],
      liquiditiesBpsToRemove: new Array(binIds.length).fill(new BN(100 * 100)),
      shouldClaimAndClose: true,
    });

    const txs = Array.isArray(removeTx) ? removeTx : [removeTx];
    const signatures = [];
    for (const tx of txs) {
      const sig = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
      signatures.push(sig);
    }

    console.log(`[Meteora] Liquidity removed: ${signatures[0]}`);
    return { success: true, txHashes: signatures, pool: poolAddress, position: positionAddress };
  }
}

export default SolanaAutonomy;
