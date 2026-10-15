const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=0F5132&color=ffffff&bold=true`;

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password, avatar)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(name.trim(), normalizedEmail, hashedPassword, avatar);
  const newUser = {
    id: Number(result.lastInsertRowid),
    name: name.trim(),
    email: normalizedEmail,
    avatar
  };

  const token = createToken(newUser);
  return res.status(201).json({
    message: 'Account created successfully',
    token,
    user: newUser
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'No account found with this email.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar
  };

  const token = createToken(safeUser);
  return res.json({
    message: 'Logged in successfully',
    token,
    user: safeUser
  });
});

// Current User Profile & Stats
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const savedCount = db.prepare('SELECT COUNT(*) as count FROM saved_listings WHERE user_id = ?').get(user.id).count;
  const bookingsCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE user_id = ?').get(user.id).count;
  const listingsCount = db.prepare('SELECT COUNT(*) as count FROM listings WHERE user_id = ?').get(user.id).count;

  return res.json({
    user,
    stats: {
      savedCount,
      bookingsCount,
      listingsCount
    }
  });
});

module.exports = router;
