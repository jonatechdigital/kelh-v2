-- FIX: Convert UUID id columns to BIGINT
-- This fixes the "invalid input syntax for type uuid" error

-- IMPORTANT: This will only work if you don't have critical data
-- If you have important patient data, backup first!

-- Check current id column type
SELECT 
    table_name,
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('patients', 'ledger') 
  AND column_name IN ('id', 'patient_id')
ORDER BY table_name, column_name;

-- If the id columns are UUID, you need to recreate the tables
-- OPTION 1: If you have NO important data (recommended for fresh setup)

-- Drop and recreate patients table
DROP TABLE IF EXISTS ledger CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP SEQUENCE IF EXISTS patients_file_number_seq CASCADE;
DROP SEQUENCE IF EXISTS patients_id_seq CASCADE;

-- Create file number sequence
CREATE SEQUENCE patients_file_number_seq START 1001;

-- Create patients table with BIGINT id
CREATE TABLE patients (
  id BIGSERIAL PRIMARY KEY,
  file_number INTEGER UNIQUE NOT NULL DEFAULT nextval('patients_file_number_seq'),
  full_name TEXT NOT NULL,
  age INTEGER,
  phone TEXT,
  referral_source TEXT,
  address TEXT,
  medical_history TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ledger table with BIGINT ids
CREATE TABLE ledger (
  id BIGSERIAL PRIMARY KEY,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
  payment_method TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
  service_category TEXT,
  doctor TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ledger_patient_id ON ledger(patient_id);
CREATE INDEX idx_ledger_created_at ON ledger(created_at);
CREATE INDEX idx_ledger_transaction_type ON ledger(transaction_type);
CREATE INDEX idx_patients_created_at ON patients(created_at);
CREATE INDEX idx_patients_file_number ON patients(file_number);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON patients;
CREATE POLICY "Enable read access for all users" ON patients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON patients;
CREATE POLICY "Enable insert access for all users" ON patients
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON patients;
CREATE POLICY "Enable update access for all users" ON patients
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON ledger;
CREATE POLICY "Enable read access for all users" ON ledger
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON ledger;
CREATE POLICY "Enable insert access for all users" ON ledger
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON ledger;
CREATE POLICY "Enable update access for all users" ON ledger
  FOR UPDATE USING (true);

SELECT '✅ Tables recreated with BIGINT ids! Patient IDs will now work correctly.' as status;
SELECT 'Patient IDs will show as KELH-1001, KELH-1002, etc.' as note;

-- Verify the structure
SELECT 'PATIENTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

SELECT 'LEDGER TABLE STRUCTURE:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'ledger' 
ORDER BY ordinal_position;
