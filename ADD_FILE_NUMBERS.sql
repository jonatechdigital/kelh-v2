-- Add file_number column with auto-increment starting from 1001
-- This gives you nice KELH-1001, KELH-1002, etc. format

-- Step 1: Add the column
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS file_number INTEGER;

-- Step 2: Create a sequence starting from 1001
CREATE SEQUENCE IF NOT EXISTS patients_file_number_seq START 1001;

-- Step 3: Set default value for new records
ALTER TABLE patients 
ALTER COLUMN file_number SET DEFAULT nextval('patients_file_number_seq');

-- Step 4: Update existing patients with file numbers (if any exist)
DO $$
DECLARE
  patient_record RECORD;
  counter INTEGER := 1001;
BEGIN
  FOR patient_record IN 
    SELECT id FROM patients WHERE file_number IS NULL ORDER BY id
  LOOP
    UPDATE patients SET file_number = counter WHERE id = patient_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update the sequence to continue from the last used number
  IF counter > 1001 THEN
    PERFORM setval('patients_file_number_seq', counter - 1);
  END IF;
END $$;

-- Step 5: Make file_number NOT NULL (now that all have values)
ALTER TABLE patients 
ALTER COLUMN file_number SET NOT NULL;

-- Step 6: Add unique constraint
ALTER TABLE patients 
ADD CONSTRAINT patients_file_number_unique UNIQUE (file_number);

-- Verify the changes
SELECT id, file_number, full_name FROM patients ORDER BY file_number LIMIT 10;

SELECT '✅ File numbers added! New patients will get KELH-1001, KELH-1002, etc.' as status;
