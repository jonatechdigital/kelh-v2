'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, FileText, ArrowLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatPatientId, formatCurrency, formatDate, formatNumberWithCommas, parseFormattedNumber } from '@/lib/utils';
import { SERVICE_CATEGORIES, DOCTORS, PAYMENT_METHODS, type ServiceCategory, type Doctor, type PaymentMethod } from '@/lib/constants';

interface Patient {
  id: number;
  file_number: number;
  full_name: string;
  phone: string | null;
  age: number | null;
  referral_source: string | null;
  created_at: string;
}

interface LedgerEntry {
  id: number;
  created_at: string;
  service_category: string | null;
  doctor: string | null;
  amount: number;
  payment_method: string;
  description: string | null;
  created_by?: string | null;
  created_by_email?: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientProfilePage({ params }: PageProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [ledgerHistory, setLedgerHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('Consultation');
  const [doctor, setDoctor] = useState<Doctor>('Dr. Ludo');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    params.then((p) => setPatientId(p.id));
  }, [params]);

  useEffect(() => {
    if (!patientId) return;
    const supabase = createClient();
    const id = parseInt(patientId);
    if (isNaN(id)) return;

    const channel = supabase
      .channel(`patient-${id}-ledger`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger', filter: `patient_id=eq.${id}` },
        () => {
          supabase
            .from('ledger_with_audit')
            .select('id, created_at, service_category, doctor, amount, payment_method, description, created_by_email')
            .eq('patient_id', id)
            .eq('transaction_type', 'INCOME')
            .order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setLedgerHistory(data); });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const id = parseInt(patientId);

        if (isNaN(id) || id <= 0) {
          alert(`Invalid patient ID: ${patientId}`);
          router.push('/patients');
          return;
        }

        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('id, file_number, full_name, phone, age, referral_source, created_at')
          .eq('id', id)
          .single();

        if (patientError) {
          let errorMsg = 'Failed to load patient. ';
          if (patientError.code === 'PGRST116') {
            errorMsg += `Patient with ID ${id} not found.`;
          } else {
            errorMsg += patientError.message;
          }
          alert(errorMsg);
          router.push('/patients');
          return;
        }

        if (!patientData) {
          alert(`Patient with ID ${id} not found`);
          router.push('/patients');
          return;
        }

        setPatient(patientData);

        const { data: ledgerData, error: ledgerError } = await supabase
          .from('ledger_with_audit')
          .select('id, created_at, service_category, doctor, amount, payment_method, description, created_by_email')
          .eq('patient_id', id)
          .eq('transaction_type', 'INCOME')
          .order('created_at', { ascending: false });

        if (ledgerError) {
          console.error('Ledger fetch error:', ledgerError);
          setLedgerHistory([]);
        } else {
          setLedgerHistory(ledgerData || []);
        }
      } catch (error) {
        console.error('Failed to fetch patient data:', error);
        alert('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [patientId, router]);

  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseFormattedNumber(amount);
    if (!amount || amountValue <= 0) { alert('Please enter a valid amount'); return; }
    if (!patientId) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const insertData: Record<string, any> = {
        transaction_type: 'INCOME',
        patient_id: parseInt(patientId),
        amount: amountValue,
        payment_method: paymentMethod,
      };
      if (serviceCategory) insertData.service_category = serviceCategory;
      if (doctor) insertData.doctor = doctor;
      if (notes.trim()) insertData.description = notes.trim();

      const { error } = await supabase.from('ledger').insert(insertData);

      if (error) {
        let errorMsg = 'Failed to record transaction. ';
        if (error.message.includes('column')) {
          errorMsg += 'Database schema needs to be updated.';
        } else {
          errorMsg += error.message;
        }
        alert(errorMsg);
        return;
      }

      resetBillingForm();
      setShowBillingModal(false);
      setShowSuccessModal(true);

      const { data: updatedLedger } = await supabase
        .from('ledger_with_audit')
        .select('id, created_at, service_category, doctor, amount, payment_method, description, created_by_email')
        .eq('patient_id', parseInt(patientId))
        .eq('transaction_type', 'INCOME')
        .order('created_at', { ascending: false });

      if (updatedLedger) setLedgerHistory(updatedLedger);
    } catch (error) {
      console.error('Billing failed:', error);
      alert('Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^\d]/g, '');
    setAmount(cleanValue ? formatNumberWithCommas(cleanValue) : '');
  };

  const resetBillingForm = () => {
    setServiceCategory('Consultation');
    setDoctor('Dr. Ludo');
    setAmount('');
    setPaymentMethod('Cash');
    setNotes('');
  };

  const closeBillingModal = () => {
    setShowBillingModal(false);
    resetBillingForm();
  };

  const totalSpent = ledgerHistory.reduce((sum, entry) => sum + entry.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent mx-auto mb-3"
            style={{ borderColor: 'var(--ios-blue)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Loading patient…</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Patient not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Back navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/patients')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-blue)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--ios-blue)' }}>Patient Search</span>
      </div>

      {/* Patient Profile Card */}
      <div className="ios-card rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ backgroundColor: 'var(--ios-blue)' }}
          >
            {patient.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-semibold mb-0.5" style={{ color: 'var(--ios-blue)' }}>
              {formatPatientId(patient.file_number)}
            </p>
            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--ios-label)' }}>
              {patient.full_name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {patient.age && (
                <span className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Age {patient.age}</span>
              )}
              {patient.phone && (
                <span className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>{patient.phone}</span>
              )}
              {patient.referral_source && (
                <span className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>via {patient.referral_source}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '0.5px solid var(--ios-separator-opaque)' }}>
          <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--ios-label-secondary)' }}>Total Spent</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--ios-green)' }}>
            {formatCurrency(totalSpent)}
          </p>
        </div>
      </div>

      {/* Add Service Button */}
      <button
        onClick={() => setShowBillingModal(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base transition-opacity active:opacity-80 mb-6"
        style={{ backgroundColor: 'var(--ios-green)' }}
      >
        <Plus size={20} />
        Add Service / Billing
      </button>

      {/* Visit History */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <FileText size={18} style={{ color: 'var(--ios-label-secondary)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--ios-label)' }}>Visit History</h2>
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}
          >
            {ledgerHistory.length}
          </span>
        </div>

        {ledgerHistory.length === 0 ? (
          <div className="ios-card rounded-2xl p-8 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--ios-label-secondary)' }}>No visit history yet</p>
          </div>
        ) : (
          <div className="ios-card rounded-2xl overflow-hidden">
            {ledgerHistory.map((entry, idx) => (
              <div key={entry.id}>
                {idx > 0 && (
                  <div className="mx-4" style={{ height: '0.5px', backgroundColor: 'var(--ios-separator-opaque)' }} />
                )}
                <div className="ios-list-row px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: 'var(--ios-label)' }}>
                        {entry.service_category || 'Service'}
                      </span>
                      <span className="text-base font-bold" style={{ color: 'var(--ios-green)' }}>
                        {formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>
                        {formatDate(entry.created_at)}
                      </span>
                      {entry.doctor && (
                        <span className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>{entry.doctor}</span>
                      )}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)', color: 'var(--ios-blue)' }}
                      >
                        {entry.payment_method}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--ios-label-secondary)' }}>
                        {entry.description}
                      </p>
                    )}
                    {entry.created_by_email && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ios-label-tertiary)' }}>
                        Added by {entry.created_by_email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Billing Modal — Bottom Sheet */}
      {showBillingModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center ios-backdrop"
          onClick={closeBillingModal}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden"
            style={{ boxShadow: 'var(--ios-shadow-lg)', maxHeight: '92dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--ios-separator)' }} />
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--ios-separator-opaque)' }}>
              <h2 className="text-base font-bold" style={{ color: 'var(--ios-label)' }}>Record Service / Billing</h2>
              <button
                onClick={closeBillingModal}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 80px)' }}>
              <form onSubmit={handleBillingSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                    Service Category <span style={{ color: 'var(--ios-red)' }}>*</span>
                  </label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                    className="ios-input w-full"
                    required
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                    Doctor <span style={{ color: 'var(--ios-red)' }}>*</span>
                  </label>
                  <select
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value as Doctor)}
                    className="ios-input w-full"
                    required
                  >
                    {DOCTORS.map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                    Amount (UGX) <span style={{ color: 'var(--ios-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount"
                    className="ios-input w-full"
                    required
                  />
                  {amount && parseFormattedNumber(amount) > 0 && (
                    <p className="mt-1 text-xs font-medium" style={{ color: 'var(--ios-blue)' }}>
                      {formatCurrency(parseFormattedNumber(amount))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                    Payment Method <span style={{ color: 'var(--ios-red)' }}>*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="ios-input w-full"
                    required
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes…"
                    rows={3}
                    className="ios-input w-full resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-1 ios-safe-bottom">
                  <button
                    type="button"
                    onClick={closeBillingModal}
                    className="flex-1 py-4 rounded-2xl text-base font-semibold"
                    style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-2xl text-white text-base font-semibold disabled:opacity-40"
                    style={{ backgroundColor: 'var(--ios-green)' }}
                  >
                    {isSubmitting ? 'Recording…' : 'Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--ios-green)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--ios-label)' }}>Transaction Recorded!</h2>
                <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Service added to patient's record.</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 rounded-2xl text-white text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-green)' }}
                >
                  Add Another Service
                </button>
                <button
                  onClick={() => router.push('/patients')}
                  className="w-full py-4 rounded-2xl text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-blue)' }}
                >
                  Search Another Patient
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
