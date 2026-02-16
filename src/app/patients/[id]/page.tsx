'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, FileText, ArrowLeft, Home } from 'lucide-react';
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
  params: Promise<{
    id: string;
  }>;
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

  // Billing form state
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('Consultation');
  const [doctor, setDoctor] = useState<Doctor>('Dr. Ludo');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  // Unwrap params
  useEffect(() => {
    params.then((p) => {
      setPatientId(p.id);
    });
  }, [params]);

  // Real-time subscription for ledger updates
  useEffect(() => {
    if (!patientId) return;

    const supabase = createClient();
    const id = parseInt(patientId);
    if (isNaN(id)) return;

    // Subscribe to ledger changes for this patient
    const channel = supabase
      .channel(`patient-${id}-ledger`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ledger',
          filter: `patient_id=eq.${id}`,
        },
        (payload) => {
          console.log('Ledger updated for patient:', payload);
          // Refresh ledger data with user info
          supabase
            .from('ledger_with_audit')
            .select('id, created_at, service_category, doctor, amount, payment_method, description, created_by_email')
            .eq('patient_id', id)
            .eq('transaction_type', 'INCOME')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (data) setLedgerHistory(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  // Fetch patient data and ledger history
  useEffect(() => {
    if (!patientId) return;
    
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const id = parseInt(patientId);

        console.log('Fetching patient with ID:', patientId, 'Parsed as:', id);

        if (isNaN(id) || id <= 0) {
          console.error('Invalid patient ID:', patientId);
          alert(`Invalid patient ID: ${patientId}. Expected a positive number.`);
          router.push('/patients');
          return;
        }

        // Fetch patient details - only request columns that should exist
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('id, file_number, full_name, phone, age, referral_source, created_at')
          .eq('id', id)
          .single();

        if (patientError) {
          console.error('Patient fetch error:', patientError);
          console.error('Error details:', {
            message: patientError.message,
            details: patientError.details,
            hint: patientError.hint,
            code: patientError.code
          });
          
          let errorMsg = 'Failed to load patient. ';
          if (patientError.message.includes('column')) {
            errorMsg += 'Database schema needs to be updated. Please run FIX_SCHEMA.sql';
          } else if (patientError.code === 'PGRST116') {
            errorMsg += `Patient with ID ${id} not found in database.`;
          } else {
            errorMsg += patientError.message;
          }
          alert(errorMsg);
          router.push('/patients');
          return;
        }

        if (!patientData) {
          console.error('No patient data returned for ID:', id);
          alert(`Patient with ID ${id} not found`);
          router.push('/patients');
          return;
        }

        console.log('Patient data loaded successfully:', patientData);
        setPatient(patientData);

        // Fetch ledger history with user information
        const { data: ledgerData, error: ledgerError } = await supabase
          .from('ledger_with_audit')
          .select('id, created_at, service_category, doctor, amount, payment_method, description, created_by_email')
          .eq('patient_id', id)
          .eq('transaction_type', 'INCOME')
          .order('created_at', { ascending: false });

        if (ledgerError) {
          console.error('Ledger fetch error:', ledgerError);
          console.error('Error details:', {
            message: ledgerError.message,
            details: ledgerError.details,
            hint: ledgerError.hint,
            code: ledgerError.code
          });
          
          // Show warning but don't stop - patient data is more important
          if (ledgerError.message.includes('column')) {
            console.warn('Ledger table needs schema update. Some columns may be missing.');
          }
          
          // Set empty array if there's an error
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

  // Handle billing submission
  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountValue = parseFormattedNumber(amount);
    if (!amount || amountValue <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!patientId) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // Start with required data only
      const insertData: Record<string, any> = {
        transaction_type: 'INCOME',
        patient_id: parseInt(patientId),
        amount: amountValue,
        payment_method: paymentMethod,
      };

      // Only add optional fields if they have values
      if (serviceCategory) {
        insertData.service_category = serviceCategory;
      }
      
      if (doctor) {
        insertData.doctor = doctor;
      }
      
      if (notes.trim()) {
        insertData.description = notes.trim();
      }

      const { error } = await supabase
        .from('ledger')
        .insert(insertData);

      if (error) {
        console.error('Billing error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Show user-friendly error
        let errorMsg = 'Failed to record transaction. ';
        if (error.message.includes('column')) {
          errorMsg += 'Database schema needs to be updated. Please run FIX_SCHEMA.sql';
        } else {
          errorMsg += error.message;
        }
        alert(errorMsg);
        return;
      }

      // Reset form and close modal
      resetBillingForm();
      setShowBillingModal(false);
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Refresh ledger data in background with user info
      const { data: updatedLedger } = await supabase
        .from('ledger_with_audit')
        .select('id, created_at, service_category, doctor, amount, payment_method, description, created_by_email')
        .eq('patient_id', parseInt(patientId))
        .eq('transaction_type', 'INCOME')
        .order('created_at', { ascending: false });
      
      if (updatedLedger) {
        setLedgerHistory(updatedLedger);
      }
    } catch (error) {
      console.error('Billing failed:', error);
      alert('Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle amount change with comma formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const cleanValue = value.replace(/[^\d]/g, '');
    // Format with commas
    if (cleanValue) {
      setAmount(formatNumberWithCommas(cleanValue));
    } else {
      setAmount('');
    }
  };

  // Reset billing form
  const resetBillingForm = () => {
    setServiceCategory('Consultation');
    setDoctor('Dr. Ludo');
    setAmount('');
    setPaymentMethod('Cash');
    setNotes('');
  };

  // Close modal
  const closeBillingModal = () => {
    setShowBillingModal(false);
    resetBillingForm();
  };

  // Calculate total spent
  const totalSpent = ledgerHistory.reduce((sum, entry) => sum + entry.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-lg">Patient not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Navigation Bar - Consistent with other pages */}
        <div className="mb-6 flex items-center gap-3 bg-white rounded-lg shadow-sm p-4 border-2 border-slate-200">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
          >
            <Home size={20} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => router.push('/patients')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            <span>Patient Search</span>
          </button>
        </div>

        {/* Patient Header */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl font-mono font-bold text-blue-600">
                {formatPatientId(patient.file_number)}
              </span>
              <h1 className="text-3xl font-bold text-slate-900">
                {patient.full_name}
              </h1>
            </div>
            <div className="flex items-center gap-6 text-slate-600">
              {patient.age && <span>Age: {patient.age}</span>}
              {patient.phone && <span>Phone: {patient.phone}</span>}
              {patient.referral_source && <span>Referral: {patient.referral_source}</span>}
            </div>
          </div>
          </div>

          {/* Total Spent */}
          <div className="mt-4 pt-4 border-t-2 border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Spent</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>

        {/* Add Service Button */}
        <button
          onClick={() => setShowBillingModal(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white p-5 rounded-lg flex items-center justify-center gap-3 text-xl font-bold transition-colors mb-8"
        >
          <Plus size={28} />
          ADD SERVICE / BILLING
        </button>

        {/* History Section */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText size={24} className="text-slate-600" />
            <h2 className="text-2xl font-bold text-slate-900">Visit History</h2>
          </div>

          {ledgerHistory.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No visit history yet</p>
          ) : (
            <div className="space-y-3">
              {ledgerHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border-2 border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">
                        {formatDate(entry.created_at)}
                      </span>
                      <span className="text-lg font-semibold text-slate-900">
                        {entry.service_category || 'Service'}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(entry.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {entry.doctor && <span>Doctor: {entry.doctor}</span>}
                    <span>Payment: {entry.payment_method}</span>
                    {entry.created_by_email && (
                      <span className="text-slate-500">• Added by: {entry.created_by_email}</span>
                    )}
                  </div>
                  {entry.description && (
                    <p className="mt-2 text-sm text-slate-600 italic">
                      {entry.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Record Service / Billing</h2>
                <button
                  onClick={closeBillingModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleBillingSubmit} className="space-y-4">
                {/* Service Category */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    Service Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                    className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  >
                    {SERVICE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value as Doctor)}
                    className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  >
                    {DOCTORS.map((doc) => (
                      <option key={doc} value={doc}>
                        {doc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    Amount (UGX) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount"
                    className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  {amount && parseFormattedNumber(amount) > 0 && (
                    <p className="text-sm text-slate-600 mt-1">
                      {formatCurrency(parseFormattedNumber(amount))}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                    className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeBillingModal}
                    className="flex-1 p-3 text-lg border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 p-3 text-lg bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Recording...' : 'Record Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Transaction Recorded!</h2>
              <p className="text-slate-600">The service has been added to the patient's record.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-semibold transition-colors"
              >
                Add Another Service
              </button>
              <button
                onClick={() => router.push('/patients')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors"
              >
                Search Another Patient
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
    </div>
  );
}
