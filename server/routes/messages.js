const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const HOST_REPLIES = [
  "Thanks for the message! I'm happy to help. The room is in great condition and we keep things clean and peaceful.",
  "Great question! Yes, high-speed Wi-Fi and all utilities are well maintained. We can definitely set up an in-person or video walkthrough.",
  "Sounds wonderful! What move-in date are you aiming for? Feel free to schedule a tour directly using the Schedule Tour button above.",
  "Happy to answer! The flatmates are very respectful and friendly professionals. Let me know if you want more details on the lease terms.",
  "Awesome! I've received your note and will keep you updated. Looking forward to meeting you!"
];

// GET messages for a listing
router.get('/:listingId', requireAuth, (req, res) => {
  const listingId = parseInt(req.params.listingId, 10);
  if (isNaN(listingId)) {
    return res.status(400).json({ error: 'Invalid listing ID' });
  }

  let rows = db.prepare(`
    SELECT * FROM messages
    WHERE listing_id = ? AND user_id = ?
    ORDER BY id ASC
  `).all(listingId, req.user.id);

  // If no messages exist yet, seed a friendly welcome message from this listing's host
  if (rows.length === 0) {
    const listing = db.prepare('SELECT host_name, host_avatar, title FROM listings WHERE id = ?').get(listingId);
    if (listing) {
      const hostAvatar = listing.host_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
      const welcomeText = `Hi there! Thanks for checking out ${listing.title} 🌿 Feel free to ask any questions or schedule a tour!`;
      db.prepare(`
        INSERT INTO messages (listing_id, user_id, sender_type, sender_name, sender_avatar, message)
        VALUES (?, ?, 'host', ?, ?, ?)
      `).run(listingId, req.user.id, listing.host_name, hostAvatar, welcomeText);

      rows = db.prepare(`
        SELECT * FROM messages
        WHERE listing_id = ? AND user_id = ?
        ORDER BY id ASC
      `).all(listingId, req.user.id);
    }
  }

  res.json({
    total: rows.length,
    messages: rows
  });
});

// POST send a message to the host
router.post('/:listingId', requireAuth, (req, res) => {
  const listingId = parseInt(req.params.listingId, 10);
  const { message } = req.body;

  if (isNaN(listingId)) {
    return res.status(400).json({ error: 'Invalid listing ID' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const listing = db.prepare('SELECT id, title, host_name, host_avatar FROM listings WHERE id = ?').get(listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const user = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(req.user.id);
  const userName = user ? user.name : req.user.name || 'You';
  const userAvatar = user && user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0F5132&color=fff`;

  const insertStmt = db.prepare(`
    INSERT INTO messages (listing_id, user_id, sender_type, sender_name, sender_avatar, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Insert user message
  const userMsgResult = insertStmt.run(listingId, req.user.id, 'user', userName, userAvatar, message.trim());
  const userMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(userMsgResult.lastInsertRowid));

  // Count past host replies to choose a context response
  const count = db.prepare("SELECT COUNT(*) as c FROM messages WHERE listing_id = ? AND user_id = ? AND sender_type = 'host'").get(listingId, req.user.id).c;
  const replyText = HOST_REPLIES[count % HOST_REPLIES.length];
  const hostAvatar = listing.host_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

  // Insert host message
  const hostMsgResult = insertStmt.run(listingId, req.user.id, 'host', listing.host_name, hostAvatar, replyText);
  const hostMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(hostMsgResult.lastInsertRowid));

  res.status(201).json({
    userMessage,
    hostMessage
  });
});

module.exports = router;
