# KELH V2 - Patient Journey Setup

## 🚨 CRITICAL: Fix Database Schema First!

**You're seeing errors because your database is missing required columns.**

### Quick Fix (2 minutes):

1. **Open Supabase SQL Editor:**
   - Go to https://supabase.com → Your Project → SQL Editor

2. **Run the Fix:**
   - Open `FIX_SCHEMA.sql` in this project
   - Copy ALL the contents
   - Paste into SQL Editor
   - Click **"Run"**

3. **Verify:**
   - You should see tables listing all columns
   - Look for: "✅ Database schema updated successfully!"

4. **Test:**
   - Refresh your app
   - Try registering a patient

**That's it!** The error should be gone.

---

## 📚 Full Documentation

For detailed troubleshooting, see `TROUBLESHOOTING.md`

For complete setup instructions, see below.

---

1. Start your development server (if not already running):
   ```bash
   npm run dev
   ```

2. Navigate to the Check-In page from the homepage

3. Try registering a new patient:
   - Enter full name (required)
   - Enter phone (optional)
   - Enter age (optional)
   - Select referral source

4. After registration, you'll be redirected to the patient profile

5. Try adding a service/billing entry:
   - Click the green "ADD SERVICE / BILLING" button
   - Fill in the service details
   - Submit the transaction

## 🎯 Features Implemented

### Patient Search & Registration (`/patients`)
- ✅ Real-time search by name or phone
- ✅ Patient results show KELH-ID, name, phone, and age
- ✅ New patient registration form
- ✅ Auto-redirect to patient profile after registration

### Patient Profile & Billing (`/patients/[id]`)
- ✅ Patient header with KELH-ID, name, age, phone, referral
- ✅ Total spent calculation
- ✅ Add service/billing modal with:
  - Service category dropdown
  - Doctor dropdown
  - Amount input
  - Payment method dropdown
  - Notes field
- ✅ Visit history table showing all past transactions
- ✅ Back navigation to search page

## 🔧 Troubleshooting

### Error: "column does not exist"
**Solution:** You haven't run the database update script yet. Follow Step 1 above.

### Error: "Failed to register patient"
**Solution:** Check the browser console for detailed error messages. Most likely you need to run the database update script.

### Error: "Patient not found"
**Solution:** Make sure you're using a valid patient ID from your database.

## 📝 Database Schema Reference

### Patients Table
```sql
CREATE TABLE patients (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER,
  phone TEXT,
  referral_source TEXT,        -- NEW COLUMN
  address TEXT,
  medical_history TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Ledger Table
```sql
CREATE TABLE ledger (
  id BIGSERIAL PRIMARY KEY,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
  payment_method TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
  service_category TEXT,        -- NEW COLUMN
  doctor TEXT,                  -- NEW COLUMN
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎨 Design Standards

All pages follow these design principles:
- **Strictly Light Mode:** White backgrounds, Slate-900 text, Slate-200 borders
- **Large Touch Targets:** `p-3` and `text-lg` for all inputs
- **Icons:** lucide-react icons throughout
- **Responsive:** Works on desktop and mobile
- **Professional Colors:**
  - Blue (#2563eb) for primary actions
  - Green (#16a34a) for billing/money in
  - Red (#dc2626) for expenses/money out
  - Slate for neutral elements

## 💡 Need Help?

If you encounter any issues:
1. Check the browser console for detailed error messages
2. Verify your database has been updated correctly
3. Ensure your `.env.local` file has the correct Supabase credentials
4. Make sure your Supabase project has the correct RLS policies enabled
