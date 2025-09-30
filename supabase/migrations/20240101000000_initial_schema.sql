-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    numbers INTEGER[] NOT NULL CHECK (array_length(numbers, 1) = 5),
    powerball INTEGER NOT NULL CHECK (powerball >= 1 AND powerball <= 10),
    transaction_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create draws table
CREATE TABLE draws (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    winning_numbers INTEGER[] NOT NULL CHECK (array_length(winning_numbers, 1) = 5),
    powerball INTEGER NOT NULL CHECK (powerball >= 1 AND powerball <= 10),
    draw_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create winners table to track winning tickets
CREATE TABLE winners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
    match_count INTEGER NOT NULL,
    powerball_match BOOLEAN NOT NULL,
    prize_amount DECIMAL(10,2),
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_draws_draw_date ON draws(draw_date);
CREATE INDEX idx_winners_ticket_id ON winners(ticket_id);
CREATE INDEX idx_winners_draw_id ON winners(draw_id);
CREATE INDEX idx_winners_claimed ON winners(claimed);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate lottery numbers
CREATE OR REPLACE FUNCTION validate_lottery_numbers(numbers INTEGER[])
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

-- Add check constraint for numbers validation
ALTER TABLE tickets ADD CONSTRAINT check_numbers_valid 
    CHECK (validate_lottery_numbers(numbers));

-- Create function to calculate winnings
CREATE OR REPLACE FUNCTION calculate_winnings(
    ticket_numbers INTEGER[],
    ticket_powerball INTEGER,
    winning_numbers INTEGER[],
    winning_powerball INTEGER
)
RETURNS TABLE(match_count INTEGER, powerball_match BOOLEAN, prize_amount DECIMAL) AS $$
DECLARE
    matches INTEGER := 0;
    powerball_matches BOOLEAN := FALSE;
    prize DECIMAL := 0;
BEGIN
    -- Count number matches
    FOR i IN 1..5 LOOP
        IF ticket_numbers[i] = ANY(winning_numbers) THEN
            matches := matches + 1;
        END IF;
    END LOOP;
    
    -- Check powerball match
    powerball_matches := (ticket_powerball = winning_powerball);
    
    -- Calculate prize based on matches
    IF matches = 5 AND powerball_matches THEN
        prize := 1000000.00; -- Jackpot
    ELSIF matches = 5 THEN
        prize := 100000.00;
    ELSIF matches = 4 AND powerball_matches THEN
        prize := 10000.00;
    ELSIF matches = 4 THEN
        prize := 1000.00;
    ELSIF matches = 3 AND powerball_matches THEN
        prize := 100.00;
    ELSIF matches = 3 THEN
        prize := 10.00;
    ELSIF matches = 2 AND powerball_matches THEN
        prize := 5.00;
    ELSIF powerball_matches THEN
        prize := 2.00;
    END IF;
    
    RETURN QUERY SELECT matches, powerball_matches, prize;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can insert their own tickets
CREATE POLICY "Users can insert own tickets" ON tickets
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Anyone can view draws (public information)
CREATE POLICY "Anyone can view draws" ON draws
    FOR SELECT USING (true);

-- Only authenticated users can view their own winnings
CREATE POLICY "Users can view own winnings" ON winners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.id = winners.ticket_id 
            AND tickets.user_id::text = auth.uid()::text
        )
    );


