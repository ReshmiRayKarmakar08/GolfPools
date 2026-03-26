const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const uploadToPublicBucket = async (path, buffer, contentType) => {
  const { error: uploadError } = await supabaseAdmin.storage
    .from('public')
    .upload(path, buffer, {
      contentType,
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('public')
    .getPublicUrl(path);

  return urlData.publicUrl;
};

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, email, first_name, last_name, phone, avatar_url,
        role, email_verified, handicap, golf_club, created_at,
        kyc_document_url, kyc_status, kyc_uploaded_at
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowed = ['first_name', 'last_name', 'phone', 'golf_club', 'handicap'];
    const payload = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        payload[key] = req.body[key] === '' ? null : req.body[key];
      }
    }

    if (payload.handicap !== undefined && payload.handicap !== null) {
      const h = Number(payload.handicap);
      if (Number.isNaN(h) || h < 0 || h > 54) {
        return res.status(400).json({ error: 'Handicap must be between 0 and 54' });
      }
      payload.handicap = h;
    }

    if (!payload.first_name || !payload.last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(payload)
      .eq('id', req.user.id)
      .select(`
        id, email, first_name, last_name, phone, avatar_url,
        role, email_verified, handicap, golf_club, created_at,
        kyc_document_url, kyc_status, kyc_uploaded_at
      `)
      .single();

    if (error) throw error;
    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    if (!current_password) {
      return res.status(400).json({
        error: 'Current password is required. If you forgot it, use Forgot Password OTP flow.'
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, password_hash')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matches = await bcrypt.compare(current_password, user.password_hash);
    if (!matches) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(new_password, 12);
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ password_hash })
      .eq('id', req.user.id);

    if (updateErr) throw updateErr;
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/users/avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed for avatar' });
    }

    const fileName = `avatars/${req.user.id}_${Date.now()}_${req.file.originalname}`;
    const publicUrl = await uploadToPublicBucket(fileName, req.file.buffer, req.file.mimetype);

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', req.user.id);

    if (dbError) throw dbError;

    res.json({
      message: 'Avatar updated successfully',
      avatar_url: publicUrl
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// POST /api/users/kyc
router.post('/kyc', authenticate, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const allowed = ['image/', 'application/pdf'];
    const okType = allowed.some((t) => req.file.mimetype.startsWith(t));
    if (!okType) {
      return res.status(400).json({ error: 'Only image or PDF files are allowed' });
    }

    const fileName = `kyc/${req.user.id}_${Date.now()}_${req.file.originalname}`;
    const publicUrl = await uploadToPublicBucket(fileName, req.file.buffer, req.file.mimetype);

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        kyc_document_url: publicUrl,
        kyc_status: 'pending',
        kyc_uploaded_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (dbError) {
      console.warn('KYC columns missing or update failed:', dbError.message);
    }

    res.json({
      message: 'KYC document uploaded and pending verification',
      document_url: publicUrl
    });
  } catch (err) {
    console.error('KYC upload error:', err);
    res.status(500).json({ error: 'Failed to process KYC upload' });
  }
});

module.exports = router;
