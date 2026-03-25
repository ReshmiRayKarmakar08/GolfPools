const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('charity_id').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, phone, charity_id, golf_club, handicap } = req.body;

    // Check if user exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserError) {
      console.error('Register existing user check error:', existingUserError);
      return res.status(500).json({ error: 'Unable to validate existing account' });
    }

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);
    const verification_token = uuidv4();

    // Create user (with fallback if optional column does not exist in DB)
    const insertPayload = {
      email,
      password_hash,
      first_name,
      last_name,
      phone: phone || null,
      golf_club: golf_club || null,
      handicap: handicap || null,
      email_verification_token: verification_token
    };

    let { data: user, error } = await supabaseAdmin
      .from('users')
      .insert(insertPayload)
      .select('id, email, first_name, last_name, role')
      .single();

    // Some deployments may not yet have email_verification_token column migrated.
    if (error && (error.code === '42703' || `${error.message}`.toLowerCase().includes('email_verification_token'))) {
      const fallbackPayload = { ...insertPayload };
      delete fallbackPayload.email_verification_token;

      const retry = await supabaseAdmin
        .from('users')
        .insert(fallbackPayload)
        .select('id, email, first_name, last_name, role')
        .single();

      user = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Register insert error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }

    // If charity selected, store preference in profile
    if (charity_id) {
      await supabaseAdmin
        .from('users')
        .update({ default_charity_id: charity_id })
        .eq('id', user.id)
        .catch(() => {}); // Ignore if column doesn't exist yet
    }

    // Send welcome email
    await emailService.sendWelcomeEmail(email, first_name, verification_token).catch(console.error);

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, is_active, email_verified')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'No account found with this email. Please create an account first.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Incorrect password. Please try again.',
        code: 'INVALID_PASSWORD'
      });
    }

    // Get subscription status
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, plan_type, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email_verified: user.email_verified,
        subscription: subscription || null
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select(`
        id, email, first_name, last_name, phone, avatar_url,
        role, email_verified, handicap, golf_club, created_at
      `)
      .eq('id', req.user.id)
      .single();

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id, plan_type, status, amount, currency,
        current_period_start, current_period_end,
        charity_id, charity_percentage,
        charities(id, name, logo_url)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ user: { ...user, subscription } });
  } catch (err) {
    console.error('Auth/Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, first_name')
      .eq('email', email)
      .single();

    if (user) {
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await supabaseAdmin
        .from('users')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: resetExpires.toISOString()
        })
        .eq('id', user.id);

      await emailService.sendPasswordResetEmail(email, user.first_name, resetToken).catch(console.error);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, password_reset_expires')
      .eq('password_reset_token', token)
      .single();

    if (!user || new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    await supabaseAdmin
      .from('users')
      .update({
        password_hash,
        password_reset_token: null,
        password_reset_expires: null
      })
      .eq('id', user.id);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  // Client should delete the token; JWT is stateless
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/google - Google OAuth (dummy for local dev)
router.post('/google', async (req, res) => {
  try {
    const { email, first_name, last_name, google_id } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('email', email)
      .single();

    if (!user) {
      // Create new user from Google data
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password_hash: await bcrypt.hash(`google_${Date.now()}`, 12),
          first_name: first_name || email.split('@')[0],
          last_name: last_name || '',
          email_verified: true
        })
        .select('id, email, first_name, last_name, role')
        .single();

      if (error) throw error;
      user = newUser;
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

module.exports = router;
