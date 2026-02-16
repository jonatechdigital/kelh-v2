# Authentication Setup Guide

## Overview

Your KELH V2 application now has a complete authentication system using **Supabase Auth**. Users must log in to access any part of the application.

## Features Implemented

✅ **Email/Password Authentication**
- User registration with email, password, and full name
- Secure login system
- Password validation (minimum 6 characters)

✅ **Session Management**
- Server-side session handling using Next.js middleware
- Automatic token refresh
- Persistent login across browser sessions

✅ **Protected Routes**
- All routes require authentication (except `/login` and `/signup`)
- Automatic redirect to login page for unauthenticated users
- Automatic redirect from login/signup to dashboard for authenticated users

✅ **User Interface**
- Professional login and signup pages with Tailwind CSS
- Header component showing logged-in user email
- Sign out functionality
- Form validation and error handling

## Files Created/Modified

### New Files

1. **`src/middleware.ts`** - Route protection and session management
2. **`src/app/actions/auth.ts`** - Server actions for authentication
3. **`src/app/login/page.tsx`** - Login page
4. **`src/app/signup/page.tsx`** - Signup page
5. **`src/components/Header.tsx`** - Header with user info and logout
6. **`UPDATE_RLS_POLICIES.sql`** - Database security updates

### Modified Files

1. **`src/app/layout.tsx`** - Added Header component

## Setup Instructions

### Step 1: Enable Email Authentication in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com/project/xorhevhwffqawrjahxjv
2. Navigate to **Authentication** → **Providers**
3. Make sure **Email** provider is enabled
4. Configure email settings:
   - **Enable Email Confirmations**: You can disable this for development (faster testing)
   - For production, enable it for security

### Step 2: Update Database Security Policies

Run the SQL script to update your Row Level Security (RLS) policies:

1. Go to Supabase Dashboard → **SQL Editor**
2. Open the file `UPDATE_RLS_POLICIES.sql` from your project
3. Copy and paste the entire contents into the SQL Editor
4. Click **Run** to execute

This will:
- Remove the old "allow all users" policies
- Create new policies that require authentication
- Only authenticated users can read/write data

### Step 3: Test the Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. You'll be automatically redirected to `/login`

4. Click **Sign up** to create a new account:
   - Enter your full name
   - Enter your email
   - Create a password (minimum 6 characters)

5. After signup, you'll be automatically logged in and redirected to the dashboard

6. Test logout by clicking the **Sign Out** button in the header

7. Try logging back in with your credentials

## How It Works

### Middleware Protection

The `middleware.ts` file runs on every request and:
- Checks if the user has a valid session
- Refreshes expired tokens automatically
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from `/login` and `/signup`

### Server Actions

Authentication operations use Next.js Server Actions:
- `login(formData)` - Signs in a user
- `signup(formData)` - Creates a new user account
- `signOut()` - Signs out the current user

These run on the server for security and use Supabase's built-in auth methods.

### Session Management

- Sessions are stored in HTTP-only cookies (secure)
- The Supabase client handles cookie management automatically
- Tokens are refreshed before they expire

## User Roles (Optional Enhancement)

Currently, all authenticated users have the same access level. If you want to add roles (e.g., Admin, Staff, Receptionist), you can:

1. Add a `role` column to the `auth.users` metadata
2. Update RLS policies to check user roles
3. Add role-based UI elements

## Security Considerations

✅ **Implemented:**
- Row Level Security (RLS) enabled on all tables
- Authentication required for all data access
- Secure session management with HTTP-only cookies
- Server-side authentication validation

🔒 **Recommended Enhancements:**
- Enable email confirmations in production
- Add password reset functionality
- Implement rate limiting for login attempts
- Add two-factor authentication (2FA)

## Common Issues & Solutions

### Issue: "Invalid JWT" errors

**Solution:** The session token expired. Sign out and sign back in.

### Issue: Can't access data after authentication

**Solution:** Make sure you ran the `UPDATE_RLS_POLICIES.sql` script in Supabase.

### Issue: Email not sending

**Solution:** 
1. Check Supabase email settings
2. For development, disable email confirmation
3. For production, configure SMTP settings

### Issue: Redirecting infinitely

**Solution:** 
1. Clear browser cookies
2. Check middleware configuration
3. Make sure `.env.local` has correct Supabase keys

## Testing Checklist

- [ ] Can sign up with new account
- [ ] Can log in with existing account
- [ ] Can log out successfully
- [ ] Unauthenticated users can't access dashboard
- [ ] Authenticated users can access all pages
- [ ] Header shows correct user email
- [ ] Form validation works (required fields, password length)
- [ ] Error messages display correctly

## Next Steps

Now that authentication is set up, you can:

1. **Add user roles** - Differentiate between admin and regular users
2. **Add password reset** - Let users reset forgotten passwords
3. **Add profile page** - Let users update their information
4. **Add audit logs** - Track who made changes to data
5. **Add team management** - Let admins invite other users

## Support

If you encounter any issues:
1. Check browser console for errors
2. Check Supabase logs in the dashboard
3. Verify environment variables are correct
4. Make sure RLS policies were applied correctly
