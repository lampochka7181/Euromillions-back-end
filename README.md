# Powerball Lottery Backend

A blockchain-powered lottery application built with Supabase and Solana integration.

## Features

- 🎲 **Lottery System**: Pick 5 numbers (1-30) + 1 powerball (1-10)
- 🔐 **Wallet Authentication**: Connect with Phantom wallet
- 💰 **Solana Integration**: Pay 0.05 SOL per ticket
- 🏆 **Prize System**: Multiple prize tiers based on matches
- 📊 **Real-time Data**: Supabase real-time subscriptions
- 🔒 **Security**: Row Level Security (RLS) policies

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Blockchain**: Solana
- **Real-time**: Supabase Realtime

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

Fill in your Supabase credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Supabase Setup

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```

4. Run migrations:
```bash
supabase db push
```

#### Option B: Manual Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/migrations/20240101000000_initial_schema.sql` in your Supabase SQL editor
3. Configure Row Level Security policies as needed

### 4. Start Development Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user with wallet address

### Tickets
- `POST /tickets` - Create new lottery ticket (requires auth)
- `GET /tickets/my` - Get user's tickets (requires auth)

### Draws
- `GET /draws` - Get all draws
- `GET /draws/latest` - Get latest draw

### Winners
- `GET /winners/my` - Get user's winnings (requires auth)

### System
- `GET /health` - Health check endpoint

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `wallet_address` (TEXT, Unique)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Tickets Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `numbers` (INTEGER[], 5 numbers 1-30)
- `powerball` (INTEGER, 1-10)
- `transaction_hash` (TEXT, Unique)
- `created_at` (TIMESTAMP)

### Draws Table
- `id` (UUID, Primary Key)
- `winning_numbers` (INTEGER[], 5 numbers 1-30)
- `powerball` (INTEGER, 1-10)
- `draw_date` (DATE)
- `created_at` (TIMESTAMP)

### Winners Table
- `id` (UUID, Primary Key)
- `ticket_id` (UUID, Foreign Key)
- `draw_id` (UUID, Foreign Key)
- `match_count` (INTEGER)
- `powerball_match` (BOOLEAN)
- `prize_amount` (DECIMAL)
- `claimed` (BOOLEAN)
- `created_at` (TIMESTAMP)

## Prize Structure

| Matches | Powerball | Prize |
|---------|-----------|-------|
| 5 | Yes | $1,000,000 (Jackpot) |
| 5 | No | $100,000 |
| 4 | Yes | $10,000 |
| 4 | No | $1,000 |
| 3 | Yes | $100 |
| 3 | No | $10 |
| 2 | Yes | $5 |
| 0 | Yes | $2 |

## Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Input Validation**: Server-side validation for all inputs
- **Authentication**: JWT-based authentication with Supabase
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Proper CORS setup for frontend integration

## Development

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Docker
```bash
# Build image
docker build -t powerball-backend .

# Run container
docker run -p 3000:3000 --env-file .env powerball-backend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details


