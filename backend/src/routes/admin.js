const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard - Admin dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscriptions },
      { data: recentPayments },
      { count: pendingWinners },
      { data: recentDraws }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('payments').select('amount').eq('status', 'captured').order('created_at', { ascending: false }).limit(30),
      supabaseAdmin.from('winners').select('*', { count: 'exact', head: true }).eq('payment_status', 'verified'),
      supabaseAdmin.from('monthly_draws').select('*').order('draw_year', { ascending: false }).order('draw_month', { ascending: false }).limit(5)
    ]);

    const totalRevenue = recentPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    res.json({
      stats: {
        totalUsers,
        activeSubscriptions,
        totalRevenue,
        pendingWinners
      },
      recentDraws
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/admin/users - List users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select(`
        id, email, first_name, last_name, role, is_active,
        email_verified, created_at,
        subscriptions(status, plan_type)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;
    if (error) throw error;

    res.json({ users, total: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id - Update user (activate/deactivate, change role)
router.patch('/users/:id', async (req, res) => {
  try {
    const { is_active, role } = req.body;
    const updateData = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (role !== undefined && ['user', 'admin'].includes(role)) updateData.role = role;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, email, is_active, role')
      .single();

    if (error) throw error;
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Permanently delete user and related records
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetUserError) throw targetUserError;
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Never allow deleting admins from this action.
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Admin users cannot be deleted' });
    }

    // Remove dependent records first to satisfy FK constraints.
    const hardDelete = async (table, column = 'user_id') => {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, userId);
      if (error) throw error;
    };

    // 1) Direct user-linked tables
    await hardDelete('notifications').catch(() => {});
    await hardDelete('winners').catch(() => {});
    await hardDelete('draw_entries').catch(() => {});
    await hardDelete('payments').catch(() => {});
    await hardDelete('subscriptions').catch(() => {});
    await hardDelete('golf_scores').catch(() => {});
    await hardDelete('scores').catch(() => {}); // legacy table name fallback

    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteUserError) throw deleteUserError;

    return res.json({ message: 'User deleted permanently' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({
      error: 'Failed to delete user',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/admin/analytics - Revenue & subscription analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, charity_amount, prize_pool_amount, created_at')
      .eq('status', 'captured')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    const { data: subscriptionBreakdown } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type')
      .eq('status', 'active');

    const monthly = subscriptionBreakdown?.filter(s => s.plan_type === 'monthly').length || 0;
    const yearly = subscriptionBreakdown?.filter(s => s.plan_type === 'yearly').length || 0;

    // Group payments by date
    const revenueByDate = {};
    for (const payment of payments || []) {
      const date = payment.created_at.split('T')[0];
      if (!revenueByDate[date]) {
        revenueByDate[date] = { date, revenue: 0, charity: 0, prizePool: 0 };
      }
      revenueByDate[date].revenue += payment.amount;
      revenueByDate[date].charity += payment.charity_amount || 0;
      revenueByDate[date].prizePool += payment.prize_pool_amount || 0;
    }

    res.json({
      revenue_chart: Object.values(revenueByDate),
      subscription_breakdown: { monthly, yearly },
      totals: {
        revenue: payments?.reduce((s, p) => s + p.amount, 0) || 0,
        charity: payments?.reduce((s, p) => s + (p.charity_amount || 0), 0) || 0,
        prize_pool: payments?.reduce((s, p) => s + (p.prize_pool_amount || 0), 0) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Remaining stub routes
router.get('/subscriptions', async (req, res) => {
  try {
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id, plan_type, status, amount, created_at,
        users(first_name, last_name, email),
        charities(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    res.json({ subscriptions: subs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

module.exports = router;
