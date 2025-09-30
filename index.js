const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

const { supabase, supabaseAdmin } = require('./lib/supabase');
const solanaService = require('./lib/solana');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Powerball Backend'
  });
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Decode our custom token format: userId:walletAddress
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [userId, walletAddress] = decoded.split(':');
      
      console.log('Auth debug - Decoded token:', decoded);
      console.log('Auth debug - User ID:', userId);
      console.log('Auth debug - Wallet Address:', walletAddress);
      
      if (!userId || !walletAddress) {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      // Verify user exists in database
      console.log('Auth debug - Querying database for user:', userId, walletAddress);
      
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('wallet_address', walletAddress)
        .single();

      console.log('Auth debug - Database query result:', { user, error });
      console.log('Auth debug - Error details:', error);

      if (error) {
        console.log('Auth debug - Database error:', error.message, error.code);
        return res.status(401).json({ error: 'Database query failed' });
      }

      if (!user) {
        console.log('Auth debug - No user found');
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      next();
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Powerball Lottery API',
    version: '1.0.0',
    endpoints: {
      system: {
        health: 'GET /health',
        docs: 'GET /'
      },
      auth: {
        register: 'POST /auth/register',
        walletConnect: 'POST /auth/wallet-connect',
        me: 'GET /auth/me'
      },
      tickets: {
        create: 'POST /tickets',
        my: 'GET /tickets/my',
        bulk: 'POST /tickets/bulk',
        active: 'GET /tickets/active'
      },
      payments: {
        createIntent: 'POST /payments/create-intent',
        verify: 'POST /payments/verify'
      },
      draws: {
        all: 'GET /draws',
        latest: 'GET /draws/latest'
      },
      winners: {
        my: 'GET /winners/my'
      },
          pot: {
            get: 'GET /pot'
          },
          admin: {
            createDraw: 'POST /admin/draws/create',
            generateDraw: 'POST /admin/draws/generate',
            calculateWinners: 'POST /admin/draws/:drawId/calculate-winners',
            executeDraw: 'POST /admin/draws/:drawId/execute',
            treasuryBalance: 'GET /admin/treasury/balance',
            sendPayout: 'POST /admin/payouts/send',
            stats: 'GET /admin/stats'
          }
    }
  });
});

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { wallet_address } = req.body;
    
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ wallet_address })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    res.status(201).json({ 
      message: 'User created successfully',
      user: { id: user.id, wallet_address: user.wallet_address }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Wallet Connect Authentication
app.post('/auth/wallet-connect', async (req, res) => {
  try {
    const { wallet_address, signature, message } = req.body;
    
    if (!wallet_address || !signature || !message) {
      return res.status(400).json({ 
        error: 'Wallet address, signature, and message are required' 
      });
    }

    // TODO: Verify signature with Solana
    // For now, we'll trust the frontend verification
    
    // Check if user exists
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    let userId;
    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({ wallet_address })
        .select()
        .single();

      if (createError) {
        console.error('User creation error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userId = newUser.id;
    } else {
      userId = user.id;
    }

    // Generate JWT token (simplified for now)
    const token = Buffer.from(`${userId}:${wallet_address}`).toString('base64');

    res.json({
      message: 'Wallet connected successfully',
      token,
      user: { id: userId, wallet_address }
    });
  } catch (error) {
    console.error('Wallet connect error:', error);
    res.status(500).json({ error: 'Wallet connection failed' });
  }
});

// Get current user
app.get('/auth/me', authenticateUser, async (req, res) => {
  try {
    // User is already authenticated and available in req.user
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Ticket routes
app.post('/tickets', authenticateUser, async (req, res) => {
  try {
    const { numbers, powerball, transaction_hash } = req.body;
    
    // Validate input
    if (!numbers || !Array.isArray(numbers) || numbers.length !== 5) {
      return res.status(400).json({ error: 'Must provide exactly 5 numbers' });
    }
    
    if (!powerball || powerball < 1 || powerball > 10) {
      return res.status(400).json({ error: 'Powerball must be between 1 and 10' });
    }
    
    if (!transaction_hash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    // Validate numbers are between 1-30 and unique
    const validNumbers = numbers.every(num => num >= 1 && num <= 30);
    const uniqueNumbers = new Set(numbers).size === numbers.length;
    
    if (!validNumbers || !uniqueNumbers) {
      return res.status(400).json({ 
        error: 'Numbers must be between 1-30 and unique' 
      });
    }

    // Create ticket
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        user_id: req.user.id,
        numbers,
        powerball,
        transaction_hash
      })
      .select()
      .single();

    if (error) {
      console.error('Ticket creation error:', error);
      return res.status(500).json({ error: 'Failed to create ticket' });
    }

    // Update pot tracking (create pot record if it doesn't exist)
    try {
      const { data: existingPot } = await supabaseAdmin
        .from('pot')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingPot) {
        // Update existing pot
        await supabaseAdmin
          .from('pot')
          .update({
            current_amount: existingPot.current_amount + 0.05,
            total_tickets_sold: existingPot.total_tickets_sold + 1,
            total_revenue: existingPot.total_revenue + 0.05,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingPot.id);
      } else {
        // Create new pot record
        await supabaseAdmin
          .from('pot')
          .insert({
            current_amount: 0.05,
            total_tickets_sold: 1,
            total_revenue: 0.05
          });
      }
    } catch (potError) {
      console.log('Pot tracking not available yet - table may not exist');
    }

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: {
        id: ticket.id,
        numbers: ticket.numbers,
        powerball: ticket.powerball,
        created_at: ticket.created_at
      }
    });
  } catch (error) {
    console.error('Ticket creation error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.get('/tickets/my', authenticateUser, async (req, res) => {
  try {
    console.log('Fetching tickets for user:', req.user.id);
    
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    console.log('Tickets query result:', { tickets, error });

    if (error) {
      console.error('Fetch tickets error:', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }

    res.json({ tickets });
  } catch (error) {
    console.error('Fetch tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Draw routes
app.get('/draws', async (req, res) => {
  try {
    const { data: draws, error } = await supabase
      .from('draws')
      .select('*')
      .order('draw_date', { ascending: false });

    if (error) {
      console.error('Fetch draws error:', error);
      return res.status(500).json({ error: 'Failed to fetch draws' });
    }

    res.json({ draws });
  } catch (error) {
    console.error('Fetch draws error:', error);
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

app.get('/draws/latest', async (req, res) => {
  try {
    const { data: draw, error } = await supabase
      .from('draws')
      .select('*')
      .order('draw_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Fetch latest draw error:', error);
      return res.status(500).json({ error: 'Failed to fetch latest draw' });
    }

    res.json({ draw });
  } catch (error) {
    console.error('Fetch latest draw error:', error);
    res.status(500).json({ error: 'Failed to fetch latest draw' });
  }
});

// Winner routes
app.get('/winners/my', authenticateUser, async (req, res) => {
  try {
    const { data: winners, error } = await supabase
      .from('winners')
      .select(`
        *,
        tickets!inner(user_id),
        draws(*)
      `)
      .eq('tickets.user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch winners error:', error);
      return res.status(500).json({ error: 'Failed to fetch winners' });
    }

    res.json({ winners });
  } catch (error) {
    console.error('Fetch winners error:', error);
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

// Payment routes
app.post('/payments/create-intent', authenticateUser, async (req, res) => {
  try {
    const { ticket_count = 1 } = req.body;
    const ticket_price = 0.05; // 0.05 SOL per ticket
    const total_amount = ticket_price * ticket_count;

    // Generate payment intent ID
    const payment_intent_id = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      payment_intent_id,
      amount_sol: total_amount,
      ticket_count,
      ticket_price,
      recipient_address: process.env.TREASURY_WALLET,
      memo: `Powerball tickets: ${ticket_count}`,
      rpc_url: process.env.HELIUS_RPC_URL
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

app.post('/payments/verify', authenticateUser, async (req, res) => {
  try {
    const { transaction_hash, payment_intent_id } = req.body;
    
    if (!transaction_hash || !payment_intent_id) {
      return res.status(400).json({ 
        error: 'Transaction hash and payment intent ID are required' 
      });
    }

    // TODO: Verify transaction on Solana blockchain
    // For now, we'll assume the transaction is valid
    
    res.json({
      verified: true,
      transaction_hash,
      payment_intent_id,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Enhanced ticket routes
app.post('/tickets/bulk', authenticateUser, async (req, res) => {
  try {
    const { tickets, transaction_hash } = req.body;
    
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'Tickets array is required' });
    }

    if (!transaction_hash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    // Validate all tickets
    for (const ticket of tickets) {
      if (!ticket.numbers || !Array.isArray(ticket.numbers) || ticket.numbers.length !== 5) {
        return res.status(400).json({ error: 'Each ticket must have exactly 5 numbers' });
      }
      
      if (!ticket.powerball || ticket.powerball < 1 || ticket.powerball > 10) {
        return res.status(400).json({ error: 'Powerball must be between 1 and 10' });
      }

      // Validate numbers are between 1-30 and unique
      const validNumbers = ticket.numbers.every(num => num >= 1 && num <= 30);
      const uniqueNumbers = new Set(ticket.numbers).size === ticket.numbers.length;
      
      if (!validNumbers || !uniqueNumbers) {
        return res.status(400).json({ 
          error: 'Numbers must be between 1-30 and unique' 
        });
      }
    }

    // Create all tickets
    const ticketData = tickets.map(ticket => ({
      user_id: req.user.id,
      numbers: ticket.numbers,
      powerball: ticket.powerball,
      transaction_hash
    }));

    const { data: createdTickets, error } = await supabaseAdmin
      .from('tickets')
      .insert(ticketData)
      .select();

    if (error) {
      console.error('Bulk ticket creation error:', error);
      return res.status(500).json({ error: 'Failed to create tickets' });
    }

    res.status(201).json({
      message: 'Tickets created successfully',
      tickets: createdTickets,
      count: createdTickets.length
    });
  } catch (error) {
    console.error('Bulk ticket creation error:', error);
    res.status(500).json({ error: 'Failed to create tickets' });
  }
});

app.get('/tickets/active', authenticateUser, async (req, res) => {
  try {
    // Get the latest draw date
    const { data: latestDraw } = await supabase
      .from('draws')
      .select('draw_date')
      .order('draw_date', { ascending: false })
      .limit(1)
      .single();

    const drawDate = latestDraw?.draw_date || new Date().toISOString().split('T')[0];

    // Get tickets for current draw period
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('created_at', drawDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch active tickets error:', error);
      return res.status(500).json({ error: 'Failed to fetch active tickets' });
    }

    res.json({ 
      tickets,
      draw_date: drawDate,
      count: tickets.length
    });
  } catch (error) {
    console.error('Fetch active tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch active tickets' });
  }
});

// Pot routes
app.get('/pot', async (req, res) => {
  try {
    const { data: pot, error } = await supabaseAdmin
      .from('pot')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Get pot error:', error);
      return res.status(500).json({ error: 'Failed to get pot information' });
    }

    res.json({ pot });
  } catch (error) {
    console.error('Get pot error:', error);
    res.status(500).json({ error: 'Failed to get pot information' });
  }
});

// Generate random winning numbers
app.post('/admin/draws/generate', async (req, res) => {
  try {
    // Generate 5 unique numbers between 1-30
    const winning_numbers = [];
    while (winning_numbers.length < 5) {
      const num = Math.floor(Math.random() * 30) + 1;
      if (!winning_numbers.includes(num)) {
        winning_numbers.push(num);
      }
    }
    winning_numbers.sort((a, b) => a - b);

    // Generate powerball between 1-10
    const powerball = Math.floor(Math.random() * 10) + 1;

    const { data: draw, error } = await supabaseAdmin
      .from('draws')
      .insert({
        winning_numbers,
        powerball,
        draw_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Generate draw error:', error);
      return res.status(500).json({ error: 'Failed to generate draw' });
    }

    res.status(201).json({ 
      message: 'Draw generated successfully',
      draw: {
        id: draw.id,
        winning_numbers: draw.winning_numbers,
        powerball: draw.powerball,
        draw_date: draw.draw_date
      }
    });
  } catch (error) {
    console.error('Generate draw error:', error);
    res.status(500).json({ error: 'Failed to generate draw' });
  }
});

// Calculate winners for a draw
app.post('/admin/draws/:drawId/calculate-winners', async (req, res) => {
  try {
    const { drawId } = req.params;
    
    // Get the draw
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draws')
      .select('*')
      .eq('id', drawId)
      .single();

    if (drawError || !draw) {
      return res.status(404).json({ error: 'Draw not found' });
    }

    // Get all tickets for this draw period (assuming tickets are for current draw)
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (ticketsError) {
      console.error('Get tickets error:', ticketsError);
      return res.status(500).json({ error: 'Failed to get tickets' });
    }

    const winners = [];
    const winningNumbers = draw.winning_numbers;
    const winningPowerball = draw.powerball;

    // Calculate matches for each ticket
    for (const ticket of tickets) {
      const ticketNumbers = ticket.numbers;
      const ticketPowerball = ticket.powerball;
      
      // Count matching numbers
      const matchingNumbers = ticketNumbers.filter(num => winningNumbers.includes(num)).length;
      const powerballMatch = ticketPowerball === winningPowerball;

      let prizeTier = 0;
      let prizeAmount = 0;

      // Determine prize tier
      if (matchingNumbers === 5 && powerballMatch) {
        prizeTier = 1; // Jackpot
      } else if (matchingNumbers === 5) {
        prizeTier = 2; // 5 numbers
      } else if (matchingNumbers === 4 && powerballMatch) {
        prizeTier = 3; // 4 + powerball
      } else if (matchingNumbers === 4) {
        prizeTier = 4; // 4 numbers
      } else if (matchingNumbers === 3 && powerballMatch) {
        prizeTier = 5; // 3 + powerball
      } else if (matchingNumbers === 3) {
        prizeTier = 6; // 3 numbers
      }

      if (prizeTier > 0) {
        winners.push({
          ticket_id: ticket.id,
          user_id: ticket.user_id,
          wallet_address: ticket.user_id, // We'll need to get this from users table
          prize_tier: prizeTier,
          matching_numbers: matchingNumbers,
          powerball_match: powerballMatch,
          prize_amount: prizeAmount // Will be calculated based on pot
        });
      }
    }

    // Get current pot amount
    const { data: pot } = await supabaseAdmin
      .from('pot')
      .select('current_amount')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const totalPot = pot ? parseFloat(pot.current_amount) : 0;

    // Calculate prize amounts based on pot (85% to winners, 15% revenue)
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

    // Update winners with prize amounts
    const finalWinners = winners.map(winner => ({
      ...winner,
      prize_amount: prizeDistribution[winner.prize_tier] || 0
    }));

    // Save winners to database
    if (finalWinners.length > 0) {
      const { error: winnersError } = await supabaseAdmin
        .from('winners')
        .insert(finalWinners.map(winner => ({
          draw_id: drawId,
          ticket_id: winner.ticket_id,
          user_id: winner.user_id,
          prize_tier: winner.prize_tier,
          prize_amount: winner.prize_amount,
          matching_numbers: winner.matching_numbers,
          powerball_match: winner.powerball_match
        })));

      if (winnersError) {
        console.error('Save winners error:', winnersError);
        return res.status(500).json({ error: 'Failed to save winners' });
      }
    }

    res.json({
      message: 'Winners calculated successfully',
      draw: {
        id: draw.id,
        winning_numbers: draw.winning_numbers,
        powerball: draw.powerball,
        draw_date: draw.draw_date
      },
      winners: finalWinners,
      total_winners: finalWinners.length,
      total_pot: totalPot
    });
  } catch (error) {
    console.error('Calculate winners error:', error);
    res.status(500).json({ error: 'Failed to calculate winners' });
  }
});

// Admin routes
app.post('/admin/draws/create', async (req, res) => {
  try {
    const { winning_numbers, powerball, draw_date } = req.body;
    
    if (!winning_numbers || !Array.isArray(winning_numbers) || winning_numbers.length !== 5) {
      return res.status(400).json({ error: 'Must provide exactly 5 winning numbers' });
    }
    
    if (!powerball || powerball < 1 || powerball > 10) {
      return res.status(400).json({ error: 'Powerball must be between 1 and 10' });
    }

    // Validate numbers are between 1-30 and unique
    const validNumbers = winning_numbers.every(num => num >= 1 && num <= 30);
    const uniqueNumbers = new Set(winning_numbers).size === winning_numbers.length;
    
    if (!validNumbers || !uniqueNumbers) {
      return res.status(400).json({ 
        error: 'Winning numbers must be between 1-30 and unique' 
      });
    }

    // Create draw
    const { data: draw, error } = await supabaseAdmin
      .from('draws')
      .insert({
        winning_numbers,
        powerball,
        draw_date: draw_date || new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) {
      console.error('Create draw error:', error);
      return res.status(500).json({ error: 'Failed to create draw' });
    }

    res.status(201).json({
      message: 'Draw created successfully',
      draw
    });
  } catch (error) {
    console.error('Create draw error:', error);
    res.status(500).json({ error: 'Failed to create draw' });
  }
});

app.post('/admin/draws/execute', async (req, res) => {
  try {
    const { draw_id } = req.body;
    
    if (!draw_id) {
      return res.status(400).json({ error: 'Draw ID is required' });
    }

    // Get the draw
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draws')
      .select('*')
      .eq('id', draw_id)
      .single();

    if (drawError || !draw) {
      return res.status(404).json({ error: 'Draw not found' });
    }

    // Get all tickets for this draw period
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        users!inner(wallet_address)
      `)
      .eq('created_at', draw.draw_date);

    if (ticketsError) {
      console.error('Get tickets error:', ticketsError);
      return res.status(500).json({ error: 'Failed to get tickets' });
    }

    // Calculate winners
    const winners = [];
    const payouts = [];

    for (const ticket of tickets) {
      const matches = ticket.numbers.filter(num => 
        draw.winning_numbers.includes(num)
      ).length;
      
      const powerballMatch = ticket.powerball === draw.powerball;
      
      // Calculate prize based on matches
      let prizeAmount = 0;
      let prizeTier = 'none';
      
      if (matches === 5 && powerballMatch) {
        prizeAmount = 1000000.00; // Jackpot
        prizeTier = 'jackpot';
      } else if (matches === 5) {
        prizeAmount = 100000.00;
        prizeTier = '5_numbers';
      } else if (matches === 4 && powerballMatch) {
        prizeAmount = 10000.00;
        prizeTier = '4_numbers_powerball';
      } else if (matches === 4) {
        prizeAmount = 1000.00;
        prizeTier = '4_numbers';
      } else if (matches === 3 && powerballMatch) {
        prizeAmount = 100.00;
        prizeTier = '3_numbers_powerball';
      } else if (matches === 3) {
        prizeAmount = 10.00;
        prizeTier = '3_numbers';
      } else if (matches === 2 && powerballMatch) {
        prizeAmount = 5.00;
        prizeTier = '2_numbers_powerball';
      } else if (powerballMatch) {
        prizeAmount = 2.00;
        prizeTier = 'powerball_only';
      }

      if (prizeAmount > 0) {
        winners.push({
          ticket_id: ticket.id,
          draw_id: draw.id,
          match_count: matches,
          powerball_match: powerballMatch,
          prize_amount: prizeAmount,
          prize_tier: prizeTier,
          winner_wallet: ticket.users.wallet_address
        });

        payouts.push({
          winnerWallet: ticket.users.wallet_address,
          amount: prizeAmount,
          prize_tier: prizeTier,
          ticket_id: ticket.id
        });
      }
    }

    // Insert winners into database
    if (winners.length > 0) {
      const { error: winnersError } = await supabaseAdmin
        .from('winners')
        .insert(winners);

      if (winnersError) {
        console.error('Insert winners error:', winnersError);
        return res.status(500).json({ error: 'Failed to insert winners' });
      }
    }

    // Send payouts via Solana
    let payoutResults = [];
    if (payouts.length > 0) {
      try {
        payoutResults = await solanaService.sendBulkPayouts(payouts);
      } catch (error) {
        console.error('Payout error:', error);
        // Continue even if payouts fail - winners are still recorded
      }
    }

    res.json({
      message: 'Draw executed successfully',
      draw,
      winners_count: winners.length,
      total_prize_amount: winners.reduce((sum, w) => sum + w.prize_amount, 0),
      winners,
      payout_results: payoutResults
    });
  } catch (error) {
    console.error('Execute draw error:', error);
    res.status(500).json({ error: 'Failed to execute draw' });
  }
});

app.get('/admin/treasury/balance', async (req, res) => {
  try {
    const balance = await solanaService.getTreasuryBalance();
    res.json({
      treasury_wallet: process.env.TREASURY_WALLET,
      balance_sol: balance,
      balance_lamports: Math.floor(balance * 1000000000) // Convert to lamports
    });
  } catch (error) {
    console.error('Get treasury balance error:', error);
    res.status(500).json({ error: 'Failed to get treasury balance' });
  }
});

app.post('/admin/payouts/send', async (req, res) => {
  try {
    const { winner_wallet, amount_sol } = req.body;
    
    if (!winner_wallet || !amount_sol) {
      return res.status(400).json({ 
        error: 'Winner wallet and amount are required' 
      });
    }

    const result = await solanaService.sendPayout(winner_wallet, amount_sol);
    res.json(result);
  } catch (error) {
    console.error('Send payout error:', error);
    res.status(500).json({ error: 'Failed to send payout' });
  }
});

app.get('/admin/stats', async (req, res) => {
  try {
    // Get total tickets sold
    const { count: totalTickets } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    // Get total revenue (0.05 SOL per ticket)
    const totalRevenue = (totalTickets || 0) * 0.05;

    // Get total winners
    const { count: totalWinners } = await supabaseAdmin
      .from('winners')
      .select('*', { count: 'exact', head: true });

    // Get total prize amount paid
    const { data: winners } = await supabaseAdmin
      .from('winners')
      .select('prize_amount');
    
    const totalPrizesPaid = winners?.reduce((sum, w) => sum + w.prize_amount, 0) || 0;

    // Get treasury balance
    const treasuryBalance = await solanaService.getTreasuryBalance();

    res.json({
      total_tickets_sold: totalTickets || 0,
      total_revenue_sol: totalRevenue,
      total_winners: totalWinners || 0,
      total_prizes_paid_sol: totalPrizesPaid,
      treasury_balance_sol: treasuryBalance,
      profit_sol: totalRevenue - totalPrizesPaid
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Execute complete draw with payouts
app.post('/admin/draws/:drawId/execute', async (req, res) => {
  try {
    const { drawId } = req.params;
    
    // First calculate winners
    const calculateResponse = await fetch(`http://localhost:${PORT}/admin/draws/${drawId}/calculate-winners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!calculateResponse.ok) {
      return res.status(500).json({ error: 'Failed to calculate winners' });
    }
    
    const calculateResult = await calculateResponse.json();
    const winners = calculateResult.winners;
    
    if (winners.length === 0) {
      return res.json({
        message: 'No winners found for this draw',
        draw: calculateResult.draw,
        total_winners: 0
      });
    }

    // Get user wallet addresses for winners
    const winnerUserIds = winners.map(w => w.user_id);
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address')
      .in('id', winnerUserIds);

    if (usersError) {
      console.error('Get users error:', usersError);
      return res.status(500).json({ error: 'Failed to get winner details' });
    }

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user.wallet_address;
      return acc;
    }, {});

    // Send payouts to all winners
    const payoutResults = [];
    const solanaService = require('./lib/solana');

    for (const winner of winners) {
      const walletAddress = userMap[winner.user_id];
      if (!walletAddress) {
        console.error(`No wallet address found for user ${winner.user_id}`);
        continue;
      }

      try {
        const payoutResult = await solanaService.sendPayout(
          walletAddress,
          winner.prize_amount
        );

        payoutResults.push({
          winner_id: winner.user_id,
          ticket_id: winner.ticket_id,
          prize_tier: winner.prize_tier,
          prize_amount: winner.prize_amount,
          wallet_address: walletAddress,
          payout_success: payoutResult.success,
          transaction_signature: payoutResult.transaction_signature,
          error: payoutResult.error
        });

        // Update winner record if payout was successful
        if (payoutResult.success) {
          await supabaseAdmin
            .from('winners')
            .update({
              payout_transaction: payoutResult.transaction_signature,
              payout_sent: true,
              payout_date: new Date().toISOString()
            })
            .eq('ticket_id', winner.ticket_id)
            .eq('draw_id', drawId);
        }
      } catch (payoutError) {
        console.error(`Payout error for winner ${winner.user_id}:`, payoutError);
        payoutResults.push({
          winner_id: winner.user_id,
          ticket_id: winner.ticket_id,
          prize_tier: winner.prize_tier,
          prize_amount: winner.prize_amount,
          wallet_address: walletAddress,
          payout_success: false,
          error: payoutError.message
        });
      }
    }

    // Update pot to reflect payouts and revenue
    const totalPayouts = payoutResults
      .filter(r => r.payout_success)
      .reduce((sum, r) => sum + r.prize_amount, 0);

    if (totalPayouts > 0) {
      // Calculate revenue (15% of total pot)
      const totalPot = calculateResult.total_pot || 0;
      const revenue = totalPot * 0.15;
      
      await supabaseAdmin
        .from('pot')
        .update({
          current_amount: revenue, // Keep 15% as revenue, reset to 0 for next draw
          last_updated: new Date().toISOString()
        })
        .order('created_at', { ascending: false })
        .limit(1);
    }

    res.json({
      message: 'Draw executed successfully',
      draw: calculateResult.draw,
      total_winners: winners.length,
      successful_payouts: payoutResults.filter(r => r.payout_success).length,
      failed_payouts: payoutResults.filter(r => !r.payout_success).length,
      total_payout_amount: totalPayouts,
      revenue_kept: totalPayouts > 0 ? (calculateResult.total_pot || 0) * 0.15 : 0,
      payout_results: payoutResults
    });
  } catch (error) {
    console.error('Execute draw error:', error);
    res.status(500).json({ error: 'Failed to execute draw' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Powerball Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API docs: http://localhost:${PORT}/`);
});

module.exports = app;
