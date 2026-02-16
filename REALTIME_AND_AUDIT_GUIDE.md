# Real-time Updates & Audit Trail Guide

## Overview
Your KELH V2 system now includes:
1. **Real-time data synchronization** - See changes instantly when other users add data
2. **User audit trail** - Track who created/modified each record

---

## 🚀 Quick Setup (Required)

### Step 1: Run the SQL Script
1. Go to your Supabase Dashboard
2. Click **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the contents of `ADD_REALTIME_AND_AUDIT.sql`
5. Click **"Run"**

### Step 2: Enable Realtime in Supabase
1. Go to **Database** → **Replication**
2. Make sure **Realtime** is enabled for your project
3. Verify `patients` and `ledger` tables are in the publication list

### Step 3: Redeploy Your App (if deployed)
The real-time subscriptions will work automatically after the SQL script runs.

---

## ✨ Features Enabled

### 1. Auto-Refresh Data (Real-time)
Pages that now auto-update when data changes:

#### **Reports & Analytics Page** (`/reports`)
- ✅ Automatically refreshes when any user adds/edits ledger data
- ✅ Shows "Last updated" timestamp
- ✅ Manual refresh button with loading state
- ✅ Only refreshes data within the selected date range

#### **Patient Profile Page** (`/patients/[id]`)
- ✅ Automatically refreshes ledger history when transactions are added
- ✅ Works across multiple tabs/users viewing the same patient
- ✅ No page reload needed

**How it works:**
- When User A adds a transaction, User B sees it instantly
- When User A records an expense, the reports page updates for User B
- All subscriptions clean up automatically when you leave the page

### 2. User Tracking (Audit Trail)

Every record now tracks:
- **created_by** - Who created the record (user UUID)
- **updated_by** - Who last modified the record (user UUID)
- **created_at** - When it was created (timestamp)
- **updated_at** - When it was last modified (timestamp)

**What's tracked:**
- ✅ Patient registrations (who registered the patient)
- ✅ Ledger entries (who recorded income/expenses)
- ✅ All updates to these records

**Automatic tracking:**
- Database triggers automatically set `created_by` on INSERT
- Database triggers automatically set `updated_by` on UPDATE
- No code changes needed - happens automatically!

---

## 📊 Viewing Audit Information

### Option 1: Using SQL Views
Query the audit views to see who created/modified records:

```sql
-- See ledger entries with user emails
SELECT 
  id,
  amount,
  description,
  created_by_email,
  created_at,
  updated_by_email,
  updated_at
FROM ledger_with_audit
ORDER BY created_at DESC
LIMIT 20;

-- See patients with user emails
SELECT 
  id,
  full_name,
  created_by_email,
  created_at,
  updated_by_email,
  updated_at
FROM patients_with_audit
ORDER BY created_at DESC
LIMIT 20;
```

### Option 2: Direct Table Query
```sql
-- Check who created recent ledger entries
SELECT 
  l.id,
  l.amount,
  l.description,
  u.email as created_by_email,
  l.created_at
FROM ledger l
LEFT JOIN auth.users u ON l.created_by = u.id
ORDER BY l.created_at DESC
LIMIT 20;
```

---

## 🔔 Real-time Events

### What triggers auto-refresh?

**Reports Page:**
- New income/expense added → Refreshes
- Transaction updated → Refreshes
- Transaction deleted → Refreshes
- Only refreshes if change is within selected date range

**Patient Profile:**
- New transaction for this patient → Ledger history updates
- Transaction updated → Ledger history updates
- Transaction deleted → Ledger history updates

### Performance Notes
- Subscriptions are scoped to relevant data only
- Multiple users can have subscriptions without performance impact
- Subscriptions automatically clean up when you leave the page
- No polling - uses WebSocket connections (efficient)

---

## 🛠️ Technical Details

### Database Changes Made

1. **New Columns:**
   ```sql
   patients.created_by  → UUID (references auth.users)
   patients.updated_by  → UUID (references auth.users)
   ledger.created_by    → UUID (references auth.users)
   ledger.updated_by    → UUID (references auth.users)
   ```

2. **New Triggers:**
   - `patients_set_created_by` - Auto-sets creator on INSERT
   - `patients_set_updated_by` - Auto-sets updater on UPDATE
   - `ledger_set_created_by` - Auto-sets creator on INSERT
   - `ledger_set_updated_by` - Auto-sets updater on UPDATE

3. **New Views:**
   - `ledger_with_audit` - Ledger with user emails
   - `patients_with_audit` - Patients with user emails

4. **Realtime Configuration:**
   - Tables set to `REPLICA IDENTITY FULL`
   - Tables added to `supabase_realtime` publication

### Code Changes Made

**Reports Page (`src/app/reports/page.tsx`):**
```typescript
// Real-time subscription
useEffect(() => {
  const channel = supabase
    .channel('ledger-changes')
    .on('postgres_changes', { /* ... */ }, () => {
      fetchData(); // Auto-refresh
    })
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [dateRange, isAdmin]);
```

**Patient Profile (`src/app/patients/[id]/page.tsx`):**
```typescript
// Real-time subscription for patient ledger
useEffect(() => {
  const channel = supabase
    .channel(`patient-${id}-ledger`)
    .on('postgres_changes', {
      filter: `patient_id=eq.${id}`
    }, () => {
      // Refresh ledger history
    })
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [patientId]);
```

---

## 🔍 Troubleshooting

### Issue: Data not refreshing automatically

**Check 1: Is Realtime enabled?**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```
Should see `patients` and `ledger` in results.

**Check 2: Check browser console**
Open DevTools → Console, look for:
- ✅ "Ledger data changed:" log messages
- ❌ WebSocket connection errors

**Check 3: Verify subscription**
```javascript
// Should see in console when subscription connects
console.log('Channel status:', channel.state);
```

### Issue: created_by is NULL

**Cause:** User not authenticated when creating record

**Fix:**
1. Make sure user is logged in
2. Check that `auth.uid()` returns a value:
   ```sql
   SELECT auth.uid(); -- Should return your user UUID
   ```

### Issue: "permission denied for table auth.users"

**Cause:** Views trying to access auth.users without permission

**Fix:**
Already handled in the SQL script with `SECURITY DEFINER` functions.

---

## 📝 Best Practices

### 1. Always Check Authentication
```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Handle unauthenticated state
  return;
}
```

### 2. Clean Up Subscriptions
```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel').subscribe();
  
  // Always return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}, [dependencies]);
```

### 3. Scope Subscriptions
```typescript
// Bad: Listens to ALL ledger changes
.on('postgres_changes', { table: 'ledger' })

// Good: Only listen to relevant data
.on('postgres_changes', { 
  table: 'ledger',
  filter: `patient_id=eq.${patientId}` // Scoped to specific patient
})
```

### 4. Handle Errors Gracefully
```typescript
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', {}, (payload) => {
    try {
      // Handle update
    } catch (error) {
      console.error('Error handling realtime update:', error);
    }
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Connected to realtime');
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('❌ Realtime connection error');
    }
  });
```

---

## 🚀 Future Enhancements

### Possible additions:
1. **Audit log viewer page** - See all changes with filters
2. **User activity dashboard** - Who's doing what
3. **Real-time notifications** - Toast messages when data updates
4. **Conflict resolution** - Handle simultaneous edits
5. **Version history** - Track all changes to records

---

## 📚 Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Postgres Triggers Guide](https://www.postgresql.org/docs/current/trigger-definition.html)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify the SQL script ran successfully
3. Check Supabase logs (Database → Logs)
4. Ensure Realtime is enabled in your project
5. Verify RLS policies allow access to the data
