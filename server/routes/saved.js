const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseListing(row) {
  if (!row) return null;
  return {
    ...row,
    rules: row.rules ? JSON.parse(row.rules) : [],
    amenities: row.amenities ? JSON.parse(row.amenities) : [],
    images: row.images ? JSON.parse(row.images) : [],
    is_saved: true
  };
}

// GET all saved listings for logged in user
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, s.created_at as saved_at
    FROM saved_listings s
    JOIN listings l ON s.listing_id = l.id
    WHERE s.user_id = ?
    ORDER BY s.id DESC
  `).all(req.user.id);

  const savedListings = rows.map(parseListing);
  res.json({
    total: savedListings.length,
    listings: savedListings
  });
});

// POST toggle/add saved listing
router.post('/:listingId', requireAuth, (req, res) => {
  const listingId = parseInt(req.params.listingId, 10);
  if (isNaN(listingId)) {
    return res.status(400).json({ error: 'Invalid listing ID' });
  }

  const listing = db.prepare('SELECT id FROM listings WHERE id = ?').get(listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const existing = db.prepare('SELECT id FROM saved_listings WHERE user_id = ? AND listing_id = ?').get(req.user.id, listingId);
  if (existing) {
    // Unsave if already saved (toggle functionality)
    db.prepare('DELETE FROM saved_listings WHERE id = ?').run(existing.id);
    return res.json({
      saved: false,
      message: 'Room removed from saved'
    });
  }

  db.prepare('INSERT INTO saved_listings (user_id, listing_id) VALUES (?, ?)').run(req.user.id, listingId);
  return res.json({
    saved: true,
    message: 'Room added to saved'
  });
});

// DELETE remove saved listing
router.delete('/:listingId', requireAuth, (req, res) => {
  const listingId = parseInt(req.params.listingId, 10);
  if (isNaN(listingId)) {
    return res.status(400).json({ error: 'Invalid listing ID' });
  }

  db.prepare('DELETE FROM saved_listings WHERE user_id = ? AND listing_id = ?').run(req.user.id, listingId);
  return res.json({
    saved: false,
    message: 'Room removed from saved'
  });
});

module.exports = router;
