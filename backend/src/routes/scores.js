const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireActiveSubscription } = require('../middleware/auth');

const MAX_SCORES = 5;

// GET /api/scores - Get user's scores
router.get('/', authenticate, async (req, res) => {
  try {
    const { data: scores, error } = await supabaseAdmin
      .from('golf_scores')
      .select('*')
      .eq('user_id', req.user.id)
      .order('score_date', { ascending: false });

    if (error) throw error;

    res.json({ scores });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// POST /api/scores - Add a new score
router.post('/', [
  authenticate,
  body('score').isInt({ min: 1, max: 45 }).withMessage('Score must be between 1 and 45'),
  body('score_date').isISO8601().withMessage('Invalid date format'),
  body('course_name').optional().trim().isLength({ max: 200 }),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { score, score_date, course_name, notes } = req.body;

    // Check existing score count
    const { data: existingScores, error: fetchError } = await supabaseAdmin
      .from('golf_scores')
      .select('id, score_date')
      .eq('user_id', req.user.id)
      .order('score_date', { ascending: true });

    if (fetchError) throw fetchError;

    // If at max, delete the oldest score
    if (existingScores.length >= MAX_SCORES) {
      const oldestScore = existingScores[0];
      await supabaseAdmin
        .from('golf_scores')
        .delete()
        .eq('id', oldestScore.id);
    }

    // Insert new score
    const { data: newScore, error: insertError } = await supabaseAdmin
      .from('golf_scores')
      .insert({
        user_id: req.user.id,
        score,
        score_date,
        course_name: course_name || null,
        notes: notes || null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      message: existingScores.length >= MAX_SCORES
        ? 'Score added (oldest score replaced)'
        : 'Score added successfully',
      score: newScore,
      replaced: existingScores.length >= MAX_SCORES
    });
  } catch (err) {
    console.error('Add score error:', err);
    res.status(500).json({ error: 'Failed to add score' });
  }
});

// PUT /api/scores/:id - Update a score
router.put('/:id', [
  authenticate,
  body('score').optional().isInt({ min: 1, max: 45 }),
  body('score_date').optional().isISO8601(),
  body('course_name').optional().trim().isLength({ max: 200 }),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { score, score_date, course_name, notes } = req.body;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('golf_scores')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Score not found' });
    }

    const updateData = {};
    if (score !== undefined) updateData.score = score;
    if (score_date !== undefined) updateData.score_date = score_date;
    if (course_name !== undefined) updateData.course_name = course_name;
    if (notes !== undefined) updateData.notes = notes;

    const { data: updated, error } = await supabaseAdmin
      .from('golf_scores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Score updated successfully', score: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// DELETE /api/scores/:id - Delete a score
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('golf_scores')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Score not found' });
    }

    await supabaseAdmin.from('golf_scores').delete().eq('id', id);

    res.json({ message: 'Score deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

// GET /api/scores/average - Get user's average score
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { data: scores } = await supabaseAdmin
      .from('golf_scores')
      .select('score, score_date')
      .eq('user_id', req.user.id)
      .order('score_date', { ascending: false });

    if (!scores || scores.length === 0) {
      return res.json({ stats: null });
    }

    const average = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const highest = Math.max(...scores.map(s => s.score));
    const lowest = Math.min(...scores.map(s => s.score));

    res.json({
      stats: {
        count: scores.length,
        average: Math.round(average * 10) / 10,
        highest,
        lowest,
        scores
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch score stats' });
  }
});

module.exports = router;
