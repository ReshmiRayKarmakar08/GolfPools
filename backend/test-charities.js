require('dotenv').config({ path: '../.env' });
const { supabaseAdmin } = require('./src/config/supabase');

async function testCharities() {
  try {
    const { data: charities, error } = await supabaseAdmin
      .from('charities')
      .select('id, name, slug, short_description, logo_url, category, is_featured, total_raised, supporter_count')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('supporter_count', { ascending: false });

    if (error) {
       console.error('Supabase query error:', error);
       return;
    }
    
    console.log('✅ Found charities:', charities.length);
    console.log(charities[0]);
  } catch (err) {
    console.error('Catch Error:', err);
  }
}

testCharities();
