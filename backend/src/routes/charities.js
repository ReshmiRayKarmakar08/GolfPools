const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/charities - Get all active charities
router.get('/', async (req, res) => {
  try {
    const { featured, category, search } = req.query;

    let query = supabaseAdmin
      .from('charities')
      .select('id, name, slug, short_description, logo_url, category, is_featured, total_raised, supporter_count')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('supporter_count', { ascending: false });

    if (featured === 'true') query = query.eq('is_featured', true);
    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data: charities, error } = await query;
    if (error) throw error;

    res.json({ charities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch charities' });
  }
});

// GET /api/charities/:id - Get charity details
router.get('/:id', async (req, res) => {
  try {
    const { data: charity, error } = await supabaseAdmin
      .from('charities')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();

    if (error || !charity) {
      return res.status(404).json({ error: 'Charity not found' });
    }

    res.json({ charity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch charity' });
  }
});

// Admin CRUD
router.post('/', [authenticate, requireAdmin,
  body('name').trim().notEmpty(),
  body('short_description').trim().optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, short_description, logo_url, banner_url, website_url,
            registration_number, category, contact_email, contact_phone, address } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data: charity, error } = await supabaseAdmin
      .from('charities')
      .insert({ name, slug, description, short_description, logo_url, banner_url,
                website_url, registration_number, category, contact_email, contact_phone, address })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Charity created', charity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create charity' });
  }
});

router.put('/:id', [authenticate, requireAdmin], async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'short_description', 'logo_url',
      'banner_url', 'website_url', 'category', 'is_featured', 'is_active',
      'contact_email', 'contact_phone', 'address'];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const { data: charity, error } = await supabaseAdmin
      .from('charities')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Charity updated', charity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update charity' });
  }
});

router.delete('/:id', [authenticate, requireAdmin], async (req, res) => {
  try {
    await supabaseAdmin
      .from('charities')
      .update({ is_active: false })
      .eq('id', req.params.id);

    res.json({ message: 'Charity deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate charity' });
  }
});

module.exports = router;
