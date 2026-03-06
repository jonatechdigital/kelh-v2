import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { LogOut, UserCog } from 'lucide-react';
import { signOut } from '@/app/actions/auth';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="ios-frosted sticky top-0 z-50 border-b" style={{ borderColor: 'var(--ios-separator-opaque)' }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo / App Name */}
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))' }}
            >
              K
            </div>
            <div className="leading-none">
              <span className="text-base font-bold" style={{ color: 'var(--ios-label)' }}>
                KELH Manager
              </span>
            </div>
          </Link>

          {/* Right-side actions */}
          {user && (
            <div className="flex items-center gap-2">
              {/* Admin link */}
              <Link
                href="/admin/users"
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--ios-label-secondary)' }}
                title="Manage Users"
              >
                <UserCog className="w-5 h-5" />
              </Link>

              {/* Avatar + sign out */}
              <div className="flex items-center gap-2 pl-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: 'var(--ios-blue)' }}
                  title={user.email}
                >
                  {initials}
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ color: 'var(--ios-red)' }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
