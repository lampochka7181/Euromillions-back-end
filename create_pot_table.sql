-- Create pot table to track total amount collected from ticket sales
CREATE TABLE IF NOT EXISTS pot (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    current_amount DECIMAL(20, 9) NOT NULL DEFAULT 0, -- Current pot amount in SOL
    total_tickets_sold INTEGER NOT NULL DEFAULT 0, -- Total number of tickets sold
    total_revenue DECIMAL(20, 9) NOT NULL DEFAULT 0, -- Total revenue from ticket sales
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial pot record
INSERT INTO pot (current_amount, total_tickets_sold, total_revenue) 
VALUES (0, 0, 0);

-- Add RLS policies for pot table
ALTER TABLE pot ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read pot data (public information)
CREATE POLICY "Pot is viewable by everyone" ON pot
    FOR SELECT USING (true);

-- Only service role can update pot
CREATE POLICY "Only service role can update pot" ON pot
    FOR UPDATE USING (auth.role() = 'service_role');

-- Only service role can insert pot records
CREATE POLICY "Only service role can insert pot" ON pot
    FOR INSERT WITH CHECK (auth.role() = 'service_role');


