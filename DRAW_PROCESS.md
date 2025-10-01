# 🎲 Powerball Draw & Payout Process

## ⏰ **Automated Weekly Draw System**

✅ **Fully Automated** - Runs every Friday at 20:00 UTC
✅ **Cryptographically Secure** - Uses `crypto.randomInt()` for provably fair random numbers
✅ **Cascading Prize Distribution** - Handles multiple winners fairly
✅ **Automatic Payouts** - Sends SOL directly to winners
✅ **Social Media Integration** - Posts results to Twitter/X automatically
✅ **Pot Reset** - Automatically resets for next week

**Next Draw:** Friday, 20:00 UTC (check `/countdown` endpoint for exact time)

## 📋 **Complete Draw Workflow**

### **Step 1: Generate Random Draw**
```bash
POST /admin/draws/generate
```
- **Automatically generates** 5 unique numbers (1-30) + Powerball (1-10)
- **Creates draw record** in database
- **Returns:** Draw ID, winning numbers, powerball, draw date

### **Step 2: Calculate Winners**
```bash
POST /admin/draws/:drawId/calculate-winners
```
- **Analyzes all tickets** from the last 7 days
- **Calculates matches** for each ticket
- **Determines prize tiers** based on matches
- **Saves winners** to database
- **Returns:** List of winners with prize amounts

### **Step 3: Execute Draw & Send Payouts**
```bash
POST /admin/draws/:drawId/execute
```
- **Calculates winners** (calls Step 2)
- **Sends Solana payouts** to all winners
- **Updates winner records** with transaction signatures
- **Resets pot** to 0 after payouts
- **Returns:** Complete payout results

## 🏆 **Prize Tiers & Distribution**

**Revenue Model: 85% to Winners, 15% Revenue**

| Match | Powerball | Prize Tier | Winner Pot % |
|-------|-----------|------------|---------------|
| 5     | ✅        | 1 (Jackpot)| 100% of 85%   |
| 5     | ❌        | 2          | 50% of 85%    |
| 4     | ✅        | 3          | 25% of 85%    |
| 4     | ❌        | 4          | 10% of 85%    |
| 3     | ✅        | 5          | 5% of 85%     |
| 3     | ❌        | 6          | 2% of 85%     |

**Example with 100 SOL Pot:**
- **85 SOL** distributed to winners
- **15 SOL** kept as revenue
- **Jackpot winner** gets 85 SOL
- **5-number winner** gets 42.5 SOL
- **4+Powerball winner** gets 21.25 SOL

## 🔄 **Automated Process**

### **Weekly Draw Schedule**
```javascript
// Cron: Every Friday at 20:00 UTC
cron.schedule('0 20 * * 5', async () => {
  await executeAutomatedDraw();
}, {
  scheduled: true,
  timezone: "UTC"
});
```

### **Complete Automation - Every Friday 20:00 UTC**
1. 🎲 **Generate draw** with cryptographically secure random numbers
2. 🎫 **Find eligible tickets** from last 7 days
3. 🏆 **Calculate winners** with cascading prize distribution
4. 💾 **Save winners** to database
5. 💰 **Send SOL payouts** to all winners automatically
6. 🔄 **Reset pot** to 0 for next draw
7. 📱 **Post results to Twitter/X** with winning numbers, winners, and transaction signatures

### **Manual Testing Endpoint**
```bash
POST /admin/draws/execute-automated
```
Triggers the complete automated flow for testing purposes.

## 💰 **Payout System**

### **Solana Integration**
- **Automatic transfers** to winner wallets
- **Transaction verification** and confirmation
- **Error handling** for failed payouts
- **Retry mechanism** for failed transactions

### **Pot Management**
- **Real-time tracking** of total pot
- **Automatic updates** with each ticket purchase
- **Reset to 0** after successful payouts
- **Transparency** with public pot endpoint

## 🛡️ **Security & Transparency**

### **Random Number Generation**
- **Cryptographically secure** random generation
- **Verifiable randomness** for transparency
- **Public draw records** for audit trail

### **Winner Verification**
- **Database integrity** checks
- **Transaction verification** on Solana
- **Public winner records** for transparency

## 📊 **Monitoring & Analytics**

### **Draw Statistics**
- **Total tickets sold** per draw
- **Winner distribution** by prize tier
- **Payout success rates**
- **Pot growth tracking**

### **Admin Dashboard**
- **Real-time pot status**
- **Winner notifications**
- **Failed payout alerts**
- **System health monitoring**

## 🚀 **Quick Start Guide**

### **1. Generate Weekly Draw**
```bash
curl -X POST http://localhost:3001/admin/draws/generate
```

### **2. Execute Complete Draw**
```bash
curl -X POST http://localhost:3001/admin/draws/{drawId}/execute
```

### **3. Check Results**
```bash
curl http://localhost:3001/admin/stats
```

## 🔧 **Configuration**

### **Environment Variables**
```env
# Solana Configuration
TREASURY_WALLET=5biVbs3NNfEEvCoLV9Y1SmLUfcTgX1WuKUGfNJq9AbAK
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
TREASURY_PRIVATE_KEY=your_private_key_here

# Twitter/X API (Optional - for automated social media posts)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret

# Port Configuration
PORT=3001
```

### **How to Get Twitter API Credentials**
1. Go to https://developer.twitter.com/
2. Create a new app (free tier available)
3. Enable **Read and Write** permissions
4. Generate API keys and access tokens
5. Add to your `.env` file

**Note:** Twitter posting is optional. If credentials are not configured, the system will skip the social media post but continue with all other operations.

### **Prize Distribution (85% to Winners)**
```javascript
const winnerPot = totalPot * 0.85; // 85% for winners
const revenue = totalPot * 0.15;   // 15% revenue

const prizeDistribution = {
  1: winnerPot * 1.0,    // Jackpot: 100% of winner pot
  2: winnerPot * 0.5,    // 5 numbers: 50% of winner pot
  3: winnerPot * 0.25,   // 4 + powerball: 25% of winner pot
  4: winnerPot * 0.10,   // 4 numbers: 10% of winner pot
  5: winnerPot * 0.05,   // 3 + powerball: 5% of winner pot
  6: winnerPot * 0.02    // 3 numbers: 2% of winner pot
};
```

## 📱 **Frontend Integration**

### **Draw Status Display**
- **Current pot amount**
- **Next draw countdown**
- **Previous draw results**
- **Winner announcements**

### **Winner Notifications**
- **Real-time updates** when draw is executed
- **Prize amount display**
- **Transaction confirmation**
- **Celebration animations**

## 🎯 **Best Practices**

### **Draw Execution**
1. **Always generate** random numbers first
2. **Calculate winners** before payouts
3. **Verify treasury balance** before execution
4. **Monitor payout success** rates
5. **Keep audit logs** of all transactions

### **Error Handling**
- **Retry failed payouts** automatically
- **Alert administrators** of failures
- **Maintain pot integrity** during errors
- **Provide manual override** for edge cases

---

**🎰 Your Powerball lottery is now ready for automated draws and payouts!**
