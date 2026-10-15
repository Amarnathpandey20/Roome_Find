const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET all bookings for the authenticated user
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, l.title as listing_title, l.address as listing_address, l.host_name, l.price
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    WHERE b.user_id = ?
    ORDER BY b.id DESC
  `).all(req.user.id);

  res.json({
    total: rows.length,
    bookings: rows
  });
});

// POST schedule a tour
router.post('/', requireAuth, (req, res) => {
  const { listingId, tourDate, tourTime, guests, phone, notes } = req.body;

  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID is required.' });
  }
  if (!tourDate) {
    return res.status(400).json({ error: 'Tour date is required.' });
  }
  if (!tourTime) {
    return res.status(400).json({ error: 'Preferred time is required.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Contact phone is required.' });
  }

  const listing = db.prepare('SELECT id, title, host_name, address FROM listings WHERE id = ?').get(listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }

  const stmt = db.prepare(`
    INSERT INTO bookings (user_id, listing_id, tour_date, tour_time, guests, phone, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')
  `);

  const result = stmt.run(
    req.user.id,
    listing.id,
    tourDate,
    tourTime,
    guests || 'Just me',
    phone.trim(),
    notes ? notes.trim() : ''
  );

  return res.status(201).json({
    message: 'Tour requested successfully! The host will contact you shortly.',
    booking: {
      id: Number(result.lastInsertRowid),
      listingId: listing.id,
      listingTitle: listing.title,
      hostName: listing.host_name,
      tourDate,
      tourTime,
      status: 'Confirmed'
    }
  });
});

module.exports = router;
