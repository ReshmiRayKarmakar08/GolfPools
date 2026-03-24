// users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, phone, avatar_url, handicap, golf_club, created_at')
      .eq('id', req.user.id)
      .single();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', [
  authenticate,
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('handicap').optional().isFloat({ min: 0, max: 54 }),
  body('golf_club').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const allowed = ['first_name', 'last_name', 'phone', 'avatar_url', 'handicap', 'golf_club'];
    const updateData = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, email, first_name, last_name, phone, handicap, golf_club')
      .single();

    if (error) throw error;
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/change-password', [
  authenticate,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const { data: user } = await supabaseAdmin
      .from('users').select('password_hash').eq('id', req.user.id).single();

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(new_password, 12);
    await supabaseAdmin.from('users').update({ password_hash }).eq('id', req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
