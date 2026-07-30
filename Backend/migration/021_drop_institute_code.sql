-- Drop the redundant 'code' column from institutes table.
-- Institute identification is handled by name (UNIQUE) and UUID id.
ALTER TABLE public.institutes DROP COLUMN IF EXISTS code;
