// Load environment variables first
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { createClient } = require('@supabase/supabase-js')

// Set environment variables directly if not loaded from .env
const supabaseUrl = process.env.SUPABASE_URL || 'https://oimtzyiyifhlqutjqtze.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXR6eWl5aWZobHF1dGpxdHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDkxMDYsImV4cCI6MjA3NDY4NTEwNn0.dxUguKvJWKek4fQ-W0wPJ6T19c4lYvLVofA5dGeAM-w'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXR6eWl5aWZobHF1dGpxdHplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwOTEwNiwiZXhwIjoyMDc0Njg1MTA2fQ.ReA1kixV3W7okM8u04zoOkD4ZdFilaeqj8elUzM77YI'

console.log('🚀 Supabase client initialized successfully!')

// Client for client-side operations
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations with elevated permissions
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

module.exports = {
  supabase,
  supabaseAdmin
}
