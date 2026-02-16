# 🚀 Real-time & Audit - Quick Setup

## What This Adds
- ✅ **Auto-refresh** when other users add data (no manual page refresh!)
- ✅ **Track who** created/modified each record
- ✅ **Manual refresh button** on reports page
- ✅ **Last updated** timestamp display

---

## Setup (5 Minutes)

### Step 1: Run SQL Script
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Create new query
4. Copy/paste contents from `ADD_REALTIME_AND_AUDIT.sql`
5. Click **Run** ✅

### Step 2: Enable Realtime
1. Go to **Database** → **Replication**
2. Make sure it shows **"Realtime is enabled"**
3. Done! ✅

---

## Test It Out

### Test Real-time Updates:
1. Open your app in **two browser tabs**
2. **Tab 1:** Go to Reports page
3. **Tab 2:** Go to a patient and add a transaction
4. **Tab 1:** Watch the data update automatically! 🎉

### Test Manual Refresh:
1. Go to Reports page
2. Click the **"Refresh"** button (top right)
3. See the spinning icon and updated timestamp

---

## What Changed

### Reports Page (`/reports`)
- ✅ Added refresh button with spinner animation
- ✅ Shows "Last updated: [time]"
- ✅ Auto-refreshes when ledger data changes
- ✅ Only refreshes data in selected date range

### Patient Profile (`/patients/[id]`)
- ✅ Auto-refreshes ledger history when transactions added
- ✅ Works across multiple users/tabs

### Database
- ✅ Added `created_by` column to track creator
- ✅ Added `updated_by` column to track last editor
- ✅ Automatic triggers set these on insert/update
- ✅ Views to easily see user emails

---

## See Who Did What

Run this in SQL Editor to see audit trail:

```sql
-- Who created recent transactions?
SELECT 
  l.amount,
  l.description,
  u.email as created_by,
  l.created_at
FROM ledger l
LEFT JOIN auth.users u ON l.created_by = u.id
ORDER BY l.created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Data not auto-refreshing?

**Check realtime is enabled:**
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```
Should see `patients` and `ledger`.

**Check browser console:**
- Open DevTools (F12)
- Look for "Ledger data changed:" messages
- Should appear when data is added

### created_by is NULL?

**Solution:**
- Make sure user is logged in when creating records
- The triggers will automatically fill this in

---

## Files Created/Modified

### New Files:
- ✅ `ADD_REALTIME_AND_AUDIT.sql` - Database setup
- ✅ `REALTIME_AND_AUDIT_GUIDE.md` - Full documentation
- ✅ `REALTIME_QUICKSTART.md` - This file

### Modified Files:
- ✅ `src/app/reports/page.tsx` - Added real-time + refresh button
- ✅ `src/app/patients/[id]/page.tsx` - Added real-time for ledger

---

## Next Steps

1. ✅ Run the SQL script (required)
2. ✅ Test in two browser tabs
3. 📖 Read `REALTIME_AND_AUDIT_GUIDE.md` for more details
4. 🎉 Enjoy real-time updates!

---

**Need help?** Check the full guide in `REALTIME_AND_AUDIT_GUIDE.md`
