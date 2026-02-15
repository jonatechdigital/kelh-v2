'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingDown, BarChart, Loader2, Receipt } from 'lucide-react';
import { formatDate, formatCurrency, formatDateRange } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

type Timeframe = 'today' | 'yesterday' | 'week' | 'month';

interface LedgerRecord {
  id: number;
  transaction_type: 'INCOME' | 'EXPENSE';
  payment_method: string;
  amount: number;
  patient_id: number | null;
  description: string;
  service_category: string | null;
  created_at: string;
  patients: {
    id: number;
    full_name: string;
    created_at: string;
    referral_source: string | null;
  } | null;
}

interface DashboardMetrics {
  totalRevenue: number;
  revenueCount: number;
  cashRevenue: number;
  digitalRevenue: number;
  availableCash: number;
  availableDigital: number;
  totalPatients: number;
  newPatients: number;
  returningPatients: number;
  socialMediaReferrals: number;
  totalExpenses: number;
  expenseCount: number;
  cashExpenses: number;
  digitalExpenses: number;
}

export default function Home() {
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    revenueCount: 0,
    cashRevenue: 0,
    digitalRevenue: 0,
    availableCash: 0,
    availableDigital: 0,
    totalPatients: 0,
    newPatients: 0,
    returningPatients: 0,
    socialMediaReferrals: 0,
    totalExpenses: 0,
    expenseCount: 0,
    cashExpenses: 0,
    digitalExpenses: 0,
  });
  const [recentActivity, setRecentActivity] = useState<LedgerRecord[]>([]);
  const [allActivity, setAllActivity] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<LedgerRecord | null>(null);
  const [selectedPatientTransaction, setSelectedPatientTransaction] = useState<LedgerRecord | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start: Date;

    switch (timeframe) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        break;
      case 'week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

    return { start, end };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Check if Supabase is properly configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        });
        return;
      }

      const { start, end } = getDateRange();
      setDateRange({ start, end });

      // Fetch ledger records with patient data
      // First, try with patient join
      let ledgerData: any[] | null = null;
      let ledgerError = null;
      
      const ledgerQuery = await supabase
        .from('ledger')
        .select(`
          id,
          transaction_type,
          payment_method,
          amount,
          patient_id,
          description,
          service_category,
          created_at,
          patients (
            id,
            full_name,
            created_at,
            referral_source
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      ledgerData = ledgerQuery.data;
      ledgerError = ledgerQuery.error;

      // If there's an error with the join, try without it
      if (ledgerError) {
        console.warn('Error fetching ledger with patient join, trying without:', {
          message: ledgerError.message,
          details: ledgerError.details,
          hint: ledgerError.hint,
          code: ledgerError.code
        });

        const simpleLedgerQuery = await supabase
          .from('ledger')
          .select('id, transaction_type, payment_method, amount, patient_id, description, service_category, created_at')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false });

        ledgerData = simpleLedgerQuery.data;
        ledgerError = simpleLedgerQuery.error;

        if (ledgerError) {
          console.error('Error fetching ledger data:', {
            message: ledgerError.message,
            details: ledgerError.details,
            hint: ledgerError.hint,
            code: ledgerError.code,
            full: ledgerError
          });
          return;
        }

        // If we got data without the join, fetch patient names separately
        if (ledgerData) {
          const patientIds = [...new Set(ledgerData.filter(r => r.patient_id).map(r => r.patient_id))];
          if (patientIds.length > 0) {
            const { data: patientsData } = await supabase
              .from('patients')
              .select('id, full_name, created_at, referral_source')
              .in('id', patientIds);

            if (patientsData) {
              const patientMap = new Map(patientsData.map(p => [p.id, p]));
              ledgerData = ledgerData.map(record => ({
                ...record,
                patients: record.patient_id ? patientMap.get(record.patient_id) || null : null
              }));
            }
          }
        }
      }

      const records = (ledgerData || []) as LedgerRecord[];

      // Calculate metrics
      let totalRevenue = 0;
      let revenueCount = 0;
      let cashRevenue = 0;
      let digitalRevenue = 0;
      let cashExpenses = 0;
      let digitalExpenses = 0;
      let totalExpenses = 0;
      let expenseCount = 0;
      const uniquePatients = new Set<number>();
      const newPatientIds = new Set<number>();
      const returningPatientIds = new Set<number>();
      const socialMediaReferralIds = new Set<number>();
      const patientVisitTimestamps = new Map<number, Date[]>();

      records.forEach((record) => {
        if (record.transaction_type === 'INCOME') {
          totalRevenue += record.amount;
          revenueCount++;
          if (record.payment_method === 'Cash') {
            cashRevenue += record.amount;
          } else {
            digitalRevenue += record.amount;
          }
          
          // Track transaction timestamps per patient to determine unique visits
          if (record.patient_id) {
            const timestamps = patientVisitTimestamps.get(record.patient_id) || [];
            timestamps.push(new Date(record.created_at));
            patientVisitTimestamps.set(record.patient_id, timestamps);
          }
        } else if (record.transaction_type === 'EXPENSE') {
          totalExpenses += record.amount;
          expenseCount++;
          // Track cash vs digital expenses
          if (record.payment_method === 'Cash') {
            cashExpenses += record.amount;
          } else {
            // MoMo, Airtel Money, Bank are all digital
            digitalExpenses += record.amount;
          }
        }

        // Track unique patients and categorize them
        if (record.patient_id && record.patients) {
          uniquePatients.add(record.patient_id);
        } else if (record.patient_id) {
          // If we have patient_id but no patient data, count as unique but can't categorize
          uniquePatients.add(record.patient_id);
        }
      });
      
      // Helper function to get working day identifier (8am-7pm window)
      const getWorkingDay = (date: Date): string => {
        const hour = date.getHours();
        let workingDate = new Date(date);
        
        // If before 8am, it belongs to previous working day
        if (hour < 8) {
          workingDate.setDate(workingDate.getDate() - 1);
        }
        
        // Return YYYY-MM-DD format for the working day
        return workingDate.toISOString().split('T')[0];
      };
      
      // Categorize patients as New or Returning based on working days
      uniquePatients.forEach((patientId) => {
        const timestamps = patientVisitTimestamps.get(patientId) || [];
        const patientRecord = records.find(r => r.patient_id === patientId && r.patients);
        
        if (patientRecord && patientRecord.patients && timestamps.length > 0) {
          // Group transactions by working day (8am-7pm)
          const workingDays = new Set<string>();
          
          timestamps.forEach(timestamp => {
            const workingDay = getWorkingDay(timestamp);
            workingDays.add(workingDay);
          });
          
          const uniqueWorkingDays = workingDays.size;
          
          const patientCreatedAt = new Date(patientRecord.patients.created_at);
          const patientCreatedDate = new Date(patientCreatedAt.getFullYear(), patientCreatedAt.getMonth(), patientCreatedAt.getDate());
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          
          // Patient is NEW if they were created DURING the timeframe
          // Patient is RETURNING if they were created BEFORE the timeframe
          const isNewPatient = patientCreatedDate >= startDate;
          
          if (isNewPatient) {
            // New patient (profile created in this timeframe)
            newPatientIds.add(patientId);
            
            // Only track social media for NEW patients
            if (patientRecord.patients.referral_source === 'Social Media') {
              socialMediaReferralIds.add(patientId);
            }
          } else {
            // Returning patient (profile existed before timeframe, visiting now)
            returningPatientIds.add(patientId);
          }
        }
      });

      // Calculate available cash (cash income - cash expenses)
      const availableCash = cashRevenue - cashExpenses;
      
      // Calculate available digital (digital income - digital expenses)
      const availableDigital = digitalRevenue - digitalExpenses;

      setMetrics({
        totalRevenue,
        revenueCount,
        cashRevenue,
        digitalRevenue,
        availableCash,
        availableDigital,
        totalPatients: uniquePatients.size,
        newPatients: newPatientIds.size,
        returningPatients: returningPatientIds.size,
        socialMediaReferrals: socialMediaReferralIds.size,
        totalExpenses,
        expenseCount,
        cashExpenses,
        digitalExpenses,
      });

      // Set recent activity (last 5 records) and all activity
      setRecentActivity(records.slice(0, 5));
      setAllActivity(records);
    } catch (error) {
      console.error('Error fetching dashboard data:', {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getPaymentMethodColor = (method: string): string => {
    switch (method) {
      case 'Cash':
        return 'bg-green-100 text-green-800';
      case 'MoMo':
      case 'Airtel Money':
        return 'bg-yellow-100 text-yellow-800';
      case 'Card':
        return 'bg-blue-100 text-blue-800';
      case 'Insurance':
        return 'bg-purple-100 text-purple-800';
      case 'Partner':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">KELH Manager V2</h1>
          <p className="text-slate-600">
            {dateRange ? formatDateRange(dateRange.start, dateRange.end) : formatDate(new Date())}
          </p>
        </header>

        {/* Timeframe Selector */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday', 'week', 'month'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : (
          <>
            {/* Section A: Action Grid - Primary Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Check-In / Search */}
              <Link
                href="/patients"
                className="bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-md p-6 h-32 flex items-center justify-center gap-4 transition-colors"
              >
                <Users size={48} />
                <span className="text-2xl font-bold text-center">CHECK-IN / SEARCH</span>
              </Link>

              {/* Record Expense */}
              <Link
                href="/expenses/new"
                className="bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-md p-6 h-32 flex items-center justify-center gap-4 transition-colors"
              >
                <TrendingDown size={48} />
                <span className="text-2xl font-bold text-center">RECORD EXPENSE</span>
              </Link>

              {/* View Reports */}
              <Link
                href="/reports"
                className="bg-slate-600 hover:bg-slate-700 text-white rounded-2xl shadow-md p-6 h-32 flex items-center justify-center gap-4 transition-colors"
              >
                <BarChart size={48} />
                <span className="text-2xl font-bold text-center">VIEW REPORTS</span>
              </Link>
            </div>

            {/* Section B: Metric Cards - Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Patients (Volume) - FIRST POSITION */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-900">PATIENTS</h3>
                  <p className="text-xs text-purple-700 font-semibold">Total</p>
                </div>
                <p className="text-4xl lg:text-5xl font-bold text-purple-600 mb-3 break-words">
                  {metrics.totalPatients}
                </p>
                <div className="space-y-1 text-sm border-t border-purple-300 pt-3">
                  <p className="text-slate-700">
                    <span className="font-bold">{metrics.newPatients}</span> New Files
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">{metrics.returningPatients}</span> Returning
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">{metrics.socialMediaReferrals}</span> Social Media
                  </p>
                </div>
              </div>

              {/* Revenue (Income) - SECOND POSITION */}
              <div className="bg-slate-100 rounded-xl p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-900">REVENUE</h3>
                  <p className="text-xs text-slate-600 font-semibold">UGX</p>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 break-words leading-tight">
                  {metrics.totalRevenue.toLocaleString('en-US')}
                </p>
                <div className="space-y-1 text-sm border-t border-slate-300 pt-3">
                  <p className="text-slate-700">
                    <span className="font-bold">{metrics.revenueCount}</span> Transactions
                  </p>
                  <p className="text-green-700">
                    Cash: <span className="font-bold">{metrics.cashRevenue.toLocaleString('en-US')}</span>
                  </p>
                  <p className="text-blue-700">
                    Digital: <span className="font-bold">{metrics.digitalRevenue.toLocaleString('en-US')}</span>
                  </p>
                </div>
              </div>

              {/* Expenses (Money Out) - THIRD POSITION */}
              <div className="bg-slate-100 rounded-xl p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-900">EXPENSES</h3>
                  <p className="text-xs text-slate-600 font-semibold">UGX</p>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-red-600 mb-3 break-words leading-tight">
                  {metrics.totalExpenses.toLocaleString('en-US')}
                </p>
                <div className="text-sm space-y-1 border-t border-slate-300 pt-3">
                  <p className="text-slate-700">
                    <span className="font-bold">{metrics.expenseCount}</span> Transactions
                  </p>
                  <p className="text-green-700">
                    Cash: <span className="font-bold">{metrics.cashExpenses.toLocaleString('en-US')}</span>
                  </p>
                  <p className="text-blue-700">
                    Digital: <span className="font-bold">{metrics.digitalExpenses.toLocaleString('en-US')}</span>
                  </p>
                </div>
              </div>

              {/* Available Balances - FOURTH/LAST POSITION */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-900">AVAILABLE</h3>
                  <p className="text-xs text-green-700 font-semibold">UGX</p>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 break-words leading-tight">
                  {(metrics.availableCash + metrics.availableDigital).toLocaleString('en-US')}
                </p>
                <div className="text-sm space-y-1 border-t border-green-300 pt-3">
                  <p className="text-slate-700">
                    Total Available
                  </p>
                  <p className="text-green-700">
                    Cash: <span className="font-bold">{metrics.availableCash.toLocaleString('en-US')}</span>
                  </p>
                  <p className="text-blue-700">
                    Digital: <span className="font-bold">{metrics.availableDigital.toLocaleString('en-US')}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Section C: Recent Activity Feed */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Recent Activity</h2>
              
              {allActivity.length === 0 ? (
                <p className="text-slate-600 text-center py-8">No recent activity for this timeframe.</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                  {allActivity.map((record) => {
                    const isExpense = record.transaction_type === 'EXPENSE';
                    const isPatientTransaction = record.transaction_type === 'INCOME' && record.patient_id;
                    const isClickable = isExpense || isPatientTransaction;
                    
                    const handleClick = (e: React.MouseEvent) => {
                      e.preventDefault();
                      if (isExpense) {
                        setSelectedExpense(record);
                      } else if (isPatientTransaction) {
                        setSelectedPatientTransaction(record);
                      }
                    };

                    // Extract category and description for expenses
                    let expenseDescription = record.description;
                    let expenseCategory = '';
                    
                    if (isExpense && record.description) {
                      // Extract category from brackets like "[Salary / Advance] advance to susan"
                      const match = record.description.match(/^\[(.*?)\]\s*(.*)/);
                      if (match) {
                        expenseCategory = match[1]; // "Salary / Advance"
                        expenseDescription = match[2] || match[1]; // "advance to susan" or fallback to category
                      }
                    }

                    return (
                      <div
                        key={record.id}
                        onClick={isClickable ? handleClick : undefined}
                        className={`block bg-white rounded-lg p-4 border border-slate-200 transition-colors ${
                          isClickable ? 'hover:border-blue-400 hover:shadow-md cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className="text-sm font-mono text-slate-600 whitespace-nowrap">
                              {formatTime(record.created_at)}
                            </span>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-base font-semibold text-slate-900 truncate">
                                {isExpense 
                                  ? expenseDescription 
                                  : record.patients?.full_name || 'Unknown Patient'}
                              </span>
                              {isExpense && expenseCategory && (
                                <span className="text-sm text-slate-600 truncate">
                                  {expenseCategory}
                                </span>
                              )}
                              {!isExpense && record.service_category && (
                                <span className="text-sm text-slate-600 truncate">
                                  {record.service_category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-lg font-bold ${
                              record.transaction_type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(record.amount)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              getPaymentMethodColor(record.payment_method)
                            }`}>
                              {record.payment_method}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedExpense(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Expense Details</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Description</p>
                <p className="text-lg font-semibold text-slate-900">{selectedExpense.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Amount</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Payment Method</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedExpense.payment_method}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Date & Time</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(selectedExpense.created_at)} at {formatTime(selectedExpense.created_at)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedExpense(null)}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white p-3 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Patient Transaction Detail Modal */}
      {selectedPatientTransaction && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPatientTransaction(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Patient Transaction</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Patient Name</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedPatientTransaction.patients?.full_name || 'Unknown Patient'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Amount</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedPatientTransaction.amount)}</p>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Payment Method</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedPatientTransaction.payment_method}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Date & Time</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(selectedPatientTransaction.created_at)} at {formatTime(selectedPatientTransaction.created_at)}
                </p>
              </div>

              {selectedPatientTransaction.description && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Description</p>
                  <p className="text-base text-slate-900">{selectedPatientTransaction.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Link
                href={`/patients/${selectedPatientTransaction.patient_id}`}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors text-center"
              >
                View Patient Profile
              </Link>
              <button
                onClick={() => setSelectedPatientTransaction(null)}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white p-3 rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}