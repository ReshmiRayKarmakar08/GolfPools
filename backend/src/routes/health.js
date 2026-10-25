const express = require('express');
const router = express.Router();
const { supabaseAdmin, isConfigured } = require('../config/supabase');

// Helper to test database connectivity
const checkDatabase = async () => {
  if (!isConfigured || !supabaseAdmin) {
    return { ok: false, error: 'Supabase client is not configured in environment variables' };
  }
  const start = Date.now();
  try {
    const { data, error } = await supabaseAdmin
      .from('charities')
      .select('id')
      .limit(1)
      .maybeSingle();

    const latency = Date.now() - start;

    if (error) {
      return { ok: false, latency, error: error.message };
    }
    return { ok: true, latency };
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message };
  }
};

// GET /api/health — Full health check (Server + Supabase Database)
router.get('/', async (req, res) => {
  const dbStatus = await checkDatabase();
  const uptime = Math.floor(process.uptime());

  if (!dbStatus.ok) {
    return res.status(503).json({
      status: 'degraded',
      server: 'online',
      database: 'disconnected',
      latency_ms: dbStatus.latency || null,
      error: dbStatus.error,
      action_required: 'Check if your Supabase project is paused in supabase.com dashboard.',
      uptime_seconds: uptime,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'ok',
    server: 'online',
    database: 'connected',
    latency_ms: dbStatus.latency,
    uptime_seconds: uptime,
    timestamp: new Date().toISOString()
  });
});

// GET /api/health/db — Dedicated Database Keep-Alive route
// Ideal for external cron monitors (e.g. cron-job.org / UptimeRobot)
// Calling this forces an active query to Supabase, preventing the 7-day inactivity pause.
router.get('/db', async (req, res) => {
  const dbStatus = await checkDatabase();

  if (!dbStatus.ok) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: dbStatus.error,
      suggestion: 'Project may be paused in Supabase dashboard. Please visit supabase.com to restore.',
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'ok',
    database: 'connected',
    latency_ms: dbStatus.latency,
    message: 'Supabase keep-alive query successful. Activity registered.',
    timestamp: new Date().toISOString()
  });
});

// GET /api/health/server — Dedicated lightweight Server Keep-Alive route
// Ideal for Render free-tier keep-alive without putting load on Supabase.
router.get('/server', (req, res) => {
  res.status(200).json({
    status: 'ok',
    server: 'online',
    uptime_seconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

