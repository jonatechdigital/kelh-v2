# User Tracking Display - Where to See It

## Overview
After running the `ADD_REALTIME_AND_AUDIT.sql` script, user information is now displayed throughout the application.

---

## 📍 Where User Information Appears

### 1. **Patient Profile - Visit History** (`/patients/[id]`)

Each transaction now shows:
- ✅ Service details (category, doctor, amount)
- ✅ Payment method
- ✅ **"Added by: user@email.com"** - Shows who recorded the transaction

**Example Display:**
```
28/01/2026 | Consultation | UGX 50,000
Doctor: Dr. Ludo • Payment: Cash • Added by: receptionist@kelh.com
```

**What's Tracked:**
- Who registered the patient
- Who added each service/billing transaction
- Timestamps for all actions

---

### 2. **Reports & Analytics** (`/reports`)

The backend now tracks:
- ✅ Who created income entries
- ✅ Who recorded expenses
- ✅ All updates to ledger records

**Current Display:**
- Reports page focuses on analytics (charts, metrics)
- User information available in database queries

**To View User Data:**
Run this SQL query in Supabase:
```sql
SELECT 
  amount,
  transaction_type,
  description,
  created_by_email,
  created_at
FROM ledger_with_audit
ORDER BY created_at DESC
LIMIT 20;
```

---

### 3. **Expense Records** (`/expenses/new`)

Backend tracking:
- ✅ Who recorded each expense
- ✅ When it was recorded
- ✅ Stored in `ledger.created_by` column

**To Add Display:**
Create an expenses list page showing:
- Expense details
- Created by (user email)
- Date/time

---

## 🎯 How It Works

### Automatic Tracking
```
1. User logs in → System knows their ID
2. User adds transaction → created_by auto-set to their ID
3. UI displays → Joins with auth.users to show email
```

### Database Flow
```
ledger table (created_by UUID)
    ↓ (JOIN)
auth.users (email)
    ↓ (VIEW)
ledger_with_audit (created_by_email)
    ↓ (UI)
"Added by: user@email.com"
```

---

## 📊 Available Data

### What's Tracked for Each Record:
- **created_by** - User UUID who created it
- **created_at** - When it was created
- **updated_by** - User UUID who last modified it
- **updated_at** - When it was last modified

### Tables with Tracking:
- ✅ `patients` - Track who registered each patient
- ✅ `ledger` - Track who recorded each transaction/expense

---

## 🔍 Viewing Full Audit Trail

### Option 1: Use SQL Views
```sql
-- See all transactions with user info
SELECT * FROM ledger_with_audit 
ORDER BY created_at DESC;

-- See all patients with user info
SELECT * FROM patients_with_audit 
ORDER BY created_at DESC;
```

### Option 2: Direct Query
```sql
-- Who recorded what today?
SELECT 
  l.id,
  l.amount,
  l.transaction_type,
  l.description,
  u.email as created_by,
  l.created_at
FROM ledger l
LEFT JOIN auth.users u ON l.created_by = u.id
WHERE l.created_at >= CURRENT_DATE
ORDER BY l.created_at DESC;
```

### Option 3: User Activity Report
```sql
-- See what each user has done
SELECT 
  u.email,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN l.transaction_type = 'INCOME' THEN l.amount ELSE 0 END) as total_income_recorded,
  SUM(CASE WHEN l.transaction_type = 'EXPENSE' THEN l.amount ELSE 0 END) as total_expenses_recorded
FROM auth.users u
JOIN ledger l ON l.created_by = u.id
GROUP BY u.email
ORDER BY total_transactions DESC;
```

---

## 🎨 UI Display Examples

### Current Display (Patient Profile)
```
┌─────────────────────────────────────────────────────┐
│ 28/01/2026 | Consultation        UGX 50,000       │
│ Doctor: Dr. Ludo • Payment: Cash                    │
│ • Added by: receptionist@kelh.com                   │
└─────────────────────────────────────────────────────┘
```

### Future Enhancement Ideas

**1. Hover Tooltip:**
```
[i] hover
↓
Created: 28/01/2026 3:45 PM by receptionist@kelh.com
Updated: 28/01/2026 4:12 PM by admin@kelh.com
```

**2. Audit Log Page:**
```
Date/Time          | User                    | Action        | Details
2026-01-28 3:45 PM | receptionist@kelh.com  | Added Service | Consultation (UGX 50,000)
2026-01-28 3:30 PM | receptionist@kelh.com  | Registered    | New Patient (John Doe)
2026-01-28 3:15 PM | admin@kelh.com         | Added Expense | Transport (UGX 20,000)
```

**3. User Activity Dashboard:**
```
Today's Activity:
- receptionist@kelh.com: 15 transactions (UGX 450,000)
- admin@kelh.com: 3 expenses (UGX 75,000)
- nurse@kelh.com: 8 transactions (UGX 320,000)
```

---

## 🔐 Privacy & Security

### What Users See:
- ✅ Email addresses of staff members
- ✅ Timestamps of actions
- ✅ What actions were taken

### What's Protected:
- ❌ User passwords (never visible)
- ❌ Sensitive user data
- ✅ Only authenticated users can see this info
- ✅ RLS policies protect the data

---

## 🚀 Testing User Tracking

### Test 1: Add a Transaction
```
1. Log in as User A (e.g., receptionist@kelh.com)
2. Go to a patient profile
3. Add a service/billing
4. Look at the visit history
5. ✅ Should see "Added by: receptionist@kelh.com"
```

### Test 2: Multiple Users
```
1. User A adds transaction → Shows "Added by: userA@kelh.com"
2. User B adds transaction → Shows "Added by: userB@kelh.com"
3. Both visible in same patient's history
```

### Test 3: SQL Verification
```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  amount,
  created_by_email,
  created_at
FROM ledger_with_audit
ORDER BY created_at DESC
LIMIT 5;

-- Should see your email in created_by_email
```

---

## 📝 Next Steps

### To Add More User Tracking:

**1. Expenses List Page** (show who recorded each expense)
**2. Patient List** (show who registered each patient)
**3. Audit Log Page** (comprehensive activity log)
**4. User Activity Reports** (staff productivity)
**5. Export Audit Trail** (CSV/PDF download)

### Code Template for New Pages:
```typescript
// Fetch data with user info
const { data } = await supabase
  .from('ledger_with_audit')  // Use the audit view
  .select('*, created_by_email')
  .order('created_at', { ascending: false });

// Display in UI
{data.map(item => (
  <div>
    <p>{item.description}</p>
    {item.created_by_email && (
      <span>Added by: {item.created_by_email}</span>
    )}
  </div>
))}
```

---

## 🆘 Troubleshooting

### "Added by" not showing?

**Check 1:** Run the SQL script
```sql
-- Verify view exists
SELECT * FROM ledger_with_audit LIMIT 1;
```

**Check 2:** Verify triggers are working
```sql
-- Check recent records
SELECT created_by, created_by_email 
FROM ledger_with_audit 
ORDER BY created_at DESC 
LIMIT 5;
```

**Check 3:** User must be logged in
- Triggers only work when `auth.uid()` returns a value
- User must be authenticated

### Email showing as NULL?

**Cause:** Records created before running the SQL script won't have user info

**Solution:** 
- Only NEW records will show user info
- Old records will show NULL for created_by_email
- This is normal and expected

---

## 📚 Related Files

- `ADD_REALTIME_AND_AUDIT.sql` - Setup script
- `REALTIME_QUICKSTART.md` - Quick setup guide
- `REALTIME_AND_AUDIT_GUIDE.md` - Full documentation
- `src/app/patients/[id]/page.tsx` - Patient profile with user display

---

**✅ User tracking is now live!** 

New transactions will automatically show who created them.
