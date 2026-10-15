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

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'RoomieFind Backend API'
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

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 RoomieFind Server is running on:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`📁 Static files & API mounted successfully`);
  console.log(`===============================================`);
});

module.exports = { app, server };
