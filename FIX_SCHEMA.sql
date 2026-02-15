-- KELH V2 - Complete Database Schema Fix
-- This script will ensure ALL required columns exist
-- Run this in your Supabase SQL Editor

-- First, let's check what columns currently exist
DO $$ 
BEGIN
    RAISE NOTICE 'Current patients table structure:';
END $$;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

-- Add missing columns to patients table one by one
ALTER TABLE patients ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS file_number INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create sequence for file numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS patients_file_number_seq START 1001;

-- Set default for file_number
ALTER TABLE patients ALTER COLUMN file_number SET DEFAULT nextval('patients_file_number_seq');

-- Assign file numbers to existing patients that don't have one
DO $$
DECLARE
  patient_record RECORD;
  counter INTEGER;
BEGIN
  -- Get the current max file_number or start from 1001
  SELECT COALESCE(MAX(file_number), 1000) INTO counter FROM patients WHERE file_number IS NOT NULL;
  counter := counter + 1;
  
  -- Assign file numbers to patients without one
  FOR patient_record IN 
    SELECT id FROM patients WHERE file_number IS NULL ORDER BY id
  LOOP
    UPDATE patients SET file_number = counter WHERE id = patient_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update sequence to continue from last number
  IF counter > 1001 THEN
    PERFORM setval('patients_file_number_seq', counter - 1);
  END IF;
END $$;

-- Add missing columns to ledger table
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS doctor TEXT;
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS description TEXT;

-- Make full_name NOT NULL (if it has data)
-- Skip this if you get an error
ALTER TABLE patients ALTER COLUMN full_name SET NOT NULL;

-- Verify the final structure
SELECT 'PATIENTS TABLE:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

SELECT 'LEDGER TABLE:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ledger' 
ORDER BY ordinal_position;

-- If you see this message, the update was successful
SELECT '✅ Database schema updated successfully!' as status;
