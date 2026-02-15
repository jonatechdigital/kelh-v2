'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingDown, BarChart, Loader2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

type Timeframe = 'today' | 'yesterday' | 'week' | 'month';

interface LedgerRecord {
  id: number;
  transaction_type: 'INCOME' | 'EXPENSE';
  payment_method: string;
  amount: number;
  patient_id: number | null;
  description: string;
  created_at: string;
  patients: {
    id: number;
    full_name: string;
    created_at: string;
  } | null;
}

interface DashboardMetrics {
  totalRevenue: number;
  cashRevenue: number;
  digitalRevenue: number;
  availableCash: number;
  availableDigital: number;
  totalPatients: number;
  newPatients: number;
  returningPatients: number;
  totalExpenses: number;
  expenseCount: number;
  cashExpenses: number;
  digitalExpenses: number;
}

export default function Home() {
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    cashRevenue: 0,
    digitalRevenue: 0,
    availableCash: 0,
    availableDigital: 0,
    totalPatients: 0,
    newPatients: 0,
    returningPatients: 0,
    totalExpenses: 0,
    expenseCount: 0,
    cashExpenses: 0,
    digitalExpenses: 0,
  });
  const [recentActivity, setRecentActivity] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<LedgerRecord | null>(null);

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
          created_at,
          patients (
            id,
            full_name,
            created_at
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
          .select('id, transaction_type, payment_method, amount, patient_id, description, created_at')
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
              .select('id, full_name, created_at')
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
      let cashRevenue = 0;
      let digitalRevenue = 0;
      let cashExpenses = 0;
      let digitalExpenses = 0;
      let totalExpenses = 0;
      let expenseCount = 0;
      const uniquePatients = new Set<number>();
      const newPatientIds = new Set<number>();

      records.forEach((record) => {
        if (record.transaction_type === 'INCOME') {
          totalRevenue += record.amount;
          if (record.payment_method === 'Cash') {
            cashRevenue += record.amount;
          } else {
            digitalRevenue += record.amount;
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

        // Track unique patients
        if (record.patient_id) {
          uniquePatients.add(record.patient_id);
          
          // Check if patient was created in this timeframe
          if (record.patients) {
            const patientCreatedAt = new Date(record.patients.created_at);
            if (patientCreatedAt >= start && patientCreatedAt <= end) {
              newPatientIds.add(record.patient_id);
            }
          }
        }
      });

      // Calculate available cash (cash income - cash expenses)
      const availableCash = cashRevenue - cashExpenses;
      
      // Calculate available digital (digital income - digital expenses)
      const availableDigital = digitalRevenue - digitalExpenses;
      
      // Calculate returning patients (total patients - new patients)
      const returningPatients = uniquePatients.size - newPatientIds.size;

      setMetrics({
        totalRevenue,
        cashRevenue,
        digitalRevenue,
        availableCash,
        availableDigital,
        totalPatients: uniquePatients.size,
        newPatients: newPatientIds.size,
        returningPatients,
        totalExpenses,
        expenseCount,
        cashExpenses,
        digitalExpenses,
      });

      // Set recent activity (last 5 records)
      setRecentActivity(records.slice(0, 5));
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
          <p className="text-slate-600">{formatDate(new Date())}</p>
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
              {/* Revenue (Income) */}
              <div className="bg-slate-100 rounded-xl p-6">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Revenue (Income)</h3>
                <p className="text-3xl font-bold text-green-600 mb-3">
                  {formatCurrency(metrics.totalRevenue)}
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-600">
                    Cash: <span className="font-semibold">{formatCurrency(metrics.cashRevenue)}</span>
                  </p>
                  <p className="text-slate-600">
                    Digital: <span className="font-semibold">{formatCurrency(metrics.digitalRevenue)}</span>
                  </p>
                </div>
              </div>

              {/* Available Balances */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="text-sm font-medium text-green-700 mb-2">Available Balances</h3>
                <p className="text-3xl font-bold text-green-600 mb-3">
                  {formatCurrency(metrics.availableCash)}
                </p>
                <div className="text-sm space-y-1">
                  <p className="text-green-700">
                    Cash on hand
                  </p>
                  <p className="text-blue-700 font-semibold">
                    Digital: {formatCurrency(metrics.availableDigital)}
                  </p>
                </div>
              </div>

              {/* Patients (Volume) */}
              <div className="bg-slate-100 rounded-xl p-6">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Patients (Volume)</h3>
                <p className="text-3xl font-bold text-blue-600 mb-3">
                  {metrics.totalPatients}
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-600">
                    <span className="font-semibold">{metrics.newPatients}</span> New Files
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold">{metrics.returningPatients}</span> Returning
                  </p>
                </div>
              </div>

              {/* Expenses (Money Out) */}
              <div className="bg-slate-100 rounded-xl p-6">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Expenses (Money Out)</h3>
                <p className="text-3xl font-bold text-red-600 mb-3">
                  {formatCurrency(metrics.totalExpenses)}
                </p>
                <div className="text-sm space-y-1">
                  <p className="text-slate-600">
                    <span className="font-semibold">{metrics.expenseCount}</span> Transactions
                  </p>
                  <p className="text-slate-600">
                    Cash: <span className="font-semibold">{formatCurrency(metrics.cashExpenses)}</span>
                  </p>
                  <p className="text-slate-600">
                    Digital: <span className="font-semibold">{formatCurrency(metrics.digitalExpenses)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Section C: Recent Activity Feed */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Recent Activity</h2>
              
              {recentActivity.length === 0 ? (
                <p className="text-slate-600 text-center py-8">No recent activity for this timeframe.</p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((record) => {
                    const isExpense = record.transaction_type === 'EXPENSE';
                    const isClickable = isExpense || record.patient_id;
                    
                    const handleClick = (e: React.MouseEvent) => {
                      if (isExpense) {
                        e.preventDefault();
                        setSelectedExpense(record);
                      }
                      // For INCOME with patient_id, the Link will handle navigation
                    };

                    return (
                      <Link
                        key={record.id}
                        href={record.patient_id ? `/patients/${record.patient_id}` : '#'}
                        onClick={handleClick}
                        className={`block bg-white rounded-lg p-4 border border-slate-200 transition-colors ${
                          isClickable ? 'hover:border-blue-400 hover:shadow-md cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className="text-sm font-mono text-slate-600 whitespace-nowrap">
                              {formatTime(record.created_at)}
                            </span>
                            <span className="text-base font-medium text-slate-900 truncate">
                              {isExpense 
                                ? record.description 
                                : record.patients?.full_name || 'Unknown Patient'}
                            </span>
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
                      </Link>
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
    </main>
  );
}