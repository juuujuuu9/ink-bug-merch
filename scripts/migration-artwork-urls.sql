-- Run in Neon SQL Editor to add artwork_urls column.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS artwork_urls TEXT[];
