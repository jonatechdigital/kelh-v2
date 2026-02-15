-- KELH V2 - Database Update Script
-- Run this in your Supabase SQL Editor to add new columns to existing tables

-- Add referral_source column to patients table (if it doesn't exist)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add service_category column to ledger table (if it doesn't exist)
ALTER TABLE ledger 
ADD COLUMN IF NOT EXISTS service_category TEXT;

-- Add doctor column to ledger table (if it doesn't exist)
ALTER TABLE ledger 
ADD COLUMN IF NOT EXISTS doctor TEXT;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ledger' 
ORDER BY ordinal_position;
