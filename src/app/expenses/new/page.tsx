'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Medical / Lenses',
  'Transport',
  'Utilities / Airtime',
  'Office / Printing',
  'Staff Welfare',
  'Salary / Advance',
  'Maintenance',
  'Other',
] as const;

const PAYMENT_METHODS = [
  'Cash',
  'MoMo',
  'Airtel Money',
  'Bank',
] as const;

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
type PaymentMethod = typeof PAYMENT_METHODS[number];

const CATEGORY_HINTS: Partial<Record<ExpenseCategory, string>> = {
  'Medical / Lenses': 'Outsourced work, Pharmacy stock',
  'Transport': 'SafeBoda, Fuel, Staff transport',
  'Utilities / Airtime': 'Water, Power, Internet, MTN/Airtel data',
  'Office / Printing': 'Paper, Ink, Pens',
  'Staff Welfare': 'Lunch, Happy Hour, Water Dispenser',
  'Salary / Advance': 'Staff payments',
  'Maintenance': 'Repairs, Cleaning',
};

export default function NewExpensePage() {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountValue = parseFormattedNumber(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const fullDescription = description.trim()
        ? `[${category}] ${description.trim()}`
        : `[${category}]`;

      const { error: insertError } = await supabase
        .from('ledger')
        .insert({
          transaction_type: 'EXPENSE',
          amount: amountValue,
          payment_method: paymentMethod,
          description: fullDescription,
          patient_id: null,
        });

      if (insertError) {
        setError(`Failed to record expense: ${insertError.message}`);
        return;
      }

      setShowSuccessModal(true);
      resetForm();
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^\d]/g, '');
    setAmount(cleanValue ? formatNumberWithCommas(cleanValue) : '');
  };

  const resetForm = () => {
    setCategory('Other');
    setAmount('');
    setPaymentMethod('Cash');
    setDescription('');
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-blue)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}
          >
            <TrendingDown size={20} style={{ color: 'var(--ios-red)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--ios-label)' }}>Record Expense</h1>
            <p className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>Track money leaving the hospital</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(255, 59, 48, 0.08)' }}>
            <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--ios-red)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--ios-red)' }}>{error}</p>
          </div>
        )}

        {/* Grouped form sections */}
        <div className="space-y-5">
          {/* Category */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--ios-label-secondary)' }}>Category</p>
            <div className="ios-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full text-base bg-transparent border-none outline-none"
                  style={{ color: 'var(--ios-label)' }}
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            {CATEGORY_HINTS[category] && (
              <p className="mt-1.5 text-xs px-1" style={{ color: 'var(--ios-label-secondary)' }}>
                {CATEGORY_HINTS[category]}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--ios-label-secondary)' }}>Amount</p>
            <div className="ios-card rounded-2xl overflow-hidden">
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--ios-label-secondary)' }}>UGX</span>
                <input
                  id="amount"
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="flex-1 text-xl font-semibold bg-transparent border-none outline-none"
                  style={{ color: 'var(--ios-label)' }}
                  required
                />
              </div>
            </div>
            {amount && parseFormattedNumber(amount) > 0 && (
              <p className="mt-1.5 text-xs px-1 font-medium" style={{ color: 'var(--ios-blue)' }}>
                {formatCurrency(parseFormattedNumber(amount))}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--ios-label-secondary)' }}>Payment Method</p>
            <div className="ios-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3">
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-base bg-transparent border-none outline-none"
                  style={{ color: 'var(--ios-label)' }}
                  required
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--ios-label-secondary)' }}>Description (Optional)</p>
            <div className="ios-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3">
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. SafeBoda to deliver samples or Advance for Fadir"
                  rows={3}
                  className="w-full text-base bg-transparent border-none outline-none resize-none"
                  style={{ color: 'var(--ios-label)' }}
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs px-1" style={{ color: 'var(--ios-label-secondary)' }}>
              Add details about this expense
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            disabled={loading}
            className="flex-1 py-4 rounded-2xl text-base font-semibold disabled:opacity-40"
            style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 rounded-2xl text-white text-base font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--ios-red)' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Processing…
              </>
            ) : (
              'Confirm Expense'
            )}
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-5 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(0, 122, 255, 0.06)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ios-blue)' }}>Quick Tips</p>
          <ul className="text-xs space-y-1" style={{ color: 'var(--ios-label-secondary)' }}>
            <li>• Cash expenses reduce your available cash on hand</li>
            <li>• Digital payments (MoMo/Airtel/Bank) reduce digital balance</li>
            <li>• All expenses appear on the Dashboard and Reports</li>
          </ul>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ios-backdrop"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ boxShadow: 'var(--ios-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--ios-red)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--ios-label)' }}>Expense Recorded!</h2>
                <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>The expense has been added to the ledger.</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 rounded-2xl text-white text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-red)' }}
                >
                  Add Another Expense
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-4 rounded-2xl text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
