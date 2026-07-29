const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client (uncomment when keys are added to .env)
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TwinSync API is running' });
});

// Setup basic endpoint structure for our 4 pillars
app.use('/api/auth', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/checkin', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/insights', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/counselor', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/community', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
