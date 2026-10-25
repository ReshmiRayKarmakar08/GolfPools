const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.get('/current', authenticate, async (req, res) => {
  try {
    const now = new Date();

    // 1. Fetch all active, queued, or pending subscriptions
    const { data: allSubs } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id, plan_type, status, amount, currency,
        current_period_start, current_period_end,
        cancel_at_period_end, cancelled_at, charity_percentage, charity_id, created_at,
        charities(id, name, logo_url, short_description)
      `)
      .eq('user_id', req.user.id)
      .in('status', ['active', 'queued', 'pending'])
      .order('created_at', { ascending: true });

    // 2. Fetch all captured payments for this user to reliably identify paid subscriptions
    const { data: userPayments } = await supabaseAdmin
      .from('payments')
      .select('subscription_id, status, created_at')
      .eq('user_id', req.user.id)
      .eq('status', 'captured');

    const paymentsBySubId = {};
    for (const p of userPayments || []) {
      if (p.subscription_id) paymentsBySubId[p.subscription_id] = p;
    }

    // 3. Immediately transition any cancel_at_period_end subscriptions to 'cancelled'
    for (const sub of allSubs || []) {
      if (sub.cancel_at_period_end) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled', cancel_at_period_end: false })
          .eq('id', sub.id);
        sub.status = 'cancelled';
      }
    }

    const liveSubs = (allSubs || []).filter(s => s.status !== 'cancelled' && !s.cancel_at_period_end);

    // 4. Separate Completed (Paid) vs Incomplete (Pending)
    const completedSubs = [];
    const pendingSubs = [];

    for (const sub of liveSubs) {
      if (paymentsBySubId[sub.id] || sub.status === 'active' || sub.status === 'queued') {
        completedSubs.push(sub);
      } else if (sub.status === 'pending') {
        pendingSubs.push(sub);
      }
    }

    let currentSub = null;
    const queuedSubs = [];

    if (completedSubs.length > 0) {
      let activeChainPointer = null;

      for (let i = 0; i < completedSubs.length; i++) {
        const sub = completedSubs[i];
        let pStart = new Date(sub.current_period_start);
        let pEnd = new Date(sub.current_period_end);

        if (i === 0) {
          // Primary / Active plan:
          // If start was artificially in the future because of old cancelled plans, realign to payment date or now
          if (pStart > now || isNaN(pStart.getTime())) {
            const payDate = paymentsBySubId[sub.id]?.created_at
              ? new Date(paymentsBySubId[sub.id].created_at)
              : new Date(sub.created_at || now);
            pStart = payDate > now ? now : payDate;
            pEnd = new Date(pStart);
            if (sub.plan_type === 'yearly') {
              pEnd.setFullYear(pEnd.getFullYear() + 1);
            } else {
              pEnd.setMonth(pEnd.getMonth() + 1);
            }

            await supabaseAdmin.from('subscriptions').update({
              status: 'active',
              current_period_start: pStart.toISOString(),
              current_period_end: pEnd.toISOString()
            }).eq('id', sub.id);
            sub.current_period_start = pStart.toISOString();
            sub.current_period_end = pEnd.toISOString();
          }

          if (sub.status !== 'active') {
            await supabaseAdmin.from('subscriptions').update({ status: 'active' }).eq('id', sub.id);
            sub.status = 'active';
          }

          currentSub = sub;
          activeChainPointer = new Date(sub.current_period_end);
        } else {
          // Next completed plans go strictly into queue (contiguous chain)
          const expectedStart = new Date(activeChainPointer);
          const expectedEnd = new Date(expectedStart);
          if (sub.plan_type === 'yearly') {
            expectedEnd.setFullYear(expectedEnd.getFullYear() + 1);
          } else {
            expectedEnd.setMonth(expectedEnd.getMonth() + 1);
          }

          if (
            sub.current_period_start !== expectedStart.toISOString() ||
            sub.current_period_end !== expectedEnd.toISOString() ||
            sub.status !== 'queued'
          ) {
            await supabaseAdmin.from('subscriptions').update({
              status: 'queued',
              current_period_start: expectedStart.toISOString(),
              current_period_end: expectedEnd.toISOString()
            }).eq('id', sub.id);
            sub.status = 'queued';
            sub.current_period_start = expectedStart.toISOString();
            sub.current_period_end = expectedEnd.toISOString();
          }

          queuedSubs.push(sub);
          activeChainPointer = expectedEnd;
        }
      }
    }

    // 5. Incomplete / Pending Subscriptions:
    // If user has complete plans, place uncompleted at the end (pendingSubscription)
    let pendingSub = null;
    if (pendingSubs.length > 0) {
      pendingSub = pendingSubs[pendingSubs.length - 1];
    }

    // If user has NO completed subscriptions at all, let pending be the primary so they can complete checkout
    if (!currentSub && pendingSub) {
      currentSub = pendingSub;
      pendingSub = null;
    }

    res.json({
      subscription: currentSub || null,
      queuedSubscriptions: queuedSubs,
      pendingSubscription: pendingSub || null
    });
  } catch (err) {
    console.error('Fetch subscription error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.patch('/charity', authenticate, async (req, res) => {
  try {
    const { charity_id, charity_percentage } = req.body;

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!subscription) return res.status(404).json({ error: 'No active subscription' });

    const updateData = {};
    if (charity_id) updateData.charity_id = charity_id;
    if (charity_percentage && charity_percentage >= 10) updateData.charity_percentage = charity_percentage;

    await supabaseAdmin.from('subscriptions').update(updateData).eq('id', subscription.id);

    res.json({ message: 'Charity preference updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update charity' });
  }
});

// Alias for cancel subscription
router.post(['/cancel', '/cancel-subscription'], authenticate, async (req, res) => {
  // Delegate directly to the payments cancel-subscription logic
  const paymentsRouter = require('./payments');
  req.url = '/cancel-subscription';
  return paymentsRouter(req, res);
});

module.exports = router;

