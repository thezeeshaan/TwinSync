const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const runMigrations = require('./config/migrate');
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Configure CORS to allow requests from the deployed frontend and local dev
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// Initialize Supabase Client for backend operations
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TwinSync API is running' });
});

const authRoutes = require('./routes/authRoutes');

// Setup endpoint structure for our 4 pillars
app.use('/api/auth', authRoutes);
app.use('/api/checkin', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/insights', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/counselor', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/community', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));

// Add a test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Run migrations and then start the server
runMigrations().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });
}).catch(err => {
  console.error("Failed to run migrations at startup:", err);
  process.exit(1);
});
