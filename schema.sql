-- KELH V2 Database Schema
-- Run this in your Supabase SQL Editor to create/update the tables

-- Drop existing tables if you want to start fresh (CAUTION: This deletes all data!)
-- DROP TABLE IF EXISTS ledger CASCADE;
-- DROP TABLE IF EXISTS patients CASCADE;

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER,
  phone TEXT,
  address TEXT,
  medical_history TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ledger table
CREATE TABLE IF NOT EXISTS ledger (
  id BIGSERIAL PRIMARY KEY,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
  payment_method TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_patient_id ON ledger(patient_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_type ON ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (adjust based on your security needs)
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

-- If your tables already exist with different column names, use ALTER TABLE:
-- ALTER TABLE patients RENAME COLUMN name TO full_name;
-- ALTER TABLE ledger ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2);
