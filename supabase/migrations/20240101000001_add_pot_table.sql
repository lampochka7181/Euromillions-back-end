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

-- Create function to update pot when tickets are created
CREATE OR REPLACE FUNCTION update_pot_on_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update pot with new ticket sale (0.05 SOL per ticket)
    UPDATE pot 
    SET 
        current_amount = current_amount + 0.05,
        total_tickets_sold = total_tickets_sold + 1,
        total_revenue = total_revenue + 0.05,
        last_updated = NOW()
    WHERE id = (SELECT id FROM pot ORDER BY created_at DESC LIMIT 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update pot when tickets are created
CREATE TRIGGER trigger_update_pot_on_ticket_creation
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_pot_on_ticket_creation();

-- Create function to update pot when payouts are made
CREATE OR REPLACE FUNCTION update_pot_on_payout()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract payout amount from pot
    UPDATE pot 
    SET 
        current_amount = current_amount - NEW.amount_sol,
        last_updated = NOW()
    WHERE id = (SELECT id FROM pot ORDER BY created_at DESC LIMIT 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update pot when payouts are made
CREATE TRIGGER trigger_update_pot_on_payout
    AFTER INSERT ON winners
    FOR EACH ROW
    EXECUTE FUNCTION update_pot_on_payout();

-- Add RLS policies for pot table
ALTER TABLE pot ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read pot data (public information)
CREATE POLICY "Pot is viewable by everyone" ON pot
    FOR SELECT USING (true);

-- Only service role can update pot (via triggers)
CREATE POLICY "Only service role can update pot" ON pot
    FOR UPDATE USING (auth.role() = 'service_role');

-- Only service role can insert pot records
CREATE POLICY "Only service role can insert pot" ON pot
    FOR INSERT WITH CHECK (auth.role() = 'service_role');


