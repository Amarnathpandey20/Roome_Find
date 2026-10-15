const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function formatListing(row, currentUserId = null) {
  if (!row) return null;

  let rules = [];
  let amenities = [];
  let images = [];

  try {
    rules = row.rules ? JSON.parse(row.rules) : [];
  } catch (e) {
    rules = [];
  }

  try {
    amenities = row.amenities ? JSON.parse(row.amenities) : [];
  } catch (e) {
    amenities = [];
  }

  try {
    images = row.images ? JSON.parse(row.images) : [];
  } catch (e) {
    images = [];
  }

  let isSaved = false;
  if (currentUserId) {
    const saved = db.prepare('SELECT id FROM saved_listings WHERE user_id = ? AND listing_id = ?').get(currentUserId, row.id);
    isSaved = !!saved;
  }

  return {
    ...row,
    rules,
    amenities,
    images,
    is_saved: isSaved
  };
}

// GET /api/listings
router.get('/', optionalAuth, (req, res) => {
  const {
    search,
    minPrice,
    maxPrice,
    roomType,
    petFriendly,
    furnished,
    privateBath,
    verifiedLandlord,
    utilitiesIncluded,
    vibe,
    moveIn
  } = req.query;

  let query = 'SELECT * FROM listings WHERE 1=1';
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query += ' AND (LOWER(title) LIKE ? OR LOWER(location) LIKE ? OR LOWER(address) LIKE ? OR LOWER(description) LIKE ?)';
    params.push(term, term, term, term);
  }

  if (minPrice) {
    const min = parseInt(minPrice, 10);
    if (!isNaN(min)) {
      query += ' AND price >= ?';
      params.push(min);
    }
  }

  if (maxPrice) {
    const max = parseInt(maxPrice, 10);
    if (!isNaN(max)) {
      query += ' AND price <= ?';
      params.push(max);
    }
  }

  if (roomType && roomType !== 'All' && roomType !== 'Any') {
    query += ' AND room_type = ?';
    params.push(roomType);
  }

  if (petFriendly === 'true' || petFriendly === '1') {
    query += ' AND pet_friendly = 1';
  }

  if (furnished === 'true' || furnished === '1') {
    query += ' AND furnished = 1';
  }

  if (privateBath === 'true' || privateBath === '1') {
    query += ' AND (private_bath = 1 OR bathrooms = ?)';
    params.push('Private Bath');
  }

  if (verifiedLandlord === 'true' || verifiedLandlord === '1') {
    query += ' AND verified_landlord = 1';
  }

  if (utilitiesIncluded === 'true' || utilitiesIncluded === '1') {
    query += ' AND utilities_included = 1';
  }

  if (vibe && vibe.trim()) {
    query += ' AND LOWER(vibe) LIKE ?';
    params.push(`%${vibe.trim().toLowerCase()}%`);
  }

  if (moveIn) {
    query += ' AND (move_in_date IS NULL OR move_in_date <= ?)';
    params.push(moveIn);
  }

  query += ' ORDER BY id DESC';

  const rows = db.prepare(query).all(...params);
  const currentUserId = req.user ? req.user.id : null;
  const listings = rows.map((r) => formatListing(r, currentUserId));

  res.json({
    total: listings.length,
    listings
  });
});

// GET /api/listings/:id
router.get('/:id', optionalAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Listing not found.' });
  }

  const currentUserId = req.user ? req.user.id : null;
  return res.json(formatListing(row, currentUserId));
});

// POST /api/listings (Create a new listing)
router.post('/', requireAuth, (req, res) => {
  const {
    title,
    description,
    price,
    deposit,
    utilities_est,
    address,
    location,
    neighborhood,
    room_type,
    bathrooms,
    bedrooms,
    furnished,
    pet_friendly,
    private_bath,
    utilities_included,
    move_in_date,
    vibe,
    min_lease,
    rules,
    amenities,
    images
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Listing title is required.' });
  }
  if (!address || !address.trim()) {
    return res.status(400).json({ error: 'Street address is required.' });
  }
  if (!price || isNaN(Number(price))) {
    return res.status(400).json({ error: 'Valid monthly rent price is required.' });
  }

  const user = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(req.user.id);
  const hostName = user ? user.name : req.user.name || 'Verified Member';
  const hostAvatar = user && user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(hostName)}&background=0F5132&color=fff`;

  // Default images if not provided
  let photoList = Array.isArray(images) && images.length > 0 ? images : [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'
  ];

  let rulesList = Array.isArray(rules) && rules.length > 0 ? rules : [
    'No Smoking Indoors',
    'Quiet Hours after 10 PM',
    'Respectful of shared spaces'
  ];

  let amenitiesList = Array.isArray(amenities) && amenities.length > 0 ? amenities : [
    'High-Speed Wi-Fi',
    'Central AC',
    'Fully Equipped Kitchen'
  ];

  const stmt = db.prepare(`
    INSERT INTO listings (
      title, description, price, deposit, utilities_est, location, address, neighborhood,
      room_type, bathrooms, bedrooms, furnished, pet_friendly, private_bath,
      utilities_included, verified_landlord, move_in_date, vibe, cleanliness,
      schedule, lifestyle, match_score, min_lease, rules, amenities, images,
      host_name, host_avatar, host_details, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    title.trim(),
    description ? description.trim() : 'Newly listed space with great lighting and convenient subway transit.',
    Number(price),
    deposit ? Number(deposit) : Number(price),
    utilities_est || '~$50/mo',
    location || address.split(',')[1]?.trim() || 'New York, NY',
    address.trim(),
    neighborhood || 'New York',
    room_type || 'Private Room',
    bathrooms || 'Shared Bath',
    bedrooms ? Number(bedrooms) : 1,
    furnished ? 1 : 0,
    pet_friendly ? 1 : 0,
    private_bath || bathrooms === 'Private Bath' ? 1 : 0,
    utilities_included ? 1 : 0,
    1,
    move_in_date || 'Immediate',
    vibe || 'Social & Friendly',
    '5/5 (Immaculate)',
    'Flexible',
    'Quiet & Professional',
    95,
    min_lease || '6 months',
    JSON.stringify(rulesList),
    JSON.stringify(amenitiesList),
    JSON.stringify(photoList),
    hostName,
    hostAvatar,
    'Verified Host • New Member',
    req.user.id
  );

  const newId = Number(result.lastInsertRowid);
  const newListing = db.prepare('SELECT * FROM listings WHERE id = ?').get(newId);

  return res.status(201).json({
    message: 'Listing published successfully!',
    listing: formatListing(newListing, req.user.id)
  });
});

module.exports = router;
