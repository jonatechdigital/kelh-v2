-- DIAGNOSTIC: Check Current Database Schema
-- Copy this entire script and run it in Supabase SQL Editor
-- This will show you exactly what columns you have and what's missing

-- ============================================
-- STEP 1: Check what columns currently exist
-- ============================================

SELECT '=== PATIENTS TABLE - CURRENT COLUMNS ===' as info;

SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'patients' 
ORDER BY ordinal_position;

SELECT '=== LEDGER TABLE - CURRENT COLUMNS ===' as info;

SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'ledger' 
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: What you SHOULD have
-- ============================================

SELECT '=== REQUIRED COLUMNS FOR PATIENTS ===' as info;
SELECT unnest(ARRAY[
    'id',
    'full_name',
    'phone',
    'age',
    'referral_source',
    'address',
    'medical_history',
    'created_at',
    'updated_at'
]) as required_column;

SELECT '=== REQUIRED COLUMNS FOR LEDGER ===' as info;
SELECT unnest(ARRAY[
    'id',
    'transaction_type',
    'payment_method',
    'amount',
    'patient_id',
    'service_category',
    'doctor',
    'description',
    'created_at',
    'updated_at'
]) as required_column;

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 
-- Compare the "CURRENT COLUMNS" with "REQUIRED COLUMNS"
-- 
-- If any required columns are missing:
-- 1. Run FIX_SCHEMA.sql (recommended)
-- OR
-- 2. Add them manually with:
--    ALTER TABLE patients ADD COLUMN column_name TEXT;
--
-- ============================================
