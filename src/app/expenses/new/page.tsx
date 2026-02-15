'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, Loader2, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/lib/utils';

// Expense Categories - Keep categories broad
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

// Payment Methods for Expenses
const PAYMENT_METHODS = [
  'Cash',
  'MoMo',
  'Airtel Money',
  'Bank',
] as const;

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
type PaymentMethod = typeof PAYMENT_METHODS[number];

export default function NewExpensePage() {
  const router = useRouter();
  
  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [description, setDescription] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // Insert into Supabase ledger table
      // Note: Using description field to store category + description since 'category' column doesn't exist
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
          patient_id: null, // Expenses don't have patient associations
        });

      if (insertError) {
        console.error('Error inserting expense:', insertError);
        setError(`Failed to record expense: ${insertError.message}`);
        return;
      }

      // Success - Show success modal and reset form
      setShowSuccessModal(true);
      resetForm();
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setCategory('Other');
    setAmount('');
    setPaymentMethod('Cash');
    setDescription('');
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Navigation Bar - Clear and Visible */}
        <div className="mb-6 flex items-center gap-3 bg-white rounded-lg shadow-sm p-4 border-2 border-slate-200">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
          >
            <Home size={20} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-red-100 p-3 rounded-xl">
              <TrendingDown className="text-red-600" size={32} />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">Record Expense</h1>
          </div>
          <p className="text-slate-600 ml-16">Track money leaving the hospital</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Category Dropdown */}
          <div className="mb-6">
            <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full p-4 border-2 border-slate-200 rounded-lg text-base focus:border-red-500 focus:outline-none bg-white"
              required
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {category === 'Medical / Lenses' && 'Outsourced work, Pharmacy stock'}
              {category === 'Transport' && 'SafeBoda, Fuel, Staff transport'}
              {category === 'Utilities / Airtime' && 'Water, Power, Internet, MTN/Airtel data'}
              {category === 'Office / Printing' && 'Paper, Ink, Pens'}
              {category === 'Staff Welfare' && 'Lunch, Happy Hour, Water Dispenser'}
              {category === 'Salary / Advance' && 'Staff payments'}
              {category === 'Maintenance' && 'Repairs, Cleaning'}
            </p>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label htmlFor="amount" className="block text-sm font-semibold text-slate-700 mb-2">
              Amount (UGX) *
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              step="1"
              className="w-full p-4 border-2 border-slate-200 rounded-lg text-base focus:border-red-500 focus:outline-none"
              required
            />
            {amount && parseFloat(amount) > 0 && (
              <p className="text-sm text-slate-600 mt-1">
                {formatCurrency(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Payment Method Dropdown */}
          <div className="mb-6">
            <label htmlFor="paymentMethod" className="block text-sm font-semibold text-slate-700 mb-2">
              Payment Method *
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full p-4 border-2 border-slate-200 rounded-lg text-base focus:border-red-500 focus:outline-none bg-white"
              required
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* Description Textarea */}
          <div className="mb-8">
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. SafeBoda to deliver samples or Advance for Fadir"
              rows={4}
              className="w-full p-4 border-2 border-slate-200 rounded-lg text-base focus:border-red-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">Optional - Add details about this expense</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={loading}
              className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 rounded-lg font-bold text-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 px-6 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                'CONFIRM EXPENSE'
              )}
            </button>
          </div>
        </form>

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Keep descriptions brief but specific for easy tracking</li>
            <li>• Cash expenses reduce your available cash on hand</li>
            <li>• Digital payments (MoMo/Airtel/Bank) reduce digital balance</li>
            <li>• All expenses appear on the Dashboard and Reports</li>
          </ul>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Expense Recorded!</h2>
              <p className="text-slate-600">The expense has been added to the ledger.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  // Form is already reset, ready for another entry
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg font-semibold transition-colors"
              >
                Add Another Expense
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white p-3 rounded-lg font-semibold transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
