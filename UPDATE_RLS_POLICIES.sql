-- UPDATE RLS POLICIES FOR AUTHENTICATED USERS ONLY
-- Run this in your Supabase SQL Editor after setting up authentication

-- Drop existing public policies
DROP POLICY IF EXISTS "Enable read access for all users" ON patients;
DROP POLICY IF EXISTS "Enable insert access for all users" ON patients;
DROP POLICY IF EXISTS "Enable update access for all users" ON patients;
DROP POLICY IF EXISTS "Enable read access for all users" ON ledger;
DROP POLICY IF EXISTS "Enable insert access for all users" ON ledger;
DROP POLICY IF EXISTS "Enable update access for all users" ON ledger;

-- Create new policies that require authentication
-- PATIENTS TABLE
CREATE POLICY "Enable read access for authenticated users" ON patients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON patients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON patients
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON patients
  FOR DELETE USING (auth.role() = 'authenticated');

-- LEDGER TABLE
CREATE POLICY "Enable read access for authenticated users" ON ledger
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON ledger
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON ledger
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON ledger
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('patients', 'ledger');

-- View all policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('patients', 'ledger');
