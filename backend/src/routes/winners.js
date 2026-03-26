const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// GET /api/winners/my - Get current user's winnings
router.get('/my', authenticate, async (req, res) => {
  try {
    const { data: winners } = await supabaseAdmin
      .from('winners')
      .select(`
        id, prize_category, prize_amount, payment_status,
        proof_url, proof_uploaded_at, admin_notes, paid_at, created_at,
        monthly_draws(draw_month, draw_year, winning_numbers)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    res.json({ winners, winnings: winners });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch winnings' });
  }
});

// POST /api/winners/:id/upload-proof - Upload proof
router.post('/:id/upload-proof', authenticate, upload.single('proof'), async (req, res) => {
  try {
    let proofUrl = req.body?.proof_url;

    if (!proofUrl && req.file) {
      const fileName = `winner-proof/${req.user.id}_${Date.now()}_${req.file.originalname}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('public')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadError) {
        console.error('Winner proof upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload proof file' });
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('public')
        .getPublicUrl(fileName);
      proofUrl = urlData.publicUrl;
    }

    if (!proofUrl) {
      return res.status(400).json({ error: 'Proof file or URL is required' });
    }

    const { data: winner } = await supabaseAdmin
      .from('winners')
      .select('id, user_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!winner) {
      return res.status(404).json({ error: 'Winner record not found' });
    }

    const updatePayload = {
      proof_url: proofUrl,
      proof_uploaded_at: new Date().toISOString(),
      payment_status: 'verified'
    };

    await supabaseAdmin
      .from('winners')
      .update(updatePayload)
      .eq('id', req.params.id);

    res.json({ message: 'Proof uploaded successfully, pending admin verification' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload proof' });
  }
});

// Admin routes
router.get('/', [authenticate, requireAdmin], async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin
      .from('winners')
      .select(`
        id, prize_category, prize_amount, payment_status,
        proof_url, proof_uploaded_at, admin_notes, paid_at, created_at,
        users(id, first_name, last_name, email),
        monthly_draws(draw_month, draw_year)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('payment_status', status);

    const { data: winners } = await query;
    res.json({ winners });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

router.patch('/:id/approve', [authenticate, requireAdmin], async (req, res) => {
  try {
    const { admin_notes, payment_reference } = req.body;

    await supabaseAdmin
      .from('winners')
      .update({
        payment_status: 'approved',
        admin_notes,
        verified_by: req.user.id,
        verified_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    res.json({ message: 'Winner approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve winner' });
  }
});

router.patch('/:id/reject', [authenticate, requireAdmin], async (req, res) => {
  try {
    const { admin_notes } = req.body;

    await supabaseAdmin
      .from('winners')
      .update({
        payment_status: 'rejected',
        admin_notes,
        verified_by: req.user.id,
        verified_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    res.json({ message: 'Winner rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject winner' });
  }
});

router.patch('/:id/mark-paid', [authenticate, requireAdmin], async (req, res) => {
  try {
    const { payment_reference } = req.body;

    await supabaseAdmin
      .from('winners')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference
      })
      .eq('id', req.params.id);

    res.json({ message: 'Winner marked as paid' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

module.exports = router;
