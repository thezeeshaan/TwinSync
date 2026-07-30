const { Client } = require('pg');
require('dotenv').config();

async function seed() {
  const dbConfig = {
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // Check if institute already exists
    const { rows } = await client.query('SELECT * FROM institutes WHERE code = $1', ['IITKGP']);
    if (rows.length === 0) {
      await client.query(`
        INSERT INTO institutes (name, code)
        VALUES ('IIT Kharagpur', 'IITKGP')
      `);
      console.log("Mock institute IIT Kharagpur seeded successfully.");
    } else {
      console.log("Mock institute IIT Kharagpur already exists.");
    }
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await client.end();
  }
}

seed();
