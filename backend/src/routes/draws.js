const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');
const drawService = require('../services/drawService');

// GET /api/draws - Get all draws (paginated)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: draws, error, count } = await supabaseAdmin
      .from('monthly_draws')
      .select('*', { count: 'exact' })
      .order('draw_year', { ascending: false })
      .order('draw_month', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ draws, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

// GET /api/draws/current - Get current month's draw
router.get('/current', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: draw } = await supabaseAdmin
      .from('monthly_draws')
      .select('*')
      .eq('draw_month', month)
      .eq('draw_year', year)
      .maybeSingle();

    // Get user's entry for this draw
    let userEntry = null;
    if (draw) {
      const { data: entry } = await supabaseAdmin
        .from('draw_entries')
        .select('*')
        .eq('draw_id', draw.id)
        .eq('user_id', req.user.id)
        .maybeSingle();
      userEntry = entry;
    }

    res.json({ draw, userEntry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current draw' });
  }
});

// GET /api/draws/:id - Get specific draw
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: draw, error } = await supabaseAdmin
      .from('monthly_draws')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !draw) {
      return res.status(404).json({ error: 'Draw not found' });
    }

    // Get user's entry
    const { data: userEntry } = await supabaseAdmin
      .from('draw_entries')
      .select('*')
      .eq('draw_id', draw.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    // Get winners if draw is completed
    let winners = [];
    if (draw.status === 'completed') {
      const { data: drawWinners } = await supabaseAdmin
        .from('winners')
        .select(`
          id, prize_category, prize_amount, payment_status,
          users(first_name, last_name)
        `)
        .eq('draw_id', draw.id);
      winners = drawWinners || [];
    }

    res.json({ draw, userEntry, winners });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draw' });
  }
});

// POST /api/draws/:id/enter - Enter a draw with scores
router.post('/:id/enter', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!subscription) {
      return res.status(403).json({ error: 'Active subscription required to enter draws' });
    }

    // Get draw
    const { data: draw } = await supabaseAdmin
      .from('monthly_draws')
      .select('*')
      .eq('id', id)
      .single();

    if (!draw) {
      return res.status(404).json({ error: 'Draw not found' });
    }

    if (draw.status === 'completed') {
      return res.status(400).json({ error: 'Draw has already been completed' });
    }

    // Check if already entered
    const { data: existingEntry } = await supabaseAdmin
      .from('draw_entries')
      .select('id')
      .eq('draw_id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existingEntry) {
      return res.status(409).json({ error: 'Already entered this draw' });
    }

    // Get user's latest 5 scores
    const { data: scores } = await supabaseAdmin
      .from('golf_scores')
      .select('score')
      .eq('user_id', req.user.id)
      .order('score_date', { ascending: false })
      .limit(5);

    if (!scores || scores.length === 0) {
      return res.status(400).json({ error: 'You need at least one score to enter the draw' });
    }

    const numbers_entered = scores.map(s => s.score);

    // Create entry
    const { data: entry, error } = await supabaseAdmin
      .from('draw_entries')
      .insert({
        draw_id: id,
        user_id: req.user.id,
        subscription_id: subscription.id,
        numbers_entered
      })
      .select()
      .single();

    if (error) throw error;

    // Update participant count
    await supabaseAdmin
      .from('monthly_draws')
      .update({ participant_count: (draw.participant_count || 0) + 1 })
      .eq('id', id);

    res.status(201).json({
      message: 'Successfully entered the draw',
      entry,
      numbers_entered
    });
  } catch (err) {
    console.error('Enter draw error:', err);
    res.status(500).json({ error: 'Failed to enter draw' });
  }
});

// GET /api/draws/user/history - User's draw history
router.get('/user/history', authenticate, async (req, res) => {
  try {
    const { data: entries, error } = await supabaseAdmin
      .from('draw_entries')
      .select(`
        id, numbers_entered, match_count, is_winner, prize_category, prize_amount, created_at,
        monthly_draws(id, draw_month, draw_year, status, winning_numbers, draw_date)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draw history' });
  }
});

// =============================================
// ADMIN ROUTES
// =============================================

// POST /api/draws - Create a new draw (Admin)
router.post('/', [authenticate, requireAdmin,
  body('draw_month').isInt({ min: 1, max: 12 }),
  body('draw_year').isInt({ min: 2024 }),
  body('draw_date').optional().isISO8601(),
  body('draw_type').optional().isIn(['random', 'algorithm'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { draw_month, draw_year, draw_date, draw_type = 'random', notes } = req.body;

    // Check if draw already exists for this month
    const { data: existing } = await supabaseAdmin
      .from('monthly_draws')
      .select('id')
      .eq('draw_month', draw_month)
      .eq('draw_year', draw_year)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Draw already exists for this month' });
    }

    // Generate winning numbers (5 numbers from 1-45)
    const winning_numbers = drawService.generateWinningNumbers(draw_type);

    // Calculate prize pool from payments
    const prizePool = await drawService.calculateMonthlyPrizePool(draw_month, draw_year);
    const jackpotRollover = await drawService.getJackpotRollover(draw_month - 1, draw_year);

    const five_match_pool = (prizePool * 0.40) + jackpotRollover;
    const four_match_pool = prizePool * 0.35;
    const three_match_pool = prizePool * 0.25;

    const { data: draw, error } = await supabaseAdmin
      .from('monthly_draws')
      .insert({
        draw_month,
        draw_year,
        draw_date: draw_date || new Date().toISOString(),
        status: 'pending',
        winning_numbers,
        draw_type,
        total_pool: prizePool,
        five_match_pool,
        four_match_pool,
        three_match_pool,
        jackpot_amount: jackpotRollover,
        notes,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Draw created', draw });
  } catch (err) {
    console.error('Create draw error:', err);
    res.status(500).json({ error: 'Failed to create draw' });
  }
});

// POST /api/draws/:id/execute - Execute a draw (Admin)
router.post('/:id/execute', [authenticate, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await drawService.executeDraw(id, req.user.id);

    res.json({
      message: 'Draw executed successfully',
      ...result
    });
  } catch (err) {
    console.error('Execute draw error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute draw' });
  }
});

// POST /api/draws/:id/simulate - Simulate a draw without saving (Admin)
router.post('/:id/simulate', [authenticate, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const simulation = await drawService.simulateDraw(id);
    res.json({ simulation });
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

module.exports = router;
