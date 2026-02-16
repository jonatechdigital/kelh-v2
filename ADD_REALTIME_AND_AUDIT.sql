-- ADD REALTIME AND AUDIT TRACKING
-- This script adds user tracking columns and enables realtime for all tables

-- ============================================
-- STEP 1: Add Audit Columns to Tables
-- ============================================

-- Add audit columns to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add audit columns to ledger table
ALTER TABLE ledger 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ============================================
-- STEP 2: Enable Realtime for Tables
-- ============================================

-- Enable realtime on patients table
ALTER TABLE patients REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;

-- Enable realtime on ledger table
ALTER TABLE ledger REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE ledger;

-- ============================================
-- STEP 3: Create Function to Auto-set created_by
-- ============================================

-- Function to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set created_by if it's not already set
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically set updated_by on update
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Create Triggers
-- ============================================

-- Triggers for patients table
DROP TRIGGER IF EXISTS patients_set_created_by ON patients;
CREATE TRIGGER patients_set_created_by
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS patients_set_updated_by ON patients;
CREATE TRIGGER patients_set_updated_by
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- Triggers for ledger table
DROP TRIGGER IF EXISTS ledger_set_created_by ON ledger;
CREATE TRIGGER ledger_set_created_by
  BEFORE INSERT ON ledger
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS ledger_set_updated_by ON ledger;
CREATE TRIGGER ledger_set_updated_by
  BEFORE UPDATE ON ledger
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- ============================================
-- STEP 5: Create View for Audit Trail
-- ============================================

-- View to see who created/modified records with user emails
CREATE OR REPLACE VIEW ledger_with_audit AS
SELECT 
  l.*,
  creator.email as created_by_email,
  updater.email as updated_by_email
FROM ledger l
LEFT JOIN auth.users creator ON l.created_by = creator.id
LEFT JOIN auth.users updater ON l.updated_by = updater.id;

CREATE OR REPLACE VIEW patients_with_audit AS
SELECT 
  p.*,
  creator.email as created_by_email,
  updater.email as updated_by_email
FROM patients p
LEFT JOIN auth.users creator ON p.created_by = creator.id
LEFT JOIN auth.users updater ON p.updated_by = updater.id;

-- ============================================
-- STEP 6: Grant Permissions
-- ============================================

-- Grant access to the views
GRANT SELECT ON ledger_with_audit TO authenticated;
GRANT SELECT ON patients_with_audit TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if realtime is enabled (replica identity)
-- Should show 'f' (full) for both tables
SELECT 
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity_setting
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('patients', 'ledger')
ORDER BY c.relname;

-- Check if tables are in realtime publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('patients', 'ledger')
ORDER BY tablename;

-- Check audit columns exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('patients', 'ledger')
  AND column_name IN ('created_by', 'updated_by')
ORDER BY table_name, column_name;

-- Check triggers exist
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('patients', 'ledger')
  AND (trigger_name LIKE '%created_by%' OR trigger_name LIKE '%updated_by%')
ORDER BY event_object_table, trigger_name;

-- Test: View recent ledger entries with user info
SELECT 
  id,
  amount,
  transaction_type,
  created_at,
  created_by_email,
  updated_at,
  updated_by_email
FROM ledger_with_audit
ORDER BY created_at DESC
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Real-time and Audit setup complete!';
  RAISE NOTICE 'Tables configured: patients, ledger';
  RAISE NOTICE 'Audit columns added: created_by, updated_by';
  RAISE NOTICE 'Triggers created for automatic tracking';
  RAISE NOTICE 'Views created: ledger_with_audit, patients_with_audit';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your system now has:';
  RAISE NOTICE '  - Real-time data synchronization';
  RAISE NOTICE '  - User audit trail tracking';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Read REALTIME_QUICKSTART.md to test it out!';
END $$;
