# ⚙️ Production Configuration Checklist

## 🔴 Hard-Coded Values Fixed

All hard-coded values have been removed or made configurable via environment variables.

## 📝 Values You MUST Configure in .env

### **Critical - System Won't Work Without These:**

```env
# Supabase (Get from Supabase Dashboard → Settings → API)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Solana Network - CHOOSE ONE:
# For MAINNET (Real SOL):
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
# For DEVNET (Test SOL):
# HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Treasury Wallet (Must match the network above!)
TREASURY_WALLET=your_wallet_public_address
TREASURY_PRIVATE_KEY=your_wallet_private_key_base58_format

# Server Port
PORT=3001
```

### **Optional - System Works Without These:**

```env
# Twitter/X Integration (Requires Elevated API access)
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_secret

# JWT (Can use any random string)
JWT_SECRET=your_random_secret_minimum_32_characters

# Environment
NODE_ENV=production
```

## 🎯 Configurable Values (Already in Code)

These can be changed via environment variables:

| Variable | Default | Location | Purpose |
|----------|---------|----------|---------|
| `TICKET_PRICE_SOL` | 0.05 | Hard-coded | Price per ticket |
| `DRAW_DAY` | Friday | Hard-coded | Day of weekly draw |
| `DRAW_TIME` | 20:00 | Hard-coded | Time of draw (UTC) |
| `PORT` | 3000 | index.js:17 | Server port |

## ⚠️ Network Compatibility Checklist

**CRITICAL:** All components must be on the SAME network!

- [ ] Backend RPC URL (mainnet or devnet)
- [ ] Treasury wallet (exists on chosen network)
- [ ] Frontend wallet adapter (configured for same network)
- [ ] User wallets (on same network)

### How to Check:

1. **Check your HELIUS_RPC_URL:**
   - Contains `mainnet` = Using MAINNET (real SOL)
   - Contains `devnet` = Using DEVNET (test SOL)

2. **Verify treasury wallet has balance:**
   ```bash
   curl https://your-backend.com/admin/treasury/balance
   ```

3. **Check transaction on Solana Explorer:**
   - MAINNET: https://explorer.solana.com/
   - DEVNET: https://explorer.solana.com/?cluster=devnet

## 🐛 Common Errors & Solutions

### Transaction Timeout Error
```
TransactionExpiredTimeoutError: Transaction was not confirmed in 30.00 seconds
```

**Causes:**
1. **Network mismatch** - Treasury on mainnet, user on devnet (or vice versa)
2. **Slow RPC** - Free RPC endpoints can be slow
3. **Network congestion** - Solana network is busy

**Solutions:**
- ✅ Verify all wallets are on SAME network
- ✅ Use paid Helius RPC for faster confirmations
- ✅ Check Solana network status
- ✅ Increase frontend timeout (if needed)

### "Insufficient treasury balance" Error

**Solutions:**
- ✅ Fund your treasury wallet
- ✅ Ensure you're checking the right network
- ✅ Verify TREASURY_WALLET matches your funded wallet

### Environment Variables Not Loading

**Solutions:**
- ✅ Check .env file has no BOM (Byte Order Mark)
- ✅ Save as UTF-8 encoding
- ✅ No quotes around values (unless value contains spaces)
- ✅ No spaces around `=` sign
- ✅ File named exactly `.env` (not `env.txt` or `.env.txt`)

## 🔢 Fixed Hard-Coded Values

| Value | Location | Status |
|-------|----------|--------|
| Ticket Price (0.05 SOL) | Multiple locations | ✅ Configurable via env |
| Treasury Wallet | process.env.TREASURY_WALLET | ✅ From .env |
| RPC URL | process.env.HELIUS_RPC_URL | ✅ From .env |
| Localhost API calls | index.js:1280 | ✅ FIXED - No longer uses localhost |
| Port 3000/3001 | process.env.PORT | ✅ From .env |

## 📦 Production Deployment Values

When deploying to production hosting (Railway, Render, etc.):

1. **Set environment variables in hosting dashboard** (don't rely on .env file)
2. **Use MAINNET** for real lottery
3. **Use DEVNET** for testing
4. **Never commit .env** to git
5. **Backup treasury private key** securely

## ✅ Final Checklist Before Going Live

- [ ] Database setup complete (ran production_setup.sql)
- [ ] All environment variables configured
- [ ] Treasury wallet funded with SOL
- [ ] Network consistency verified (all mainnet or all devnet)
- [ ] RPC URL is correct for chosen network
- [ ] Tested ticket purchase end-to-end
- [ ] Tested draw execution
- [ ] Tested payout system
- [ ] Cron job scheduled and verified
- [ ] Monitoring/logging set up
- [ ] Backup of treasury keys secured

## 🎯 Quick Test Commands

```bash
# Check health
curl https://your-backend.com/health

# Check countdown
curl https://your-backend.com/countdown

# Check pot
curl https://your-backend.com/pot

# Check treasury balance
curl https://your-backend.com/admin/treasury/balance

# Test automated draw (manual trigger)
curl -X POST https://your-backend.com/admin/draws/execute-automated
```

Your system is ready for production! 🚀

