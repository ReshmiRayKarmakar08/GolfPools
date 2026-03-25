const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isConfigured = supabaseUrl &&
  supabaseServiceKey &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_PROJECT');

if (!isConfigured) {
  console.warn('\n⚠️  Supabase is NOT configured!');
  console.warn('   Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY in .env');
  console.warn('   The server will start but database operations will fail.\n');
}

// Admin client with service role (bypasses RLS)
const supabaseAdmin = isConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Public client with anon key
const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

module.exports = { supabase, supabaseAdmin, isConfigured };
