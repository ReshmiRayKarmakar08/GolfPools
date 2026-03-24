const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.get('/current', authenticate, async (req, res) => {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id, plan_type, status, amount, currency,
        current_period_start, current_period_end,
        cancel_at_period_end, cancelled_at, charity_percentage,
        charities(id, name, logo_url, short_description)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ subscription });
  } catch (err) {
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
      .single();

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

module.exports = router;
