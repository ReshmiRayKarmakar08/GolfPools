const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

// GET /api/health
router.get('/', async (req, res) => {
  try {
    const start = Date.now();
    const { error } = await supabaseAdmin.from('users').select('id').limit(1).maybeSingle();
    const latency = Date.now() - start;

    if (error) {
      return res.json({ status: 'degraded', latency, message: error.message });
    }

    res.json({ status: 'ok', latency, timestamp: new Date().toISOString() });
  } catch (err) {
    res.json({ status: 'error', message: err.message, timestamp: new Date().toISOString() });
  }
});

module.exports = router;
