const cron = require('node-cron');
const https = require('https');
const { supabaseAdmin, isConfigured } = require('../config/supabase');

if (!isConfigured) {
  console.log('[CRON] Supabase not configured — cron jobs disabled');
  module.exports = {};
  return;
}

const drawService = require('./drawService');

console.log('[CRON] Cron jobs initialized');

// Monthly draw - runs on the last day of each month at 8 PM
cron.schedule('0 20 28-31 * *', async () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Only execute if tomorrow is the 1st (i.e., today is last day of month)
  if (tomorrow.getDate() !== 1) return;

  console.log(`[CRON] Running monthly draw for ${today.getMonth() + 1}/${today.getFullYear()}`);

  try {
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const { data: existingDraw } = await supabaseAdmin
      .from('monthly_draws')
      .select('id, status')
      .eq('draw_month', month)
      .eq('draw_year', year)
      .maybeSingle();

    if (existingDraw && existingDraw.status === 'completed') {
      console.log('[CRON] Draw already completed');
      return;
    }

    let drawId;

    if (!existingDraw) {
      const winning_numbers = drawService.generateWinningNumbers('random');
      const prizePool = await drawService.calculateMonthlyPrizePool(month, year);
      const jackpotRollover = await drawService.getJackpotRollover(month - 1, year);

      const { data: draw } = await supabaseAdmin
        .from('monthly_draws')
        .insert({
          draw_month: month,
          draw_year: year,
          winning_numbers,
          draw_type: 'random',
          total_pool: prizePool,
          five_match_pool: (prizePool * 0.40) + jackpotRollover,
          four_match_pool: prizePool * 0.35,
          three_match_pool: prizePool * 0.25,
          jackpot_amount: jackpotRollover,
          status: 'scheduled'
        })
        .select()
        .single();

      drawId = draw.id;
    } else {
      drawId = existingDraw.id;
    }

    await drawService.executeDraw(drawId, null);
    console.log(`[CRON] Draw executed successfully for ${month}/${year}`);
  } catch (err) {
    console.error('[CRON] Draw execution failed:', err);
  }
});

// Check and expire subscriptions daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Checking expired subscriptions');
  try {
    const now = new Date().toISOString();

    const { data: expiredSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, cancel_at_period_end')
      .eq('status', 'active')
      .lt('current_period_end', now);

    for (const sub of expiredSubs || []) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: sub.cancel_at_period_end ? 'cancelled' : 'expired' })
        .eq('id', sub.id);

      await supabaseAdmin.from('notifications').insert({
        user_id: sub.user_id,
        type: 'subscription_expired',
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Renew to continue participating in draws.',
      });
    }

    if (expiredSubs?.length > 0) {
      console.log(`[CRON] Expired ${expiredSubs.length} subscriptions`);
    }
  } catch (err) {
    console.error('[CRON] Subscription check failed:', err);
  }
});

// =============================================
// Keep-Alive Ping (Runs every 10 minutes)
// 1. Pings Render backend HTTP endpoint to keep service awake
// 2. Executes query on Supabase DB to reset the 7-day inactivity pause
// =============================================
const http = require('http');

const performKeepAlive = async () => {
  const timestamp = new Date().toISOString();
  console.log(`[CRON ${timestamp}] Starting 10-minute keep-alive ping...`);

  // 1. Ping Render Server
  const backendUrl = process.env.BACKEND_URL || 'https://golfpools.onrender.com';
  try {
    const client = backendUrl.startsWith('https') ? https : http;
    const req = client.get(`${backendUrl}/health/server`, { timeout: 10000 }, (res) => {
      console.log(`[CRON ${timestamp}] Render keep-alive ping status: ${res.statusCode}`);
    });
    req.on('error', (err) => {
      console.warn(`[CRON ${timestamp}] Render self-ping note (${backendUrl}):`, err.message);
    });
    req.on('timeout', () => {
      req.destroy();
      console.warn(`[CRON ${timestamp}] Render self-ping timed out`);
    });
  } catch (pingErr) {
    console.warn(`[CRON ${timestamp}] Render ping error:`, pingErr.message);
  }

  // 2. Query Supabase directly to register database activity and prevent 7-day pause
  try {
    const start = Date.now();
    const { data, error } = await supabaseAdmin
      .from('charities')
      .select('id')
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      console.error(`[CRON ${timestamp}] ⚠️ Supabase keep-alive FAILED (${latency}ms):`, error.message);
      console.error(`[CRON ${timestamp}] ⚠️ IMPORTANT: If project was paused in Supabase, visit https://supabase.com/dashboard to unpause/restore it!`);
    } else {
      console.log(`[CRON ${timestamp}] ✅ Supabase keep-alive: ACTIVE (${latency}ms latency). 7-day timer reset.`);
    }
  } catch (err) {
    console.error(`[CRON ${timestamp}] ⚠️ Supabase keep-alive unexpected error:`, err.message);
  }
};

// Schedule every 10 minutes
cron.schedule('*/10 * * * *', performKeepAlive);

// Also trigger once on startup after 5 seconds
setTimeout(() => {
  performKeepAlive();
}, 5000);

module.exports = {};

