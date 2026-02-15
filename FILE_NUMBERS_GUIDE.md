# 🎯 Patient File Numbers (KELH-1001 Format)

## What Changed

Your patient IDs are now displayed in the nice **KELH-1001** format instead of using the raw database ID!

---

## How It Works

- **Database ID (`id`)**: Still exists (e.g., 12345) - used internally for relationships
- **File Number (`file_number`)**: New! Auto-increments starting from 1001
- **Display Format**: `formatPatientId(file_number)` → Shows as **KELH-1001**

---

## 🚀 Setup Required

You need to add the `file_number` column to your database.

### Quick Setup (Choose One):

#### Option 1: Run ADD_FILE_NUMBERS.sql (Recommended)
1. Open `ADD_FILE_NUMBERS.sql`
2. Copy everything
3. Go to Supabase SQL Editor
4. Paste and click **Run**
5. Done! ✅

#### Option 2: Update FIX_SCHEMA.sql
The `FIX_SCHEMA.sql` file has been updated to include `file_number`. Just run it!

---

## 📊 What The Script Does

1. **Adds `file_number` column** to patients table
2. **Creates a sequence** starting at 1001
3. **Assigns file numbers** to existing patients (if any)
4. **Sets up auto-increment** for new patients
5. **Adds unique constraint** (no duplicate file numbers)

---

## ✅ Expected Results

### Before:
```
Patient ID: KELH-12345
```
(Shows raw database ID - could be any large number)

### After:
```
Patient ID: KELH-1001
```
(Shows nice sequential file numbers starting from 1001)

---

## 🔍 How File Numbers Are Assigned

### For New Patients:
- Automatically gets next file number (1001, 1002, 1003...)
- Happens automatically on INSERT

### For Existing Patients:
- The script assigns file numbers in order of their database ID
- First patient → KELH-1001
- Second patient → KELH-1002
- And so on...

---

## 🧪 Testing

After running the script:

1. **Check existing patients:**
```sql
SELECT id, file_number, full_name 
FROM patients 
ORDER BY file_number;
```

2. **Create a new patient** in your app
3. **Check the file number** - should be next in sequence

---

## 📝 Code Changes Made

### Patient Search Page (`/patients`)
- Now fetches `file_number` from database
- Displays `KELH-1001` format using `formatPatientId(file_number)`

### Patient Profile Page (`/patients/[id]`)
- Now fetches `file_number` from database
- Shows `KELH-1001` in the header instead of raw ID

### All References Updated
- Search results
- Patient header
- Debug page
- All display the nice KELH-XXXX format

---

## 🎨 Display Format

The `formatPatientId()` function in `src/lib/utils.ts`:
```typescript
export function formatPatientId(id: number | null | undefined) {
  if (!id) return 'PENDING';
  return `KELH-${id}`;
}
```

Now called with `file_number` instead of `id`:
- `formatPatientId(1001)` → "KELH-1001" ✅
- `formatPatientId(1002)` → "KELH-1002" ✅

---

## 🔧 Troubleshooting

### Error: "column file_number does not exist"
**Fix:** Run `ADD_FILE_NUMBERS.sql` in Supabase SQL Editor

### File numbers look weird (null, undefined)
**Fix:** 
1. Make sure you ran the script
2. Check existing patients have file numbers:
```sql
SELECT id, file_number FROM patients WHERE file_number IS NULL;
```
3. If any are NULL, the script didn't run properly

### File numbers don't start at 1001
**Fix:** Check your sequence:
```sql
SELECT last_value FROM patients_file_number_seq;
```
If it's not starting at 1001, reset it:
```sql
ALTER SEQUENCE patients_file_number_seq RESTART WITH 1001;
```

---

## ✨ Benefits

- **Professional** - Nice clean IDs like KELH-1001
- **Short** - No more giant numbers
- **Sequential** - Easy to track patient count
- **Memorable** - Easy to reference in conversations

---

## 🎯 Ready to Apply?

Run this command in Supabase SQL Editor:

**Copy and paste the entire contents of `ADD_FILE_NUMBERS.sql`**

Then refresh your app and try creating a new patient! 🎉
