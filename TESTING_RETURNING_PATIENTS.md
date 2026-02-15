# 🧪 Testing Returning Patients Feature

## Quick Test (Recommended)

### Step 1: Run the SQL Script
1. Open `QUICK_TEST_RETURNING.sql`
2. Copy everything
3. Go to Supabase SQL Editor
4. Paste and click **Run**
5. You'll see: "✅ DONE! Test patient 'Sarah Returning Patient' created from yesterday."

### Step 2: Test in Your App

#### A. Check Dashboard (Before)
1. Go to your dashboard
2. Select **"Today"** timeframe
3. Note the current metrics (probably all zeros or low numbers)

#### B. Add Service for Yesterday's Patient
1. Click **"CHECK-IN / SEARCH"** (green button)
2. Search for: **"Sarah"** or **"0700999999"**
3. Click on the patient (you'll see it was created yesterday)
4. Click **"ADD SERVICE / BILLING"**
5. Fill in:
   - Service: Consultation
   - Doctor: Dr. Ludo
   - Amount: 50000
   - Payment: Cash
6. Click **"Record Transaction"**

#### C. Check Dashboard (After)
1. Go back to Dashboard
2. Make sure timeframe is **"Today"**
3. Look at the Patients card:

```
Patients (Volume)
      15                    ← Total patients today
      
   5 New Files             ← First-time patients
   10 Returning            ← THIS SHOULD INCREASE BY 1! ✅
```

---

## How It Works

### The Logic:
```
Returning Patient = Patient visited today BUT was created before today
```

### Example Timeline:

**Yesterday (Feb 14):**
- Sarah registers → `created_at = Feb 14`
- Sarah gets treatment → Transaction on Feb 14

**Today (Feb 15):**
- Sarah comes back
- You add a service → Transaction on Feb 15
- Dashboard shows:
  - Total Patients: 1 (Sarah visited today)
  - New Files: 0 (Sarah was NOT created today)
  - Returning: 1 (Sarah was created before, visited today) ✅

---

## Multiple Test Scenarios

### Scenario 1: Mix of New and Returning
Run `TEST_RETURNING_PATIENTS.sql` to create 3 patients from yesterday.

Then today:
1. Register 2 NEW patients
2. Add service for 1 of yesterday's patients

Dashboard will show:
```
Total Patients: 3
New Files: 2 (the ones you just registered)
Returning: 1 (yesterday's patient who came back)
```

### Scenario 2: All Returning Patients
1. Run test script (creates 3 from yesterday)
2. Add services for all 3 today

Dashboard shows:
```
Total Patients: 3
New Files: 0
Returning: 3 ✅ (All returning!)
```

### Scenario 3: Check Yesterday's Metrics
1. Run test script
2. Go to dashboard
3. Select **"Yesterday"** timeframe

You'll see:
```
Total Patients: 3
New Files: 3 (they were new yesterday)
Returning: 0 (they were first-time yesterday)
```

---

## Timeframe Testing

### "Today" Timeframe:
- Shows patients who had transactions TODAY
- New = Created today
- Returning = Created before today but visited today

### "Yesterday" Timeframe:
- Shows patients who had transactions YESTERDAY
- New = Created yesterday
- Returning = Created before yesterday but visited yesterday

### "Week" Timeframe:
- Shows patients from last 7 days
- New = Created in last 7 days
- Returning = Created before 7 days ago but visited in last 7 days

### "Month" Timeframe:
- Shows patients from current month
- New = Created this month
- Returning = Created before this month but visited this month

---

## Verification Queries

### Check Patient Creation Date:
```sql
SELECT 
  file_number,
  full_name,
  TO_CHAR(created_at, 'YYYY-MM-DD') as created_date
FROM patients 
WHERE phone = '0700999999';
```

### Check All Transactions for Test Patient:
```sql
SELECT 
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as transaction_date,
  service_category,
  amount,
  payment_method
FROM ledger 
WHERE patient_id = (SELECT id FROM patients WHERE phone = '0700999999')
ORDER BY created_at DESC;
```

### Check Today's Returning Patients:
```sql
SELECT DISTINCT
  p.file_number,
  p.full_name,
  TO_CHAR(p.created_at, 'YYYY-MM-DD') as patient_created,
  TO_CHAR(l.created_at, 'YYYY-MM-DD') as visited_date,
  CASE 
    WHEN DATE(p.created_at) = CURRENT_DATE THEN 'NEW'
    ELSE 'RETURNING'
  END as patient_type
FROM patients p
JOIN ledger l ON l.patient_id = p.id
WHERE DATE(l.created_at) = CURRENT_DATE
  AND l.transaction_type = 'INCOME'
ORDER BY patient_type, p.file_number;
```

---

## Cleanup (After Testing)

To remove test data:
```sql
-- Delete test patients and their transactions
DELETE FROM ledger 
WHERE patient_id IN (
  SELECT id FROM patients 
  WHERE phone IN ('0700999999', '0700111111', '0700222222', '0700333333')
);

DELETE FROM patients 
WHERE phone IN ('0700999999', '0700111111', '0700222222', '0700333333');

SELECT '✅ Test data cleaned up' as status;
```

---

## Expected Results Summary

| Action | Total | New | Returning |
|--------|-------|-----|-----------|
| After running script (yesterday) | 0 | 0 | 0 |
| Add service for Sarah (today) | 1 | 0 | 1 ✅ |
| Register new patient (today) | 2 | 1 | 1 |
| Add service for another yesterday patient | 3 | 1 | 2 ✅ |

---

## Troubleshooting

### "Patient not found in search"
- Make sure you ran the SQL script
- Check if patient exists: `SELECT * FROM patients WHERE phone = '0700999999'`

### "Returning patients shows 0"
- Did you add a service TODAY for the patient?
- Check timeframe is set to "Today"
- Verify patient was created yesterday: Check `created_at` column

### "Shows as New instead of Returning"
- Check the patient's `created_at` date
- Should be yesterday, not today
- Re-run the script if needed

---

## 🎯 Quick Start

**Simplest test:**
1. Run `QUICK_TEST_RETURNING.sql` ✅
2. Search "Sarah" in your app ✅
3. Add any service ✅
4. Check dashboard → Returning: 1 ✅

Done! 🎉
