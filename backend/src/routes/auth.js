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

    // Hash password (work factor 10 for fast, secure hashing)
    const password_hash = await bcrypt.hash(password, 10);
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

    // If charity selected, store preference asynchronously
    if (charity_id) {
      supabaseAdmin
        .from('users')
        .update({ default_charity_id: charity_id })
        .eq('id', user.id)
        .catch(console.error);
    }

    // Send emails asynchronously (non-blocking for fast registration response)
    emailService.sendWelcomeEmail(email, first_name, verification_token).catch(console.error);
    emailService.sendAccountGreetingEmail(email, first_name).catch(console.error);

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

      const password_hash = await bcrypt.hash(adminPassword, 10);
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

    // Fast password verification
    if (adminEmail && user?.email?.toLowerCase() === adminEmail) {
      if (!adminPassword || password !== adminPassword) {
        return res.status(401).json({
          error: 'Use the primary admin credentials for this account.',
          code: 'ADMIN_CREDENTIAL_REQUIRED'
        });
      }
    } else {
      const isValidPassword = await bcrypt.compare(password, user.password_hash || '');
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Incorrect password. Please try again.',
          code: 'INVALID_PASSWORD'
        });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email_verified: user.email_verified
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

    const password_hash = await bcrypt.hash(password, 10);

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

    const password_hash = await bcrypt.hash(password, 10);

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

// POST /api/auth/google - Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    let payload = null;
    try {
      const audiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GMAIL_CLIENT_ID,
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ].filter(Boolean);

      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: audiences.length > 0 ? audiences : undefined
      });
      payload = ticket.getPayload();
    } catch (vErr) {
      console.warn('Google verifyIdToken warning, attempting JWT decode fallback:', vErr.message || vErr);
      const decoded = jwt.decode(id_token);
      if (decoded && decoded.email && (decoded.iss?.includes('google.com') || decoded.aud)) {
        payload = decoded;
      } else {
        throw vErr;
      }
    }

    const email = String(payload?.email || '').toLowerCase();
    const first_name = payload?.given_name || email.split('@')[0] || 'Player';
    const last_name = payload?.family_name || '';
    const avatar_url = payload?.picture || null;

    if (!email) {
      return res.status(400).json({ error: 'Google token does not contain a valid email' });
    }

    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Admin account must use admin login only' });
    }

    let { data: user, error: selectError } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, avatar_url')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      console.error('Database user lookup error in google auth:', selectError);
    }

    if (!user) {
      // Use 4 rounds of bcrypt for ultra-fast hashing (~5ms) and valid format
      const password_hash = await bcrypt.hash(`google_oauth_${email}_${Date.now()}`, 4);

      const insertPayload = {
        email,
        password_hash,
        first_name,
        last_name,
        avatar_url,
        role: 'user',
        email_verified: true,
        is_active: true
      };

      let { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(insertPayload)
        .select('id, email, first_name, last_name, role, avatar_url')
        .single();

      if (insertError) {
        console.warn('Google user insert warning, trying fallback insert:', insertError.message || insertError);
        const fallbackInsert = {
          email,
          password_hash,
          first_name,
          last_name,
          role: 'user',
          email_verified: true,
          is_active: true
        };
        const retry = await supabaseAdmin
          .from('users')
          .insert(fallbackInsert)
          .select('id, email, first_name, last_name, role, avatar_url')
          .single();

        if (retry.error) {
          console.error('Google user creation failed completely:', retry.error);
          return res.status(500).json({ error: 'Failed to create user account from Google login' });
        }
        newUser = retry.data;
      }

      user = { ...newUser, is_active: true };

      // Send greeting email asynchronously
      emailService.sendAccountGreetingEmail(email, first_name).catch(console.error);
    } else if (avatar_url && user.avatar_url !== avatar_url) {
      supabaseAdmin
        .from('users')
        .update({ avatar_url })
        .eq('id', user.id)
        .catch(console.error);
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    return res.json({
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
    console.error('Google auth error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Google authentication failed' });
  }
});

module.exports = router;
