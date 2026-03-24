const cron = require('node-cron');
const { supabaseAdmin } = require('../config/supabase');
const drawService = require('./drawService');

console.log('⏰ Cron jobs initialized');

// Monthly draw - runs on the last day of each month at 8 PM
// '0 20 28-31 * *' - Check if it's the last day of the month
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

    // Check if draw already exists
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
      // Create draw
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

    // Execute draw
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

module.exports = {};
