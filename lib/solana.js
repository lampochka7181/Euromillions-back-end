const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

class SolanaService {
  constructor() {
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.treasuryWallet = process.env.TREASURY_WALLET;
    this.treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
  }

  // Get treasury wallet keypair
  getTreasuryKeypair() {
    if (!this.treasuryPrivateKey) {
      throw new Error('Treasury private key not configured');
    }
    
    try {
      const privateKeyBytes = bs58.decode(this.treasuryPrivateKey);
      return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      throw new Error('Invalid treasury private key format');
    }
  }

  // Get treasury wallet balance
  async getTreasuryBalance() {
    try {
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


