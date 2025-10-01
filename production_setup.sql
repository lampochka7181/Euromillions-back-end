-- ============================================
-- POWERBALL LOTTERY - PRODUCTION DATABASE SETUP
-- ============================================
-- This script creates all necessary tables, functions, triggers, and policies
-- Run this on your production Supabase instance
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    numbers INTEGER[] NOT NULL CHECK (array_length(numbers, 1) = 5),
    powerball INTEGER NOT NULL CHECK (powerball >= 1 AND powerball <= 10),
    transaction_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draws table
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    winning_numbers INTEGER[] NOT NULL CHECK (array_length(winning_numbers, 1) = 5),
    powerball INTEGER NOT NULL CHECK (powerball >= 1 AND powerball <= 10),
    draw_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Winners table
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE,
    match_count INTEGER NOT NULL,
    powerball_match BOOLEAN NOT NULL,
    prize_amount DECIMAL(10,2),
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pot table
CREATE TABLE IF NOT EXISTS public.pot (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    current_amount DECIMAL(20, 9) NOT NULL DEFAULT 0,
    total_tickets_sold INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(20, 9) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_draws_draw_date ON public.draws(draw_date);
CREATE INDEX IF NOT EXISTS idx_winners_ticket_id ON public.winners(ticket_id);
CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON public.winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_claimed ON public.winners(claimed);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate lottery numbers
CREATE OR REPLACE FUNCTION public.validate_lottery_numbers(numbers INTEGER[])
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if array has exactly 5 numbers
    IF array_length(numbers, 1) != 5 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if all numbers are between 1 and 30
    FOR i IN 1..5 LOOP
        IF numbers[i] < 1 OR numbers[i] > 30 THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    -- Check for duplicates
    FOR i IN 1..4 LOOP
        FOR j IN (i+1)..5 LOOP
            IF numbers[i] = numbers[j] THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update pot when tickets are created
CREATE OR REPLACE FUNCTION public.update_pot_on_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update pot with new ticket sale (0.05 SOL per ticket)
    UPDATE public.pot 
    SET 
        current_amount = current_amount + 0.05,
        total_tickets_sold = total_tickets_sold + 1,
        total_revenue = total_revenue + 0.05,
        last_updated = NOW()
    WHERE id = (SELECT id FROM public.pot ORDER BY created_at DESC LIMIT 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for users table updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to automatically update pot when tickets are created
DROP TRIGGER IF EXISTS trigger_update_pot_on_ticket_creation ON public.tickets;
CREATE TRIGGER trigger_update_pot_on_ticket_creation
    AFTER INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pot_on_ticket_creation();

-- ============================================
-- CONSTRAINTS
-- ============================================

-- Add check constraint for numbers validation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_numbers_valid'
    ) THEN
        ALTER TABLE public.tickets ADD CONSTRAINT check_numbers_valid 
            CHECK (validate_lottery_numbers(numbers));
    END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pot ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can view draws" ON public.draws;
DROP POLICY IF EXISTS "Users can view own winnings" ON public.winners;
DROP POLICY IF EXISTS "Pot is viewable by everyone" ON public.pot;
DROP POLICY IF EXISTS "Only service role can update pot" ON public.pot;
DROP POLICY IF EXISTS "Only service role can insert pot" ON public.pot;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Tickets policies
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Draws policies (public information)
CREATE POLICY "Anyone can view draws" ON public.draws
    FOR SELECT USING (true);

-- Winners policies
CREATE POLICY "Users can view own winnings" ON public.winners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets 
            WHERE tickets.id = winners.ticket_id 
            AND tickets.user_id::text = auth.uid()::text
        )
    );

-- Pot policies
CREATE POLICY "Pot is viewable by everyone" ON public.pot
    FOR SELECT USING (true);

CREATE POLICY "Only service role can update pot" ON public.pot
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can insert pot" ON public.pot
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert initial pot record if none exists
INSERT INTO public.pot (current_amount, total_tickets_sold, total_revenue) 
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.pot LIMIT 1);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment these to verify setup
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name;
-- SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- Your Powerball lottery database is now ready!
-- 
-- Tables created:
-- - users
-- - tickets
-- - draws
-- - winners
-- - pot
--
-- Features enabled:
-- - Row Level Security (RLS)
-- - Automatic pot tracking
-- - Number validation
-- - User data protection
-- 
-- Next steps:
-- 1. Configure your backend .env file
-- 2. Deploy your backend server
-- 3. The cron job will run automatically every Friday at 20:00 UTC
-- ============================================

