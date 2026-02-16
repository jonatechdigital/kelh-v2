import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { LogOut, User, UserCog } from 'lucide-react';
import { signOut } from '@/app/actions/auth';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <Link href="/" className="text-xl font-bold text-blue-600">
              KELH Manager V2
            </Link>
            <p className="text-xs text-gray-500">Hospital Management System</p>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Manage Users"
              >
                <UserCog className="w-4 h-4" />
                <span className="hidden sm:inline">Users</span>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
