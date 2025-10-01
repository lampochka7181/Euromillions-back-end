const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

class SolanaService {
  constructor() {
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.treasuryWallet = process.env.TREASURY_WALLET;
    this.treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
    
    // Validate required environment variables
    if (!this.treasuryWallet) {
      console.warn('⚠️  TREASURY_WALLET environment variable not set');
    }
    if (!this.treasuryPrivateKey) {
      console.warn('⚠️  TREASURY_PRIVATE_KEY environment variable not set');
    } else {
      // Log first and last few characters for debugging (security: don't log full key)
      const keyPreview = this.treasuryPrivateKey.substring(0, 10) + '...' + this.treasuryPrivateKey.substring(this.treasuryPrivateKey.length - 10);
      console.log('🔑 Treasury Private Key loaded:', keyPreview);
      console.log('📏 Private Key length:', this.treasuryPrivateKey.length);
      console.log('🔍 Contains invalid base58 chars (0OIl):', /[0OIl]/.test(this.treasuryPrivateKey));
      console.log('🔍 Contains lowercase g:', this.treasuryPrivateKey.includes('g'));
    }
    if (!process.env.HELIUS_RPC_URL) {
      console.warn('⚠️  HELIUS_RPC_URL environment variable not set, using default RPC');
    }
  }

  // Get treasury wallet keypair
  getTreasuryKeypair() {
    if (!this.treasuryPrivateKey) {
      throw new Error('Treasury private key not configured');
    }
    
    try {
      const privateKeyBytes = bs58.decode(this.treasuryPrivateKey);
      
      // Solana private keys should be 64 bytes
      if (privateKeyBytes.length !== 64) {
        console.error(`Invalid private key length: ${privateKeyBytes.length} bytes (expected 64)`);
        throw new Error(`Invalid treasury private key length: ${privateKeyBytes.length} bytes (expected 64)`);
      }
      
      return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      console.error('Error decoding treasury private key:', error.message);
      console.error('Private key format should be a base58-encoded 64-byte Solana private key');
      throw new Error(`Invalid treasury private key format: ${error.message}`);
    }
  }

  // Get treasury wallet balance
  async getTreasuryBalance() {
    try {
      if (!this.treasuryWallet) {
        throw new Error('Treasury wallet address not configured. Please set TREASURY_WALLET environment variable.');
      }
      
      const publicKey = new PublicKey(this.treasuryWallet);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting treasury balance:', error);
      throw error;
    }
  }

  // Send SOL to winner
  async sendPayout(winnerWalletAddress, amountSOL) {
    try {
      const treasuryKeypair = this.getTreasuryKeypair();
      const winnerPublicKey = new PublicKey(winnerWalletAddress);
      const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

      // Check if treasury has enough balance
      const treasuryBalance = await this.getTreasuryBalance();
      if (treasuryBalance < amountSOL) {
        throw new Error(`Insufficient treasury balance. Available: ${treasuryBalance} SOL, Required: ${amountSOL} SOL`);
      }

      // Create transaction
      const transaction = new Transaction();
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: treasuryKeypair.publicKey,
          toPubkey: winnerPublicKey,
          lamports: amountLamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = treasuryKeypair.publicKey;

      // Sign and send transaction
      transaction.sign(treasuryKeypair);
      
      const signature = await this.connection.sendRawTransaction(transaction.serialize());
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature);
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return {
        success: true,
        signature,
        amount: amountSOL,
        winner: winnerWalletAddress
      };
    } catch (error) {
      console.error('Error sending payout:', error);
      throw error;
    }
  }

  // Send multiple payouts (for multiple winners)
  async sendBulkPayouts(payouts) {
    const results = [];
    
    for (const payout of payouts) {
      try {
        const result = await this.sendPayout(payout.winnerWallet, payout.amount);
        results.push({
          ...result,
          winner: payout.winnerWallet,
          prize_tier: payout.prize_tier
        });
      } catch (error) {
        console.error(`Failed to send payout to ${payout.winnerWallet}:`, error);
        results.push({
          success: false,
          winner: payout.winnerWallet,
          error: error.message,
          prize_tier: payout.prize_tier
        });
      }
    }
    
    return results;
  }

  // Verify transaction
  async verifyTransaction(transactionHash) {
    try {
      const signature = transactionHash;
      const transaction = await this.connection.getTransaction(signature);
      
      if (!transaction) {
        return { verified: false, error: 'Transaction not found' };
      }

      // Check if transaction is confirmed
      const { value: status } = await this.connection.getSignatureStatus(signature);
      
      return {
        verified: status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized',
        transaction,
        status
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { verified: false, error: error.message };
    }
  }

  // Get transaction details
  async getTransactionDetails(transactionHash) {
    try {
      const transaction = await this.connection.getTransaction(transactionHash);
      return transaction;
    } catch (error) {
      console.error('Error getting transaction details:', error);
      throw error;
    }
  }
}

module.exports = new SolanaService();


