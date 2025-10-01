# 🚀 Production Deployment Guide

## 📋 Prerequisites

- Supabase account (production instance)
- Solana wallet with funds for payouts
- Helius RPC API key (mainnet)
- Twitter Developer Account (optional, for social media posts)
- VPS or cloud hosting (DigitalOcean, AWS, Railway, etc.)

## 🗄️ Database Setup

### Step 1: Run Production SQL Script

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `production_setup.sql`
5. Click **Run**

This will create:
- All tables (users, tickets, draws, winners, pot)
- Indexes for performance
- Functions for validation and automation
- Triggers for automatic pot updates
- Row Level Security policies

### Step 2: Verify Database Setup

Run this query to verify all tables were created:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

You should see:
- draws
- pot
- tickets
- users
- winners

## ⚙️ Backend Configuration

### Step 1: Create .env File

Create a `.env` file in your backend directory with:

```env
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration
JWT_SECRET=your_random_secret_key_here

# Solana Configuration (MAINNET)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
TREASURY_WALLET=your_mainnet_wallet_address
TREASURY_PRIVATE_KEY=your_wallet_private_key_base58

# App Configuration
PORT=3001
NODE_ENV=production

# Lottery Configuration
TICKET_PRICE_SOL=0.05
DRAW_DAY=Friday
DRAW_TIME=20:00

# Twitter/X API (Optional - requires Elevated access)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Test Locally First

```bash
npm start
```

Verify:
- ✅ Server starts without errors
- ✅ Treasury wallet loads correctly
- ✅ Countdown endpoint works: `GET /countdown`
- ✅ Pot endpoint works: `GET /pot`

## 🌐 Deploy to Production

### Option 1: Railway.app (Recommended - Easy Setup)

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Connect your repository
4. Add environment variables in Railway dashboard
5. Deploy!

**Railway will:**
- ✅ Auto-deploy on git push
- ✅ Provide HTTPS URL
- ✅ Keep server running 24/7
- ✅ Auto-restart on crash

### Option 2: DigitalOcean Droplet

```bash
# SSH into your droplet
ssh root@your_server_ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Clone your repository
git clone https://github.com/lampochka7181/Euromillions-back-end.git
cd Euromillions-back-end

# Install dependencies
npm install

# Create .env file (use nano or vi)
nano .env
# Paste your environment variables and save

# Start with PM2
pm2 start index.js --name powerball-backend

# Make it start on server reboot
pm2 startup
pm2 save

# Check logs
pm2 logs powerball-backend

# Monitor status
pm2 status
```

### Option 3: Render.com (Free Tier Available)

1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Environment**: Add all variables from .env
5. Deploy!

## ⏰ Verify Automated Draws

After deployment, verify the cron job is scheduled:

1. Check server logs for:
   ```
   ⏰ Automated draw scheduled: Every Friday at 20:00 UTC
   📅 Next draw: [date]
   ```

2. Test manually:
   ```bash
   curl -X POST https://your-domain.com/admin/draws/execute-automated
   ```

3. Check the logs to see the complete execution

## 🔒 Security Checklist

- ✅ Never commit .env file to git
- ✅ Use mainnet RPC URL for production
- ✅ Ensure treasury wallet has sufficient SOL
- ✅ Backup your treasury private key securely
- ✅ Use strong JWT_SECRET
- ✅ Enable HTTPS in production
- ✅ Monitor server logs regularly

## 📊 Monitoring

### Check System Health
```bash
# Health check
curl https://your-domain.com/health

# Check pot
curl https://your-domain.com/pot

# Check countdown
curl https://your-domain.com/countdown

# Check treasury balance
curl https://your-domain.com/admin/treasury/balance
```

### Monitor Logs

**With PM2:**
```bash
pm2 logs powerball-backend
pm2 monit
```

**With Railway/Render:**
- View logs in their dashboard
- Set up log alerts

## 🎯 Weekly Draw Schedule

The system automatically runs every **Friday at 20:00 UTC**:

1. 🎲 Generates cryptographically secure random numbers
2. 🎫 Finds all eligible tickets (last 7 days)
3. 🏆 Calculates winners with cascading distribution
4. 💰 Sends SOL payouts automatically
5. 🔄 Resets pot to 0
6. 📱 Posts results to Twitter/X (if credentials configured)

## 🐦 Twitter Integration (Optional)

To enable Twitter posting:

1. Apply for **Elevated API access** at https://developer.twitter.com
2. Wait for approval (usually 1-2 hours)
3. Generate Access Token and Secret with **Read and Write** permissions
4. Add credentials to .env
5. Restart backend

**Note:** Twitter Free tier doesn't allow posting. You need Elevated access.

## 🆘 Troubleshooting

### Server won't start
- Check .env file encoding (should be UTF-8 without BOM)
- Verify all environment variables are set
- Check logs for specific errors

### Draws not executing
- Verify cron job is scheduled (check startup logs)
- Check server timezone is set to UTC
- Ensure server is running 24/7

### Payouts failing
- Check treasury wallet has sufficient SOL
- Verify HELIUS_RPC_URL is set correctly
- Check treasury private key is valid base58 format

### Twitter posting fails
- Verify you have Elevated API access
- Regenerate Access Token and Secret
- Check credentials are correct in .env

## 📞 Support

For issues, check:
- Server logs
- Supabase logs
- Network connectivity
- Treasury wallet balance

## 🎉 You're Ready!

Your Powerball lottery is now running in production with:
- ✅ Automated weekly draws
- ✅ Automatic payouts
- ✅ Secure random number generation
- ✅ Fair prize distribution
- ✅ Complete audit trail

**Next draw:** Friday, 20:00 UTC

