-- TEST DATA: Create patients from yesterday to test "Returning Patients"
-- Run this in Supabase SQL Editor

-- This script will:
-- 1. Create 2-3 patients with yesterday's date
-- 2. Add transactions for them from yesterday
-- 3. When you see them today, they'll count as "returning patients"

-- ============================================
-- STEP 1: Create patients from YESTERDAY
-- ============================================

-- Insert patients with yesterday's created_at timestamp
INSERT INTO patients (full_name, phone, age, referral_source, created_at, updated_at)
VALUES 
  ('Test Patient One', '0700111111', 35, 'Walk-in', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('Test Patient Two', '0700222222', 42, 'Social Media', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('Test Patient Three', '0700333333', 28, 'Dr. Ludo', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
RETURNING id, file_number, full_name, created_at;

-- ============================================
-- STEP 2: Add transactions for these patients from YESTERDAY
-- ============================================

-- Get the patient IDs we just created and add transactions
WITH new_patients AS (
  SELECT id FROM patients 
  WHERE phone IN ('0700111111', '0700222222', '0700333333')
)
INSERT INTO ledger (transaction_type, patient_id, amount, payment_method, service_category, doctor, description, created_at, updated_at)
SELECT 
  'INCOME',
  id,
  50000 + (RANDOM() * 100000)::int, -- Random amount between 50K-150K
  'Cash',
  'Consultation',
  'Dr. Ludo',
  'Initial consultation - TEST DATA',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
FROM new_patients;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the patients we just created
SELECT 
  id,
  file_number,
  full_name,
  phone,
  created_at,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as formatted_date
FROM patients 
WHERE phone IN ('0700111111', '0700222222', '0700333333')
ORDER BY id DESC;

-- Check their transactions
SELECT 
  l.id,
  l.patient_id,
  p.full_name,
  l.amount,
  l.service_category,
  l.created_at,
  TO_CHAR(l.created_at, 'YYYY-MM-DD HH24:MI') as formatted_date
FROM ledger l
JOIN patients p ON l.patient_id = p.id
WHERE p.phone IN ('0700111111', '0700222222', '0700333333')
ORDER BY l.created_at DESC;

-- ============================================
-- HOW TO TEST RETURNING PATIENTS
-- ============================================

-- Now in your app:
-- 1. Go to the dashboard
-- 2. Select "Today" timeframe
-- 3. These 3 patients should NOT appear (created yesterday)
-- 
-- 4. Search for "Test Patient One" in Check-In
-- 5. Add a new service/transaction for them TODAY
-- 6. Go back to dashboard
-- 7. You should see:
--    - Total Patients: 1
--    - New Files: 0
--    - Returning: 1 ✅ (This is your returning patient!)
--
-- 8. Select "Yesterday" timeframe to see them as new patients from yesterday

SELECT '✅ Test data created successfully!' as status;
SELECT 'Go to your app and add a service for "Test Patient One" today to see them as RETURNING' as next_step;
