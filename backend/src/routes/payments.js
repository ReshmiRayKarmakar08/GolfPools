const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/emailService');

const IS_SANDBOX = process.env.PAYMENT_SANDBOX === 'true';

const getRazorpay = () => {
  if (IS_SANDBOX) return null;
  const Razorpay = require('razorpay');
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

// Plan prices in paise (INR)
const PLANS = {
  monthly: { price: 99900, name: 'Monthly Plan' },     // ₹999/month
  yearly: { price: 999900, name: 'Yearly Plan' }       // ₹9999/year
};

// Prize pool distribution
const DISTRIBUTION = {
  charity: 0.10,         // 10% to charity
  platform: 0.15,        // 15% platform fee
  prize_pool: 0.75       // 75% to prize pool
};

// POST /api/payments/create-order - Create Razorpay order
router.post('/create-order', [
  authenticate,
  body('plan_type').isIn(['monthly', 'yearly']),
  body('charity_id').isUUID(),
  body('charity_percentage').optional().isFloat({ min: 10, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { plan_type, charity_id, charity_percentage = 10 } = req.body;

    // Check existing active subscription
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSub) {
      return res.status(409).json({ error: 'You already have an active subscription' });
    }

    const plan = PLANS[plan_type];
    let orderId;

    if (IS_SANDBOX) {
      // SANDBOX: Generate a dummy order ID
      orderId = `order_sandbox_${Date.now()}`;
      console.log(`[SANDBOX] Created dummy order: ${orderId} for ₹${plan.price / 100}`);
    } else {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount: plan.price,
        currency: 'INR',
        receipt: `sub_${req.user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          user_id: req.user.id,
          plan_type,
          charity_id,
          charity_percentage
        }
      });
      orderId = order.id;
    }

    // Create pending subscription
    const periodStart = new Date();
    const periodEnd = new Date();
    if (plan_type === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: req.user.id,
        plan_type,
        status: 'pending',
        charity_id,
        charity_percentage,
        amount: plan.price / 100,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString()
      })
      .select()
      .single();

    res.json({
      order_id: orderId,
      amount: plan.price,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      subscription_id: subscription.id,
      sandbox: IS_SANDBOX
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify - Verify Razorpay payment
router.post('/verify', [
  authenticate,
  body('subscription_id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscription_id } = req.body;

    if (!IS_SANDBOX) {
      // PRODUCTION: Verify Razorpay signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    } else {
      console.log(`[SANDBOX] Auto-verifying payment for subscription: ${subscription_id}`);
    }

    // Get subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*, charities(id, name)')
      .eq('id', subscription_id)
      .eq('user_id', req.user.id)
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const amount = subscription.amount;
    const charityAmount = amount * (subscription.charity_percentage / 100);
    const platformAmount = amount * DISTRIBUTION.platform;
    const prizePoolAmount = amount - charityAmount - platformAmount;

    // Create payment record
    await supabaseAdmin.from('payments').insert({
      user_id: req.user.id,
      subscription_id: subscription.id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount,
      currency: 'INR',
      status: 'captured',
      charity_id: subscription.charity_id,
      charity_amount: charityAmount,
      platform_amount: platformAmount,
      prize_pool_amount: prizePoolAmount
    });

    // Activate subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', subscription_id);

    // Update charity total raised
    if (subscription.charity_id) {
      await supabaseAdmin.rpc('increment_charity_raised', {
        p_charity_id: subscription.charity_id,
        p_amount: charityAmount
      }).catch(() => {
        // Fallback if RPC doesn't exist
        supabaseAdmin
          .from('charities')
          .select('total_raised, supporter_count')
          .eq('id', subscription.charity_id)
          .single()
          .then(({ data }) => {
            if (data) {
              supabaseAdmin.from('charities').update({
                total_raised: (data.total_raised || 0) + charityAmount,
                supporter_count: (data.supporter_count || 0) + 1
              }).eq('id', subscription.charity_id);
            }
          });
      });
    }

    // Send confirmation email
    await emailService.sendSubscriptionConfirmation(
      req.user.email,
      req.user.first_name,
      subscription.plan_type,
      amount * 100
    ).catch(console.error);

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: req.user.id,
      type: 'subscription_active',
      title: 'Subscription Activated! 🎉',
      message: `Your ${subscription.plan_type} subscription is now active. You can enter draws and track your contributions.`,
      metadata: { subscription_id, plan_type: subscription.plan_type }
    });

    res.json({
      message: 'Payment verified and subscription activated',
      subscription: {
        id: subscription.id,
        plan_type: subscription.plan_type,
        status: 'active',
        current_period_end: subscription.current_period_end
      }
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// GET /api/payments/history - Get user's payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select(`
        id, amount, currency, status, payment_method,
        charity_amount, prize_pool_amount,
        created_at,
        charities(name, logo_url)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// POST /api/payments/cancel-subscription
router.post('/cancel-subscription', authenticate, async (req, res) => {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    res.json({ message: 'Subscription will be cancelled at the end of the current period' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /api/payments/sandbox-activate - SANDBOX ONLY: Directly activate subscription
if (IS_SANDBOX) {
  router.post('/sandbox-activate', [
    authenticate,
    body('plan_type').isIn(['monthly', 'yearly']),
    body('charity_id').isUUID(),
    body('charity_percentage').optional().isFloat({ min: 10, max: 50 })
  ], async (req, res) => {
    try {
      const { plan_type, charity_id, charity_percentage = 10 } = req.body;
      const plan = PLANS[plan_type];

      const periodStart = new Date();
      const periodEnd = new Date();
      if (plan_type === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Create and immediately activate subscription
      const { data: subscription, error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: req.user.id,
          plan_type,
          status: 'active',
          charity_id,
          charity_percentage,
          amount: plan.price / 100,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create payment record
      await supabaseAdmin.from('payments').insert({
        user_id: req.user.id,
        subscription_id: subscription.id,
        razorpay_payment_id: `sandbox_pay_${Date.now()}`,
        razorpay_order_id: `sandbox_order_${Date.now()}`,
        amount: plan.price / 100,
        currency: 'INR',
        status: 'captured',
        charity_id,
        charity_amount: (plan.price / 100) * (charity_percentage / 100),
        platform_amount: (plan.price / 100) * DISTRIBUTION.platform,
        prize_pool_amount: (plan.price / 100) * (1 - charity_percentage / 100 - DISTRIBUTION.platform)
      });

      console.log(`[SANDBOX] Auto-activated ${plan_type} subscription for user ${req.user.id}`);

      res.json({
        message: 'Sandbox subscription activated',
        subscription: {
          id: subscription.id,
          plan_type: subscription.plan_type,
          status: 'active',
          current_period_end: subscription.current_period_end
        }
      });
    } catch (err) {
      console.error('Sandbox activate error:', err);
      res.status(500).json({ error: 'Failed to activate sandbox subscription' });
    }
  });
}

module.exports = router;
