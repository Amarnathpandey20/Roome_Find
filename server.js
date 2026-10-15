const express = require('express');
const cors = require('cors');
const path = require('node:path');

// Initialize database
require('./server/db');

const authRoutes = require('./server/routes/auth');
const listingRoutes = require('./server/routes/listings');
const savedRoutes = require('./server/routes/saved');
const bookingRoutes = require('./server/routes/bookings');
const messageRoutes = require('./server/routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// URL normalization for Vercel Serverless Function rewrites & proxies
app.use((req, res, next) => {
  const origPath = req.headers['x-matched-path'] || req.headers['x-invoke-path'] || req.headers['x-now-route-matches'];
  if (origPath && (req.url === '/api/index.js' || req.url.startsWith('/api/index.js?') || req.url === '/api' || req.url === '/')) {
    const queryIndex = req.url.indexOf('?');
    const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : '';
    req.url = origPath + queryString;
  }
  if (req.query && req.query.match && (req.url === '/api/index.js' || req.url.startsWith('/api/index.js?'))) {
    const matchVal = Array.isArray(req.query.match) ? req.query.match.join('/') : req.query.match;
    req.url = '/api/' + matchVal;
  }
  if (req.url.startsWith('/api') || req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes (supports both /api/path and /path)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/listings', '/listings'], listingRoutes);
app.use(['/api/saved', '/saved'], savedRoutes);
app.use(['/api/bookings', '/bookings'], bookingRoutes);
app.use(['/api/messages', '/messages'], messageRoutes);

// Health check endpoint
app.get(['/api/health', '/health', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'RoomieFind Backend API'
  });
});

// Explicit JSON 404 handler for unhandled /api calls (prevents falling through to static HTML)
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`
  });
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// Route fallbacks
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 RoomieFind Server is running on:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`📁 Static files & API mounted successfully`);
    console.log(`===============================================`);
  });
}

module.exports = app;
