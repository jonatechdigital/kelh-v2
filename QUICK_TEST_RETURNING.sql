-- QUICK TEST: Single Returning Patient
-- Run this to create ONE test patient from yesterday

-- Create a patient from YESTERDAY
INSERT INTO patients (full_name, phone, age, referral_source, created_at, updated_at)
VALUES (
  'Sarah Returning Patient',
  '0700999999',
  30,
  'Walk-in',
  NOW() - INTERVAL '1 day',  -- Created YESTERDAY
  NOW() - INTERVAL '1 day'
)
RETURNING id, file_number, full_name, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created_date;

-- Add a transaction for them from YESTERDAY
INSERT INTO ledger (
  transaction_type,
  patient_id,
  amount,
  payment_method,
  service_category,
  doctor,
  description,
  created_at,
  updated_at
)
SELECT 
  'INCOME',
  id,
  75000,
  'Cash',
  'Consultation',
  'Dr. Ludo',
  'Initial visit - TEST',
  NOW() - INTERVAL '1 day',  -- Transaction from YESTERDAY
  NOW() - INTERVAL '1 day'
FROM patients 
WHERE phone = '0700999999'
LIMIT 1;

-- VERIFY IT WORKED
SELECT 
  'Patient Created:' as step,
  full_name,
  phone,
  file_number,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM patients 
WHERE phone = '0700999999';

-- ============================================
-- NOW TEST IN YOUR APP:
-- ============================================
-- 
-- 1. Open your app dashboard
-- 2. Set timeframe to "Today"
-- 3. Current metrics should show this patient is NOT new today
-- 
-- 4. Go to "Check-In / Search"
-- 5. Search for "Sarah" or phone "0700999999"
-- 6. Click on the patient
-- 7. Add a NEW service/transaction (with today's date)
-- 
-- 8. Return to Dashboard
-- 9. Set timeframe to "Today"
-- 10. You should see:
--     ✅ Total Patients: 1
--     ✅ New Files: 0
--     ✅ Returning: 1  <-- THIS IS YOUR TEST!
-- 
-- ============================================

SELECT '✅ DONE! Test patient "Sarah Returning Patient" created from yesterday.' as result;
