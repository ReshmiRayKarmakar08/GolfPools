const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.get('/current', authenticate, async (req, res) => {
  try {
    const now = new Date();

    // Fetch active/queued/pending subscriptions ordered by start date
    const { data: allSubs } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id, plan_type, status, amount, currency,
        current_period_start, current_period_end,
        cancel_at_period_end, cancelled_at, charity_percentage, charity_id,
        charities(id, name, logo_url, short_description)
      `)
      .eq('user_id', req.user.id)
      .in('status', ['active', 'queued', 'pending'])
      .order('current_period_start', { ascending: true });

    // Transition any cancel_at_period_end subscriptions to 'cancelled' immediately
    for (const sub of allSubs || []) {
      if (sub.cancel_at_period_end) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled', cancel_at_period_end: false })
          .eq('id', sub.id);
        sub.status = 'cancelled';
      }
    }

    // Filter to truly live subscriptions (active or queued, not cancelled)
    const liveSubs = (allSubs || []).filter(s => s.status !== 'cancelled' && !s.cancel_at_period_end);

    if (!liveSubs || liveSubs.length === 0) {
      return res.json({ subscription: null, queuedSubscriptions: [] });
    }

    let currentSub = null;
    const queuedSubs = [];

    for (const sub of liveSubs) {
      const periodEnd = new Date(sub.current_period_end);
      const periodStart = new Date(sub.current_period_start);

      if (periodEnd <= now) {
        await supabaseAdmin.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
        sub.status = 'expired';
      } else if (periodStart <= now && sub.status !== 'pending') {
        if (sub.status === 'queued') {
          await supabaseAdmin.from('subscriptions').update({ status: 'active' }).eq('id', sub.id);
          sub.status = 'active';
        }
        if (!currentSub) {
          currentSub = sub;
        } else {
          queuedSubs.push(sub);
        }
      } else {
        queuedSubs.push(sub);
      }
    }

    if (!currentSub && queuedSubs.length > 0) {
      currentSub = queuedSubs.shift();
      if (currentSub.status !== 'active' && currentSub.status !== 'pending') {
        await supabaseAdmin.from('subscriptions').update({ status: 'active' }).eq('id', currentSub.id);
        currentSub.status = 'active';
      }
    }

    if (!currentSub && liveSubs.length > 0) {
      const valid = liveSubs.filter(s => s.status !== 'expired');
      currentSub = valid.length > 0 ? valid[valid.length - 1] : null;
    }

    res.json({ subscription: currentSub || null, queuedSubscriptions: queuedSubs });
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

