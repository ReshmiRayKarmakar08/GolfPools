const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/emailService');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID);
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || process.env.ACCESSTOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || process.env.ACCESSTOKEN_EXPIRY || '7d';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESHTOKEN_SECRET;
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || process.env.REFRESHTOKEN_EXPIRY || '30d';

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
};

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

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
      console.error('CRITICAL: Registration insert failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: { ...insertPayload, password_hash: '[REDACTED]' }
      });
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ 
        error: 'Registration failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }

    console.log('User created successfully:', user.id);

    // If charity selected, store preference in profile
    if (charity_id) {
      console.log('Attempting to store charity preference:', charity_id);
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ default_charity_id: charity_id })
        .eq('id', user.id);
      
      if (updateError) {
        console.warn('Non-fatal: Failed to set default_charity_id (column might be missing):', updateError.message);
      }
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
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, is_active, email_verified')
      .eq('email', email)
      .maybeSingle();

    if ((!user || error) && adminEmail && email?.toLowerCase() === adminEmail) {
      if (!adminPassword || password !== adminPassword) {
        return res.status(401).json({
          error: 'Use the primary admin credentials for this account.',
          code: 'ADMIN_CREDENTIAL_REQUIRED'
        });
      }

      const password_hash = await bcrypt.hash(adminPassword, 12);
      const insertPayload = {
        email: adminEmail,
        password_hash,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        email_verified: true
      };

      const created = await supabaseAdmin
        .from('users')
        .insert(insertPayload)
        .select('id, email, password_hash, first_name, last_name, role, is_active, email_verified')
        .single();

      if (created.error) {
        console.error('Admin auto-provision failed:', created.error);
        return res.status(500).json({ error: 'Unable to provision admin account' });
      }

      user = created.data;
    }

    if (!user) {
      return res.status(404).json({
        error: 'No account found with this email. Please create an account first.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    if (adminEmail && user?.email?.toLowerCase() === adminEmail) {
      if (!adminPassword || password !== adminPassword) {
        return res.status(401).json({
          error: 'Use the primary admin credentials for this account.',
          code: 'ADMIN_CREDENTIAL_REQUIRED'
        });
      }
      const adminHash = await bcrypt.hash(adminPassword, 12);
      if (!user.password_hash || !(await bcrypt.compare(adminPassword, user.password_hash))) {
        const { data: updatedUser } = await supabaseAdmin
          .from('users')
          .update({ password_hash: adminHash, role: 'admin' })
          .eq('id', user.id)
          .select('id, email, password_hash, first_name, last_name, role, is_active, email_verified')
          .single();
        if (updatedUser) {
          user = updatedUser;
        }
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Incorrect password. Please try again.',
        code: 'INVALID_PASSWORD'
      });
    }

    if (adminEmail && user?.email?.toLowerCase() === adminEmail && user.role !== 'admin') {
      const { data: updatedUser, error: roleError } = await supabaseAdmin
        .from('users')
        .update({ role: 'admin' })
        .eq('id', user.id)
        .select('id, email, password_hash, first_name, last_name, role, is_active, email_verified')
        .single();

      if (!roleError && updatedUser) {
        user = updatedUser;
      }
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

    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
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
      const otpCode = generateOtpCode();
      const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await supabaseAdmin
        .from('users')
        .update({
          password_reset_token: otpCode,
          password_reset_expires: resetExpires.toISOString()
        })
        .eq('id', user.id);

      await emailService.sendPasswordOtpEmail(email, user.first_name, otpCode).catch(console.error);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account exists, an OTP has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/verify-password-otp
router.post('/verify-password-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, password } = req.body;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, password_reset_token, password_reset_expires')
      .eq('email', email)
      .maybeSingle();

    if (!user || !user.password_reset_token || user.password_reset_token !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
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
    res.status(500).json({ error: 'OTP verification failed' });
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
    const { id_token } = req.body;
    const audience = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;

    if (!id_token || !audience) {
      return res.status(400).json({ error: 'Google authentication is not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience
    });
    const payload = ticket.getPayload();

    const email = String(payload?.email || '').toLowerCase();
    const first_name = payload?.given_name || email.split('@')[0];
    const last_name = payload?.family_name || '';
    const avatar_url = payload?.picture || null;

    if (!email || payload?.email_verified !== true) {
      return res.status(400).json({ error: 'Google email is not verified' });
    }

    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Admin account must use admin login only' });
    }

    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, avatar_url')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password_hash: await bcrypt.hash(`google_${Date.now()}_${payload.sub}`, 12),
          first_name,
          last_name,
          avatar_url,
          role: 'user',
          email_verified: true,
          is_active: true
        })
        .select('id, email, first_name, last_name, role, avatar_url')
        .single();

      if (error) throw error;
      user = { ...newUser, is_active: true };
    } else if (avatar_url && user.avatar_url !== avatar_url) {
      // Update avatar if it changed in Google
      const { data: updatedUser } = await supabaseAdmin
        .from('users')
        .update({ avatar_url })
        .eq('id', user.id)
        .select('id, email, first_name, last_name, role, avatar_url')
        .single();
      if (updatedUser) user = { ...user, avatar_url: updatedUser.avatar_url };
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Google login is allowed for user accounts only' });
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
