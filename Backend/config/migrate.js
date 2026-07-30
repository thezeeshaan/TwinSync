const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  if (!process.env.SUPABASE_DB_URL) {
    console.error("Migration Error: SUPABASE_DB_URL is missing in environment variables.");
    process.exit(1);
  }

  const dbConfig = {
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL for migrations...");

    // 1. Ensure the tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch already executed migrations
    const { rows } = await client.query('SELECT migration_name FROM schema_migrations');
    const executedMigrations = new Set(rows.map(row => row.migration_name));

    // 3. Read migration files from the local directory
    const migrationsDir = path.join(__dirname, '../migration');
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations folder found. Skipping.");
      return;
    }

    // Sort files to ensure they run in order (e.g., 001, 002, 003)
    const files = fs.readdirSync(migrationsDir).sort();

    // 4. Run pending migrations
    for (const file of files) {
      if (file.endsWith('.sql') && !executedMigrations.has(file)) {
        console.log(`Running migration: ${file}...`);
        
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Execute the migration and record it in a single transaction
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`Successfully applied: ${file}`);
        } catch (migrationError) {
          await client.query('ROLLBACK');
          console.error(`Error in migration ${file}:`, migrationError);
          throw migrationError; // Stop the server if a migration fails
        }
      }
    }
    
    console.log("All migrations are up to date.");

  } catch (err) {
    console.error("Migration process failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

module.exports = runMigrations;
