-- Migration 021: Create lifestyle_profiles table
-- Stores each user's lifestyle answers (one-time setup, tap-based modal)
-- Runs automatically on backend restart via Backend/config/migrate.js

CREATE TABLE IF NOT EXISTS lifestyle_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dietary_pref  TEXT,            -- "vegetarian", "vegan", "non-veg", "eggetarian"
  meals_per_day TEXT,            -- "1", "2", "3", "4+"
  uses_smoking  BOOLEAN DEFAULT false,
  uses_tobacco  BOOLEAN DEFAULT false,
  uses_alcohol  BOOLEAN DEFAULT false,
  sleep_hours   TEXT,            -- "Less than 5", "5-6 hrs", "6-7 hrs", "7-8 hrs", "8+ hrs"
  sleep_quality TEXT,            -- "poor", "okay", "good"
  activity_type TEXT[],          -- array e.g. ["gym", "walking", "yoga"]
  activity_freq TEXT,            -- "Daily", "3-4x / week", "1-2x / week", "Rarely"
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
