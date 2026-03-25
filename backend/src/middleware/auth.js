const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_active, first_name, last_name')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
};

const requireAdmin = (req, res, next) => {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  if (adminEmail && req.user?.email?.toLowerCase() !== adminEmail) {
    return res.status(403).json({ error: 'Admin access restricted to the primary admin account' });
  }
  next();
};

const requireActiveSubscription = async (req, res, next) => {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return res.status(403).json({ error: 'Active subscription required', code: 'NO_SUBSCRIPTION' });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireAdmin, requireActiveSubscription };
