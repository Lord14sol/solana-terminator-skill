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

const USDC_MINT        = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SOL_MINT         = 'So11111111111111111111111111111111111111112';
const MEMO_PROGRAM_ID  = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const PUMPPORTAL_API   = 'https://pumpportal.fun/api/trade-local';
const TENSOR_API       = 'https://api.tensor.so/graphql';
// lite-api.jup.ag = free, no API key needed (rate-limited)
// api.jup.ag/swap/v1 = paid, requires JUPITER_API_KEY (faster)
const JUPITER_API      = process.env.JUPITER_API_KEY
  ? 'https://api.jup.ag/swap/v1'
  : 'https://lite-api.jup.ag/swap/v1';

// Survival thresholds — tuned for Solana (fees ~$0.00025/tx)
const USDC_LOW         = 0.50;  // $0.50 — trigger swap to replenish USDC
const SOL_RESERVE      = 0.003; // always keep for fees, never swap this
const DEFAULT_SWAP_SOL = 0.02;  // swap ~$3-4 SOL → USDC when low

/**
 * SolanaAutonomy — Sovereign Solana identity and survival engine
 *
 * The Conway Automaton lives 100% on Solana:
 *   - Identity:   Solana keypair at ~/.automaton/solana-wallet.json
 *   - Survival:   Monitor SOL + USDC on Solana, auto-swap via Jupiter
 *   - Operations: Any SPL token swap via Jupiter aggregator
 *
 * NO EVM. NO Base. Pure Solana.
 */
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
  }

  // ─── Identity ─────────────────────────────────────────────────────────────

  _loadIdentity() {
    try {
      if (fs.existsSync(this.walletPath)) {
        const raw     = fs.readFileSync(this.walletPath, 'utf8');
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

  /** The agent's Solana address (base58). */
  getAddress() {
    return this.identity?.publicKey.toBase58() ?? null;
  }

  // ─── Balances ─────────────────────────────────────────────────────────────

  /** SOL balance in whole SOL. */
  async getSolBalance() {
    if (!this.identity) return 0;
    const lamports = await this.connection.getBalance(this.identity.publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * USDC balance on Solana in whole dollars.
   * Returns 0 if no associated token account exists yet.
   */
  async getUsdcBalance() {
    if (!this.identity) return 0;
    try {
      const ata     = await getAssociatedTokenAddress(USDC_MINT, this.identity.publicKey);
      const account = await getAccount(this.connection, ata);
      return Number(account.amount) / 1_000_000; // USDC has 6 decimals
    } catch {
      return 0;
    }
  }

  /** Full status snapshot. */
  async getStatus() {
    const [sol, usdc] = await Promise.all([
      this.getSolBalance(),
      this.getUsdcBalance(),
    ]);
    return {
      address: this.getAddress(),
      sol,
      usdc,
      solLow:  sol  <= SOL_RESERVE,
      usdcLow: usdc <  USDC_LOW,
    };
  }

  // ─── Survival Engine ──────────────────────────────────────────────────────

  /**
   * keepAlive — main heartbeat entry point.
   *
   * Call every ~10 min from the automaton's heartbeat task.
   * No arguments needed — 100% Solana-native.
   *
   * @returns {{ success: boolean, status: string, action?: string, txHash?: string }}
   */
  async keepAlive() {
    const status = await this.getStatus();

    console.log(`[LifeSupport] SOL: ${status.sol.toFixed(5)} | USDC: $${status.usdc.toFixed(4)}`);

    // Dead — no SOL at all, cannot do anything on-chain
    if (status.solLow) {
      const msg = `Agent needs SOL to survive. Send SOL to: ${this.getAddress()}`;
      console.error(`[LifeSupport] DEAD — ${msg}`);
      return {
        success: false,
        status:  'dead',
        action:  'needs_sol_funding',
        address: this.getAddress(),
        message: msg,
      };
    }

    // USDC low but we have SOL — swap SOL → USDC via Jupiter
    if (status.usdcLow) {
      const swappable = status.sol - SOL_RESERVE;
      const amountSol = Math.min(DEFAULT_SWAP_SOL, swappable);

      console.log(`[LifeSupport] USDC low ($${status.usdc.toFixed(4)}). Swapping ${amountSol.toFixed(4)} SOL → USDC...`);

      try {
        const result = await this.swap(
          SOL_MINT,
          USDC_MINT.toBase58(),
          Math.floor(amountSol * LAMPORTS_PER_SOL),
          50,
        );

        return {
          success: true,
          status:  'stabilized',
          action:  'swapped_sol_to_usdc',
          txHash:  result.txHash,
          amount:  amountSol,
        };
      } catch (err) {
        return { success: false, status: 'error', action: 'swap_failed', error: err.message };
      }
    }

    return { success: true, status: 'nominal' };
  }

  // ─── Jupiter Swaps ────────────────────────────────────────────────────────

  /**
   * Swap any SPL token using Jupiter — best route across all Solana DEXes.
   *
   * @param {string} inputMint   - Mint of the token to sell (SOL_MINT for native SOL)
   * @param {string} outputMint  - Mint of the token to buy
   * @param {number} amount      - Amount in base units (lamports for SOL)
   * @param {number} slippageBps - Max slippage in basis points (50 = 0.5%)
   */
  async swap(inputMint, outputMint, amount, slippageBps = 50) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    console.log(`[Jupiter] ${amount} ${inputMint} → ${outputMint}`);

    const apiKey = process.env.JUPITER_API_KEY || '';
    const headers = apiKey ? { 'x-api-key': apiKey } : {};

    // 1. Get best route
    const { data: quote } = await axios.get(`${JUPITER_API}/quote`, {
      params: { inputMint, outputMint, amount, slippageBps, onlyDirectRoutes: false },
      headers,
      timeout: 15_000,
    });
    console.log(`[Jupiter] Out: ${quote.outAmount} (min: ${quote.otherAmountThreshold})`);

    // 2. Build transaction
    const { data: swapData } = await axios.post(
      `${JUPITER_API}/swap`,
      {
        quoteResponse:             quote,
        userPublicKey:             this.identity.publicKey.toBase58(),
        wrapAndUnwrapSol:          true,
        prioritizationFeeLamports: 1_000,
        dynamicComputeUnitLimit:   true,
      },
      { headers, timeout: 15_000 },
    );

    // 3. Sign + send
    const tx = VersionedTransaction.deserialize(Buffer.from(swapData.swapTransaction, 'base64'));
    tx.sign([this.identity]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries:    3,
    });

    // 4. Confirm
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    );
    console.log(`[Jupiter] Confirmed: ${signature}`);

    return {
      success:   true,
      txHash:    signature,
      inAmount:  amount,
      outAmount: Number(quote.outAmount),
    };
  }

  /**
   * Airdrop SOL — only works on devnet/testnet for testing.
   */
  async requestAirdrop(solAmount = 1) {
    const sig = await this.connection.requestAirdrop(
      this.identity.publicKey,
      solAmount * LAMPORTS_PER_SOL,
    );
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
  }

  // ─── SOL Transfer ───────────────────────────────────────────────────────

  /**
   * Send native SOL to another wallet.
   *
   * @param {string} to        - Destination address (base58)
   * @param {number} amountSol - Amount in whole SOL
   */
  async sendSol(to, amountSol) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.identity.publicKey,
        toPubkey:   new PublicKey(to),
        lamports:   Math.floor(amountSol * LAMPORTS_PER_SOL),
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
    console.log(`[Transfer] Sent ${amountSol} SOL → ${to}: ${signature}`);
    return { success: true, txHash: signature, amount: amountSol, to };
  }

  // ─── SPL Token Transfer ─────────────────────────────────────────────────

  /**
   * Send any SPL token to another wallet.
   * Creates the destination ATA if it doesn't exist.
   *
   * @param {string} mintAddress - Token mint (base58)
   * @param {string} to         - Destination wallet (base58)
   * @param {number} amount     - Amount in base units (e.g. 1000000 for 1 USDC)
   */
  async sendToken(mintAddress, to, amount) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const mint   = new PublicKey(mintAddress);
    const destPk = new PublicKey(to);

    const sourceAta = await getAssociatedTokenAddress(mint, this.identity.publicKey);
    const destAta   = await getOrCreateAssociatedTokenAccount(
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

  /**
   * Write a message on-chain using the Memo program.
   * Permanent, immutable, publicly readable.
   *
   * @param {string} message - Text to inscribe on-chain
   */
  async memo(message) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const tx = new Transaction().add(
      new TransactionInstruction({
        keys:      [{ pubkey: this.identity.publicKey, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data:      Buffer.from(message, 'utf-8'),
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
    console.log(`[Memo] "${message}" → ${signature}`);
    return { success: true, txHash: signature, message };
  }

  // ─── SOL Staking ────────────────────────────────────────────────────────

  /**
   * Stake SOL with a validator for yield.
   *
   * @param {number} amountSol      - SOL to stake
   * @param {string} validatorVote  - Validator vote account (base58)
   */
  async stake(amountSol, validatorVote) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const stakeAccount = Keypair.generate();
    const lamports     = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const minBalance   = await this.connection.getMinimumBalanceForRentExemption(200);

    const tx = new Transaction().add(
      StakeProgram.createAccount({
        fromPubkey:    this.identity.publicKey,
        stakePubkey:   stakeAccount.publicKey,
        authorized:    new Authorized(this.identity.publicKey, this.identity.publicKey),
        lockup:        new Lockup(0, 0, this.identity.publicKey),
        lamports:      lamports + minBalance,
      }),
      StakeProgram.delegate({
        stakePubkey:   stakeAccount.publicKey,
        authorizedPubkey: this.identity.publicKey,
        votePubkey:    new PublicKey(validatorVote),
      }),
    );

    const signature = await sendAndConfirmTransaction(
      this.connection, tx, [this.identity, stakeAccount],
    );

    console.log(`[Stake] ${amountSol} SOL → validator ${validatorVote}: ${signature}`);
    return {
      success: true,
      txHash:  signature,
      stakeAccount: stakeAccount.publicKey.toBase58(),
      amount:  amountSol,
      validator: validatorVote,
    };
  }

  /**
   * Unstake (deactivate) a stake account. SOL becomes available after cooldown (~2 days).
   *
   * @param {string} stakeAccountAddress - Stake account to deactivate (base58)
   */
  async unstake(stakeAccountAddress) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    const tx = new Transaction().add(
      StakeProgram.deactivate({
        stakePubkey:      new PublicKey(stakeAccountAddress),
        authorizedPubkey: this.identity.publicKey,
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.identity]);
    console.log(`[Unstake] Deactivated ${stakeAccountAddress}: ${signature}`);
    return { success: true, txHash: signature, stakeAccount: stakeAccountAddress };
  }

  // ─── Pump.fun Memecoins (via PumpPortal) ────────────────────────────────

  /**
   * Buy a token on Pump.fun via PumpPortal API.
   * PumpPortal returns a serialized tx — we sign it locally.
   *
   * @param {string} mint       - Token contract address
   * @param {number} amountSol  - SOL to spend
   * @param {number} slippage   - Slippage % (default: 5)
   */
  async pumpBuy(mint, amountSol, slippage = 5) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    console.log(`[PumpFun] Buying ${mint} for ${amountSol} SOL...`);

    const response = await axios.post(PUMPPORTAL_API, {
      publicKey:        this.identity.publicKey.toBase58(),
      action:           'buy',
      mint,
      denominatedInSol: 'true',
      amount:           amountSol,
      slippage,
      priorityFee:      0.0001,
      pool:             'auto',
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

  /**
   * Sell a token on Pump.fun via PumpPortal API.
   *
   * @param {string} mint          - Token contract address
   * @param {string|number} amount - Token amount or "100%" to sell all
   * @param {number} slippage      - Slippage % (default: 5)
   */
  async pumpSell(mint, amount = '100%', slippage = 5) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    console.log(`[PumpFun] Selling ${amount} of ${mint}...`);

    const response = await axios.post(PUMPPORTAL_API, {
      publicKey:        this.identity.publicKey.toBase58(),
      action:           'sell',
      mint,
      denominatedInSol: 'false',
      amount,
      slippage,
      priorityFee:      0.0001,
      pool:             'auto',
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

  // ─── Tensor NFT Buy ────────────────────────────────────────────────────

  /**
   * Buy a listed NFT on Tensor.
   * Requires TENSOR_API_KEY env var.
   *
   * @param {string} mintAddress - NFT mint address
   * @param {number} maxPriceSol - Maximum SOL willing to pay
   */
  async buyNft(mintAddress, maxPriceSol) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    const apiKey = process.env.TENSOR_API_KEY;
    if (!apiKey) throw new Error('TENSOR_API_KEY env var required for NFT purchases');

    console.log(`[Tensor] Buying NFT ${mintAddress} (max: ${maxPriceSol} SOL)...`);

    // 1. Get listing + buy tx via Tensor GraphQL
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
        mint:     mintAddress,
        buyer:    this.identity.publicKey.toBase58(),
        maxPrice: String(Math.floor(maxPriceSol * LAMPORTS_PER_SOL)),
      },
    }, {
      headers: { 'X-TENSOR-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    const txData = data?.data?.tswapBuySingleListingTx?.txs?.[0];
    if (!txData) throw new Error('No listing found or price exceeds max');

    // Prefer versioned tx
    const raw = txData.txV0 || txData.tx;
    const tx  = VersionedTransaction.deserialize(Buffer.from(raw, 'base64'));
    tx.sign([this.identity]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false, maxRetries: 3,
    });
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log(`[Tensor] NFT bought: ${signature}`);
    return { success: true, txHash: signature, mint: mintAddress, priceSol: maxPriceSol };
  }

  /**
   * Sell (list + instantly sell) an NFT on Tensor.
   * Uses Tensor's tswapSellNftTokenPoolTx — sells directly into a pool.
   * Requires TENSOR_API_KEY env var.
   *
   * @param {string} mintAddress  - NFT mint address
   * @param {number} minPriceSol  - Minimum SOL to accept (rejects if pool bids lower)
   */
  async sellNft(mintAddress, minPriceSol) {
    if (!this.identity) throw new Error('No Solana identity loaded');
    const apiKey = process.env.TENSOR_API_KEY;
    if (!apiKey) throw new Error('TENSOR_API_KEY env var required for NFT sales');

    console.log(`[Tensor] Selling NFT ${mintAddress} (min: ${minPriceSol} SOL)...`);

    // 1. Get the best pool bid for this mint
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
        mint:     mintAddress,
        seller:   this.identity.publicKey.toBase58(),
        minPrice: String(Math.floor(minPriceSol * LAMPORTS_PER_SOL)),
      },
    }, {
      headers: { 'X-TENSOR-API-KEY': apiKey, 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    const txData = data?.data?.tswapSellNftTokenPoolTx?.txs?.[0];
    if (!txData) throw new Error('No pool bid found at or above minPriceSol');

    const raw = txData.txV0 || txData.tx;
    const tx  = VersionedTransaction.deserialize(Buffer.from(raw, 'base64'));
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

  /**
   * Add liquidity to a Meteora DLMM pool.
   * Requires @meteora-ag/dlmm + @coral-xyz/anchor installed.
   *
   * @param {string} poolAddress    - Meteora pool address
   * @param {number} amountX        - Base token amount in base units
   * @param {number} amountY        - Quote token amount in base units
   * @param {number} rangeWidth     - Bins on each side of active bin (default: 10)
   */
  async addLiquidity(poolAddress, amountX, amountY, rangeWidth = 10) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    // Dynamic import — only loads if user has @meteora-ag/dlmm installed
    let DLMM, StrategyType, BN;
    try {
      const dlmmMod = await import('@meteora-ag/dlmm');
      DLMM         = dlmmMod.default || dlmmMod.DLMM;
      StrategyType  = dlmmMod.StrategyType;
      BN            = (await import('bn.js')).default;
    } catch {
      throw new Error('Install @meteora-ag/dlmm @coral-xyz/anchor bn.js for Meteora liquidity');
    }

    console.log(`[Meteora] Adding liquidity to pool ${poolAddress}...`);

    const pool      = await DLMM.create(this.connection, new PublicKey(poolAddress));
    const activeBin = await pool.getActiveBin();
    const minBinId  = activeBin.binId - rangeWidth;
    const maxBinId  = activeBin.binId + rangeWidth;

    const newPosition = Keypair.generate();

    const createTx = await pool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: newPosition.publicKey,
      user:           this.identity.publicKey,
      totalXAmount:   new BN(amountX),
      totalYAmount:   new BN(amountY),
      strategy:       { maxBinId, minBinId, strategyType: StrategyType.Spot },
    });

    const signature = await sendAndConfirmTransaction(
      this.connection, createTx, [this.identity, newPosition],
    );

    console.log(`[Meteora] Liquidity added: ${signature}`);
    return {
      success:  true,
      txHash:   signature,
      pool:     poolAddress,
      position: newPosition.publicKey.toBase58(),
    };
  }

  /**
   * Remove liquidity from a Meteora DLMM position.
   *
   * @param {string} poolAddress     - Meteora pool address
   * @param {string} positionAddress - Position account to withdraw from
   */
  async removeLiquidity(poolAddress, positionAddress) {
    if (!this.identity) throw new Error('No Solana identity loaded');

    let DLMM, BN;
    try {
      const dlmmMod = await import('@meteora-ag/dlmm');
      DLMM = dlmmMod.default || dlmmMod.DLMM;
      BN   = (await import('bn.js')).default;
    } catch {
      throw new Error('Install @meteora-ag/dlmm @coral-xyz/anchor bn.js for Meteora liquidity');
    }

    console.log(`[Meteora] Removing liquidity from ${positionAddress}...`);

    const pool = await DLMM.create(this.connection, new PublicKey(poolAddress));
    const { userPositions } = await pool.getPositionsByUserAndLbPair(this.identity.publicKey);
    const position = userPositions.find(p => p.publicKey.toBase58() === positionAddress);
    if (!position) throw new Error('Position not found');

    const binIds = position.positionData.positionBinData.map(b => b.binId);

    const removeTx = await pool.removeLiquidity({
      position:                new PublicKey(positionAddress),
      user:                    this.identity.publicKey,
      fromBinId:               binIds[0],
      toBinId:                 binIds[binIds.length - 1],
      liquiditiesBpsToRemove:  new Array(binIds.length).fill(new BN(100 * 100)),
      shouldClaimAndClose:     true,
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
