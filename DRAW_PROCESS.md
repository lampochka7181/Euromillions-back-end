# 🎲 Powerball Draw & Payout Process

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
// Example: Every Sunday at 8 PM
const drawSchedule = {
  day: 'Sunday',
  time: '20:00',
  timezone: 'UTC'
};
```

### **Complete Automation**
1. **Generate draw** automatically
2. **Calculate winners** immediately
3. **Send payouts** to all winners
4. **Reset pot** for next draw
5. **Notify winners** via email/SMS

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
TREASURY_WALLET=5biVbs3NNfEEvCoLV9Y1SmLUfcTgX1WuKUGfNJq9AbAK
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
TREASURY_PRIVATE_KEY=your_private_key_here
```

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
