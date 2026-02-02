const { Connection, PublicKey, Keypair, Transaction, SystemProgram, clusterApiUrl } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@coral-xyz/anchor');
const { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// USDC mint addresses
const USDC_MINT = {
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  localnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
};

// Program ID from the contract
const PROGRAM_ID = new PublicKey('CLAWoSGaA5MzY1kzJ4k2g8fJ5v9xQzR7yTyUv9d9KdM3');

// IDL for the skill_marketplace program
const IDL = {
  "version": "0.1.0",
  "name": "skill_marketplace",
  "instructions": [
    {
      "name": "initializeMarketplace",
      "accounts": [
        { "name": "marketplace", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "treasury", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "platformFeeBps", "type": "u16" }
      ]
    },
    {
      "name": "listSkill",
      "accounts": [
        { "name": "marketplace", "isMut": true, "isSigner": false },
        { "name": "skillListing", "isMut": true, "isSigner": false },
        { "name": "seller", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "skillId", "type": "string" },
        { "name": "price", "type": "u64" },
        { "name": "isSubscription", "type": "bool" },
        { "name": "subscriptionDuration", "type": { "option": "i64" } }
      ]
    },
    {
      "name": "purchaseSkill",
      "accounts": [
        { "name": "marketplace", "isMut": true, "isSigner": false },
        { "name": "skillListing", "isMut": false, "isSigner": false },
        { "name": "license", "isMut": true, "isSigner": false },
        { "name": "buyer", "isMut": true, "isSigner": true },
        { "name": "buyerTokenAccount", "isMut": true, "isSigner": false },
        { "name": "escrowTokenAccount", "isMut": true, "isSigner": false },
        { "name": "usdcMint", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "skillId", "type": "string" }
      ]
    },
    {
      "name": "claimPayment",
      "accounts": [
        { "name": "marketplace", "isMut": true, "isSigner": false },
        { "name": "skillListing", "isMut": true, "isSigner": false },
        { "name": "seller", "isMut": true, "isSigner": true },
        { "name": "escrowTokenAccount", "isMut": true, "isSigner": false },
        { "name": "sellerTokenAccount", "isMut": true, "isSigner": false },
        { "name": "treasuryTokenAccount", "isMut": true, "isSigner": false },
        { "name": "usdcMint", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "verifyLicense",
      "accounts": [
        { "name": "license", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "updateSkillStatus",
      "accounts": [
        { "name": "skillListing", "isMut": true, "isSigner": false },
        { "name": "seller", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "isActive", "type": "bool" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Marketplace",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "treasury", "type": "publicKey" },
          { "name": "platformFeeBps", "type": "u16" },
          { "name": "skillCount", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "SkillListing",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "seller", "type": "publicKey" },
          { "name": "skillId", "type": "string" },
          { "name": "price", "type": "u64" },
          { "name": "isSubscription", "type": "bool" },
          { "name": "subscriptionDuration", "type": { "option": "i64" } },
          { "name": "isActive", "type": "bool" },
          { "name": "createdAt", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "License",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "skillListing", "type": "publicKey" },
          { "name": "purchasePrice", "type": "u64" },
          { "name": "platformFee", "type": "u64" },
          { "name": "isActive", "type": "bool" },
          { "name": "usageCount", "type": "u64" },
          { "name": "expiresAt", "type": { "option": "i64" } },
          { "name": "createdAt", "type": "i64" },
          { "name": "lastUsedAt", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "SkillListed",
      "fields": [
        { "name": "seller", "type": "publicKey", "index": false },
        { "name": "skillId", "type": "string", "index": false },
        { "name": "price", "type": "u64", "index": false }
      ]
    },
    {
      "name": "SkillPurchased",
      "fields": [
        { "name": "buyer", "type": "publicKey", "index": false },
        { "name": "seller", "type": "publicKey", "index": false },
        { "name": "skillId", "type": "string", "index": false },
        { "name": "price", "type": "u64", "index": false },
        { "name": "license", "type": "publicKey", "index": false }
      ]
    },
    {
      "name": "PaymentClaimed",
      "fields": [
        { "name": "seller", "type": "publicKey", "index": false },
        { "name": "skillId", "type": "string", "index": false },
        { "name": "amount", "type": "u64", "index": false },
        { "name": "fee", "type": "u64", "index": false }
      ]
    }
  ],
  "errors": [
    { "code": 6000, "name": "InvalidFee", "msg": "Invalid platform fee" },
    { "code": 6001, "name": "SkillIdTooLong", "msg": "Skill ID too long" },
    { "code": 6002, "name": "InvalidSkill", "msg": "Invalid skill" },
    { "code": 6003, "name": "SkillNotActive", "msg": "Skill not active" },
    { "code": 6004, "name": "Unauthorized", "msg": "Unauthorized" },
    { "code": 6005, "name": "InvalidPrice", "msg": "Invalid price" }
  ]
};

class SolanaService {
  constructor(config = {}) {
    this.network = config.network || 'devnet';
    this.connection = new Connection(
      config.rpcUrl || clusterApiUrl(this.network),
      'confirmed'
    );
    this.usdcMint = new PublicKey(USDC_MINT[this.network] || USDC_MINT.devnet);
    this.programId = PROGRAM_ID;
    
    // Treasury wallet (platform fee recipient)
    this.treasuryWallet = config.treasuryWallet 
      ? new PublicKey(config.treasuryWallet)
      : null;
    
    // Admin keypair for initializing marketplace (in production, use a secure key management)
    this.adminKeypair = config.adminKeypair || null;
  }

  // Initialize provider with a keypair
  getProvider(walletKeypair) {
    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(walletKeypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        txs.forEach(tx => tx.partialSign(walletKeypair));
        return txs;
      }
    };
    return new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed'
    });
  }

  // Get program instance
  getProgram(walletKeypair) {
    const provider = this.getProvider(walletKeypair);
    return new Program(IDL, this.programId, provider);
  }

  // Derive marketplace PDA
  async getMarketplacePDA() {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('marketplace')],
      this.programId
    );
    return { pda, bump };
  }

  // Derive skill listing PDA
  async getSkillListingPDA(sellerPubkey, skillId) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('skill'),
        new PublicKey(sellerPubkey).toBuffer(),
        Buffer.from(skillId)
      ],
      this.programId
    );
    return { pda, bump };
  }

  // Derive license PDA
  async getLicensePDA(buyerPubkey, skillListingPDA) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('license'),
        new PublicKey(buyerPubkey).toBuffer(),
        new PublicKey(skillListingPDA).toBuffer()
      ],
      this.programId
    );
    return { pda, bump };
  }

  // Derive escrow token account PDA
  async getEscrowPDA(skillId) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), Buffer.from(skillId)],
      this.programId
    );
    return { pda, bump };
  }

  // Initialize marketplace (admin only)
  async initializeMarketplace(adminKeypair, platformFeeBps = 250) {
    try {
      const program = this.getProgram(adminKeypair);
      const { pda: marketplace } = await this.getMarketplacePDA();

      const tx = await program.methods
        .initializeMarketplace(platformFeeBps)
        .accounts({
          marketplace,
          authority: adminKeypair.publicKey,
          treasury: this.treasuryWallet || adminKeypair.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return {
        success: true,
        signature: tx,
        marketplace: marketplace.toBase58()
      };
    } catch (error) {
      console.error('Error initializing marketplace:', error);
      return { success: false, error: error.message };
    }
  }

  // List a skill on the marketplace
  async listSkill(sellerKeypair, skillId, price, isSubscription = false, subscriptionDuration = null) {
    try {
      const program = this.getProgram(sellerKeypair);
      const { pda: marketplace } = await this.getMarketplacePDA();
      const { pda: skillListing } = await this.getSkillListingPDA(
        sellerKeypair.publicKey,
        skillId
      );

      // Convert price to USDC decimals (6 decimals)
      const priceInLamports = Math.round(price * 1_000_000);

      const tx = await program.methods
        .listSkill(
          skillId,
          new BN(priceInLamports),
          isSubscription,
          subscriptionDuration ? new BN(subscriptionDuration) : null
        )
        .accounts({
          marketplace,
          skillListing,
          seller: sellerKeypair.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return {
        success: true,
        signature: tx,
        skillListing: skillListing.toBase58()
      };
    } catch (error) {
      console.error('Error listing skill:', error);
      return { success: false, error: error.message };
    }
  }

  // Purchase a skill
  async purchaseSkill(buyerKeypair, sellerPubkey, skillId) {
    try {
      const program = this.getProgram(buyerKeypair);
      const { pda: marketplace } = await this.getMarketplacePDA();
      const { pda: skillListing } = await this.getSkillListingPDA(sellerPubkey, skillId);
      const { pda: license } = await this.getLicensePDA(buyerKeypair.publicKey, skillListing);
      const { pda: escrowTokenAccount } = await this.getEscrowPDA(skillId);

      // Get or create buyer's USDC token account
      const buyerTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        buyerKeypair.publicKey
      );

      const tx = await program.methods
        .purchaseSkill(skillId)
        .accounts({
          marketplace,
          skillListing,
          license,
          buyer: buyerKeypair.publicKey,
          buyerTokenAccount,
          escrowTokenAccount,
          usdcMint: this.usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY
        })
        .rpc();

      return {
        success: true,
        signature: tx,
        license: license.toBase58(),
        escrow: escrowTokenAccount.toBase58()
      };
    } catch (error) {
      console.error('Error purchasing skill:', error);
      return { success: false, error: error.message };
    }
  }

  // Claim payment (seller withdraws)
  async claimPayment(sellerKeypair, skillId) {
    try {
      const program = this.getProgram(sellerKeypair);
      const { pda: marketplace } = await this.getMarketplacePDA();
      
      // Get skill listing PDA
      const { pda: skillListing } = await this.getSkillListingPDA(
        sellerKeypair.publicKey,
        skillId
      );
      
      const { pda: escrowTokenAccount } = await this.getEscrowPDA(skillId);

      // Get seller's USDC token account
      const sellerTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        sellerKeypair.publicKey
      );

      // Get treasury's USDC token account
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        this.treasuryWallet || sellerKeypair.publicKey
      );

      const tx = await program.methods
        .claimPayment()
        .accounts({
          marketplace,
          skillListing,
          seller: sellerKeypair.publicKey,
          escrowTokenAccount,
          sellerTokenAccount,
          treasuryTokenAccount,
          usdcMint: this.usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .rpc();

      return {
        success: true,
        signature: tx
      };
    } catch (error) {
      console.error('Error claiming payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify license
  async verifyLicense(ownerKeypair, licensePDA) {
    try {
      const program = this.getProgram(ownerKeypair);

      const tx = await program.methods
        .verifyLicense()
        .accounts({
          license: new PublicKey(licensePDA),
          owner: ownerKeypair.publicKey
        })
        .rpc();

      return {
        success: true,
        signature: tx
      };
    } catch (error) {
      console.error('Error verifying license:', error);
      return { success: false, error: error.message };
    }
  }

  // Get marketplace info
  async getMarketplaceInfo() {
    try {
      const { pda: marketplace } = await this.getMarketplacePDA();
      const accountInfo = await this.connection.getAccountInfo(marketplace);
      
      if (!accountInfo) {
        return { initialized: false };
      }

      return {
        initialized: true,
        address: marketplace.toBase58()
      };
    } catch (error) {
      return { initialized: false, error: error.message };
    }
  }

  // Get skill listing info
  async getSkillListing(sellerPubkey, skillId) {
    try {
      const { pda: skillListing } = await this.getSkillListingPDA(sellerPubkey, skillId);
      const accountInfo = await this.connection.getAccountInfo(skillListing);
      
      if (!accountInfo) {
        return { exists: false };
      }

      return {
        exists: true,
        address: skillListing.toBase58()
      };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  // Get license info
  async getLicense(buyerPubkey, skillListingPDA) {
    try {
      const { pda: license } = await this.getLicensePDA(buyerPubkey, skillListingPDA);
      const accountInfo = await this.connection.getAccountInfo(license);
      
      if (!accountInfo) {
        return { exists: false };
      }

      return {
        exists: true,
        address: license.toBase58()
      };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  // Verify a transaction signature
  async verifyTransaction(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      
      if (!status || !status.value) {
        return { verified: false, status: 'not_found' };
      }

      return {
        verified: status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized',
        status: status.value.confirmationStatus,
        err: status.value.err,
        slot: status.value.slot
      };
    } catch (error) {
      return { verified: false, error: error.message };
    }
  }

  // Get USDC balance for a wallet
  async getUSDCBalance(walletAddress) {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        new PublicKey(walletAddress)
      );
      
      try {
        const account = await getAccount(this.connection, tokenAccount);
        return {
          success: true,
          balance: Number(account.amount) / 1_000_000, // Convert from lamports
          address: tokenAccount.toBase58()
        };
      } catch (e) {
        // Account doesn't exist yet
        return {
          success: true,
          balance: 0,
          address: tokenAccount.toBase58()
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check if wallet is valid
  isValidWalletAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // Generate a verification nonce for wallet connection
  generateWalletNonce() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Create a message for wallet signature verification
  createWalletVerificationMessage(walletAddress, nonce) {
    return `ClawOS Wallet Verification\n\nAddress: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
  }
}

module.exports = SolanaService;
