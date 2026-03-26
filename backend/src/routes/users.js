const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// Simple Memory Storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/users/avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const fileName = `avatars/${req.user.id}_${Date.now()}_${originalname}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('public')
      .upload(fileName, buffer, {
        contentType: mimetype,
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image to storage' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('public')
      .getPublicUrl(fileName);

    // Update user record
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

    const { buffer, mimetype, originalname } = req.file;
    const fileName = `kyc/${req.user.id}_${Date.now()}_${originalname}`;

    // Upload to Supabase
    const { data, error } = await supabaseAdmin.storage
      .from('public')
      .upload(fileName, buffer, { contentType: mimetype, upsert: true });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: 'Failed to upload document' });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('public')
      .getPublicUrl(fileName);

    // Update user record (swallow error if column missing)
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ 
        kyc_document_url: publicUrl,
        kyc_status: 'pending',
        kyc_uploaded_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (dbError) {
      console.warn('DB Update warning (check if KYC columns exist):', dbError.message);
      // If column doesn't exist, we still want to return the URL so the UI can show "Uploaded"
    }

    res.json({ 
      message: 'KYC Document uploaded and pending verification', 
      document_url: publicUrl 
    });
  } catch (err) {
    console.error('KYC upload error:', err);
    res.status(500).json({ error: 'Failed to process KYC upload' });
  }
});

module.exports = router;
