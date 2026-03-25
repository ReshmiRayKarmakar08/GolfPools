require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database connection failed or tables do not exist:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Connection successful. The users table exists!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testConnection();
