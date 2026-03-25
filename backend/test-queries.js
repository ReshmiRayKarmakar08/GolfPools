require('dotenv').config({ path: '../.env' });
const { supabaseAdmin } = require('./src/config/supabase');

async function testQueries() {
  console.log('Testing Queries...');
  
  // Get an existing user
  const { data: users, error: userErr } = await supabaseAdmin.from('users').select('id').limit(1);
  if (userErr || !users || users.length === 0) {
    console.error('Failed to get a user:', userErr);
    return;
  }
  const userId = users[0].id;
  console.log('User ID:', userId);

  // Test 1: auth/me user query
  const { data: q1, error: e1 } = await supabaseAdmin
    .from('users')
    .select(`id, email, first_name, last_name, phone, avatar_url, role, email_verified, handicap, golf_club, created_at`)
    .eq('id', userId)
    .single();
  if (e1) console.error('Error in Q1 (users):', e1);
  else console.log('Q1 passed.');

  // Test 2: auth/me subscription query
  const { data: q2, error: e2 } = await supabaseAdmin
    .from('subscriptions')
    .select(`id, plan_type, status, amount, currency, current_period_start, current_period_end, charity_id, charity_percentage, charities(id, name, logo_url)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e2) console.error('Error in Q2 (subscriptions with charities):', e2);
  else console.log('Q2 passed.');

  // Test 3: scores GET query
  const { data: q3, error: e3 } = await supabaseAdmin
    .from('golf_scores')
    .select('id, score, score_date, course_name, notes, created_at')
    .eq('user_id', userId)
    .order('score_date', { ascending: false });
  if (e3) console.error('Error in Q3 (scores):', e3);
  else console.log('Q3 passed.');

}

testQueries();
