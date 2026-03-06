'use client';

import { login } from '@/app/actions/auth';
import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="ios-btn-primary"
    >
      {pending ? 'Signing in…' : 'Sign In'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(
    async (_prevState: { error: string | null }, formData: FormData) => {
      return await login(formData);
    },
    { error: null as string | null }
  );

  return (
    <div className="min-h-[calc(100dvh-56px)] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-sm">

        {/* App Icon + Title */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-[22px] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md"
            style={{ background: 'linear-gradient(145deg, var(--ios-blue), var(--ios-indigo))' }}
          >
            K
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ios-label)' }}>KELH Manager</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ios-label-secondary)' }}>Hospital Management System</p>
        </div>

        {/* Card */}
        <div className="ios-card p-6 rounded-3xl">
          {state?.error && (
            <div className="mb-5 p-4 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--ios-red)' }}>
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="ios-input w-full"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="ios-input w-full"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-1">
              <SubmitButton />
            </div>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold" style={{ color: 'var(--ios-blue)' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
