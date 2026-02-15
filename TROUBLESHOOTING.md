# 🚨 URGENT: Database Schema Mismatch Fix

## The Problem

You're getting errors like:
- **"Could not find the 'phone' column of 'patients' in the schema cache"**
- **"Patient fetch error"**
- **"Registration error"**

This means your Supabase database schema doesn't match what the code expects.

---

## 🔍 STEP 1: Diagnose the Problem

### Option A: Run DIAGNOSTIC.sql (Recommended)

1. Open `DIAGNOSTIC.sql` from this project
2. Copy ALL the contents
3. Go to Supabase SQL Editor
4. Paste and click **"Run"**
5. Look at the results - it shows what you HAVE vs what you NEED

### Option B: Visit the Schema Checker Page

1. Navigate to: `http://localhost:3000/schema-check`
2. Follow the instructions on that page

---

## 🔧 SOLUTION (Choose One Method)

### Method 1: Add Missing Columns (RECOMMENDED - Quick Fix)

1. **Open Supabase SQL Editor:**
   - Go to https://supabase.com
   - Navigate to your project
   - Click **"SQL Editor"** in the left sidebar

2. **Copy and Run `FIX_SCHEMA.sql`:**
   - Open the `FIX_SCHEMA.sql` file in this project
   - Copy ALL the contents
   - Paste into the Supabase SQL Editor
   - Click **"Run"** or press Ctrl+Enter

3. **Verify Success:**
   - You should see a table showing all columns
   - Look for the message: "✅ Database schema updated successfully!"

4. **Refresh Your App:**
   - Go back to your app
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Try registering a patient again

---

### Method 2: Recreate Tables from Scratch (If Method 1 Fails)

⚠️ **WARNING:** This will delete all existing data!

1. **Backup Your Data First** (if you have important data)

2. **Open Supabase SQL Editor**

3. **Run this command to drop and recreate:**

```sql
-- Drop existing tables (THIS DELETES ALL DATA!)
DROP TABLE IF EXISTS ledger CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Then copy and paste the ENTIRE contents of schema.sql
-- (The full CREATE TABLE statements)
```

4. **Copy and paste ALL contents from `schema.sql`**

5. **Click Run**

---

## 📋 Expected Table Structure

After running the fix, your `patients` table should have these columns:

```
id               | bigint          | NOT NULL
full_name        | text            | NOT NULL
age              | integer         | NULL
phone            | text            | NULL
referral_source  | text            | NULL
address          | text            | NULL
medical_history  | text            | NULL
created_at       | timestamptz     | NULL
updated_at       | timestamptz     | NULL
```

Your `ledger` table should have these columns:

```
id                | bigint          | NOT NULL
transaction_type  | text            | NOT NULL
payment_method    | text            | NOT NULL
amount            | numeric(10,2)   | NOT NULL
patient_id        | bigint          | NULL
service_category  | text            | NULL
doctor            | text            | NULL
description       | text            | NULL
created_at        | timestamptz     | NULL
updated_at        | timestamptz     | NULL
```

---

## 🔍 How to Check Your Current Schema

Run this in Supabase SQL Editor to see what columns you currently have:

```sql
-- Check patients table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

-- Check ledger table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ledger' 
ORDER BY ordinal_position;
```

---

## 💡 Why This Happened

This usually happens when:
1. The database was created with an older version of the schema
2. Some columns were never added to the database
3. The schema file wasn't run completely
4. Tables were created manually without all columns

---

## ✅ After Running the Fix

The error messages in the app will now:
1. Show you exactly which column is missing (if any)
2. Tell you to run `FIX_SCHEMA.sql` if there's still a schema issue
3. Show the actual database error message

---

## 🆘 Still Having Issues?

1. **Check the browser console** - You'll now see detailed error information
2. **Verify your Supabase connection** - Make sure `.env.local` has correct credentials
3. **Check RLS policies** - The schema.sql file includes policies, but verify they exist
4. **Try the table inspector** - In Supabase, go to "Table Editor" and manually check the columns

---

## 📞 Common Errors After This Fix

### "row-level security policy violation"
**Solution:** The RLS policies aren't set up. Run the full `schema.sql` file.

### "relation 'patients' does not exist"  
**Solution:** The table doesn't exist at all. Run the full `schema.sql` file.

### "null value in column 'full_name' violates not-null constraint"
**Solution:** This is expected - you must enter a name when registering a patient.

---

## 🎯 Quick Test After Fix

1. Go to `/patients`
2. Click "Register New Patient"
3. Enter just a name
4. Click "Register Patient"
5. You should be redirected to the patient profile page

If this works, everything is fixed! ✅
