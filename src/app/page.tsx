'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingDown, BarChart2, Loader2, Receipt, ChevronRight, X } from 'lucide-react';
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
  created_by_email?: string | null;
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

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  month: 'This Month',
};

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

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing');
        return;
      }

      const { start, end } = getDateRange();
      setDateRange({ start, end });

      let ledgerData: any[] | null = null;
      let ledgerError = null;

      const ledgerQuery = await supabase
        .from('ledger_with_audit')
        .select(`
          id,
          transaction_type,
          payment_method,
          amount,
          patient_id,
          description,
          service_category,
          created_at,
          created_by_email,
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

      if (ledgerError) {
        const simpleLedgerQuery = await supabase
          .from('ledger_with_audit')
          .select('id, transaction_type, payment_method, amount, patient_id, description, service_category, created_at, created_by_email')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false });

        ledgerData = simpleLedgerQuery.data;
        ledgerError = simpleLedgerQuery.error;

        if (ledgerError) {
          console.error('Error fetching ledger data:', ledgerError);
          return;
        }

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

      let totalRevenue = 0, revenueCount = 0, cashRevenue = 0, digitalRevenue = 0;
      let cashExpenses = 0, digitalExpenses = 0, totalExpenses = 0, expenseCount = 0;
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
          if (record.patient_id) {
            const timestamps = patientVisitTimestamps.get(record.patient_id) || [];
            timestamps.push(new Date(record.created_at));
            patientVisitTimestamps.set(record.patient_id, timestamps);
          }
        } else if (record.transaction_type === 'EXPENSE') {
          totalExpenses += record.amount;
          expenseCount++;
          if (record.payment_method === 'Cash') {
            cashExpenses += record.amount;
          } else {
            digitalExpenses += record.amount;
          }
        }

        if (record.patient_id) {
          uniquePatients.add(record.patient_id);
        }
      });

      const getWorkingDay = (date: Date): string => {
        const hour = date.getHours();
        const workingDate = new Date(date);
        if (hour < 8) workingDate.setDate(workingDate.getDate() - 1);
        return workingDate.toISOString().split('T')[0];
      };

      uniquePatients.forEach((patientId) => {
        const timestamps = patientVisitTimestamps.get(patientId) || [];
        const patientRecord = records.find(r => r.patient_id === patientId && r.patients);

        if (patientRecord && patientRecord.patients && timestamps.length > 0) {
          const workingDays = new Set<string>();
          timestamps.forEach(ts => workingDays.add(getWorkingDay(ts)));

          const patientCreatedAt = new Date(patientRecord.patients.created_at);
          const patientCreatedDate = new Date(patientCreatedAt.getFullYear(), patientCreatedAt.getMonth(), patientCreatedAt.getDate());
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const isNewPatient = patientCreatedDate >= startDate;

          if (isNewPatient) {
            newPatientIds.add(patientId);
            if (patientRecord.patients.referral_source === 'Social Media') {
              socialMediaReferralIds.add(patientId);
            }
          }

          if (workingDays.size >= 2) {
            returningPatientIds.add(patientId);
          }
        }
      });

      const availableCash = cashRevenue - cashExpenses;
      const availableDigital = digitalRevenue - digitalExpenses;

      setMetrics({
        totalRevenue, revenueCount, cashRevenue, digitalRevenue,
        availableCash, availableDigital,
        totalPatients: uniquePatients.size,
        newPatients: newPatientIds.size,
        returningPatients: returningPatientIds.size,
        socialMediaReferrals: socialMediaReferralIds.size,
        totalExpenses, expenseCount, cashExpenses, digitalExpenses,
      });

      setRecentActivity(records.slice(0, 5));
      setAllActivity(records);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getPaymentBadgeStyle = (method: string): { bg: string; color: string } => {
    switch (method) {
      case 'Cash': return { bg: 'rgba(52, 199, 89, 0.15)', color: '#1a7a30' };
      case 'MoMo':
      case 'Airtel Money': return { bg: 'rgba(255, 149, 0, 0.15)', color: '#b36b00' };
      case 'Card': return { bg: 'rgba(0, 122, 255, 0.15)', color: '#0055b3' };
      case 'Insurance': return { bg: 'rgba(175, 82, 222, 0.15)', color: '#7a2aaa' };
      case 'Partner': return { bg: 'rgba(90, 200, 250, 0.15)', color: '#0082b0' };
      default: return { bg: 'rgba(142, 142, 147, 0.15)', color: '#636366' };
    }
  };

  return (
    <div>
      {/* Date label */}
      <p className="text-sm mb-4" style={{ color: 'var(--ios-label-secondary)' }}>
        {dateRange ? formatDateRange(dateRange.start, dateRange.end) : formatDate(new Date())}
      </p>

      {/* iOS Segmented Control — Timeframe */}
      <div className="mb-6">
        <div className="ios-segmented-control w-full" style={{ backgroundColor: 'rgba(118, 118, 128, 0.12)' }}>
          {(['today', 'yesterday', 'week', 'month'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`ios-segmented-option flex-1 text-center${timeframe === tf ? ' active' : ''}`}
            >
              {TIMEFRAME_LABELS[tf]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin" size={36} style={{ color: 'var(--ios-blue)' }} />
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Link
              href="/patients"
              className="flex flex-col items-center justify-center gap-2 py-5 md:py-7 rounded-2xl text-white transition-opacity active:opacity-80"
              style={{ background: 'linear-gradient(145deg, #34C759, #2ea84a)' }}
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Users size={22} className="md:hidden" />
                <Users size={26} className="hidden md:block" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-center leading-tight">Check-In</span>
            </Link>

            <Link
              href="/expenses/new"
              className="flex flex-col items-center justify-center gap-2 py-5 md:py-7 rounded-2xl text-white transition-opacity active:opacity-80"
              style={{ background: 'linear-gradient(145deg, #FF3B30, #d42d23)' }}
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                <TrendingDown size={22} className="md:hidden" />
                <TrendingDown size={26} className="hidden md:block" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-center leading-tight">Expense</span>
            </Link>

            <Link
              href="/reports"
              className="flex flex-col items-center justify-center gap-2 py-5 md:py-7 rounded-2xl text-white transition-opacity active:opacity-80"
              style={{ background: 'linear-gradient(145deg, #5856D6, #4644b8)' }}
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                <BarChart2 size={22} className="md:hidden" />
                <BarChart2 size={26} className="hidden md:block" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-center leading-tight">Reports</span>
            </Link>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Patients */}
            <div className="ios-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(175, 82, 222, 0.15)' }}>
                  <Users size={16} style={{ color: 'var(--ios-purple)' }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ios-label-secondary)' }}>Patients</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--ios-purple)' }}>
                {metrics.totalPatients}
              </p>
              <div className="space-y-0.5 text-xs" style={{ color: 'var(--ios-label-secondary)' }}>
                <p><span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.newPatients}</span> New Files</p>
                <p><span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.returningPatients}</span> Returning</p>
                <p><span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.socialMediaReferrals}</span> Social Media</p>
              </div>
            </div>

            {/* Available Balance */}
            <div className="ios-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)' }}>
                  <Receipt size={16} style={{ color: 'var(--ios-green)' }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ios-label-secondary)' }}>Available</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold mb-2 leading-tight" style={{ color: 'var(--ios-green)' }}>
                {(metrics.availableCash + metrics.availableDigital).toLocaleString('en-US')}
              </p>
              <div className="space-y-0.5 text-xs" style={{ color: 'var(--ios-label-secondary)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--ios-label-tertiary)' }}>UGX</p>
                <p>Cash: <span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.availableCash.toLocaleString('en-US')}</span></p>
                <p>Digital: <span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.availableDigital.toLocaleString('en-US')}</span></p>
              </div>
            </div>

            {/* Revenue */}
            <div className="ios-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)' }}>
                  <TrendingDown size={16} style={{ color: 'var(--ios-blue)', transform: 'rotate(180deg)' }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ios-label-secondary)' }}>Revenue</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold mb-2 leading-tight" style={{ color: 'var(--ios-blue)' }}>
                {metrics.totalRevenue.toLocaleString('en-US')}
              </p>
              <div className="space-y-0.5 text-xs" style={{ color: 'var(--ios-label-secondary)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--ios-label-tertiary)' }}>{metrics.revenueCount} tx · UGX</p>
                <p>Cash: <span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.cashRevenue.toLocaleString('en-US')}</span></p>
                <p>Digital: <span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.digitalRevenue.toLocaleString('en-US')}</span></p>
              </div>
            </div>

            {/* Expenses */}
            <div className="ios-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
                  <TrendingDown size={16} style={{ color: 'var(--ios-red)' }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ios-label-secondary)' }}>Expenses</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold mb-2 leading-tight" style={{ color: 'var(--ios-red)' }}>
                {metrics.totalExpenses.toLocaleString('en-US')}
              </p>
              <div className="space-y-0.5 text-xs" style={{ color: 'var(--ios-label-secondary)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--ios-label-tertiary)' }}>{metrics.expenseCount} tx · UGX</p>
                <p>Cash: <span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.cashExpenses.toLocaleString('en-US')}</span></p>
                <p>Digital: <span className="font-semibold" style={{ color: 'var(--ios-label)' }}>{metrics.digitalExpenses.toLocaleString('en-US')}</span></p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-lg font-bold mb-3 px-1" style={{ color: 'var(--ios-label)' }}>
              Recent Activity
            </h2>

            {allActivity.length === 0 ? (
              <div className="ios-card flex flex-col items-center justify-center py-12 rounded-2xl">
                <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--ios-fill-tertiary)' }}>
                  <Receipt size={22} style={{ color: 'var(--ios-label-secondary)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--ios-label-secondary)' }}>No activity for this period</p>
              </div>
            ) : (
              <div className="ios-card overflow-hidden rounded-2xl">
                {allActivity.map((record, idx) => {
                  const isExpense = record.transaction_type === 'EXPENSE';
                  const isPatientTransaction = record.transaction_type === 'INCOME' && record.patient_id;
                  const isClickable = isExpense || isPatientTransaction;

                  let expenseDescription = record.description;
                  let expenseCategory = '';
                  if (isExpense && record.description) {
                    const match = record.description.match(/^\[(.*?)\]\s*(.*)/);
                    if (match) {
                      expenseCategory = match[1];
                      expenseDescription = match[2] || match[1];
                    }
                  }

                  const badge = getPaymentBadgeStyle(record.payment_method);

                  return (
                    <div key={record.id}>
                      {idx > 0 && (
                        <div className="mx-4" style={{ height: '0.5px', backgroundColor: 'var(--ios-separator-opaque)' }} />
                      )}
                      <div
                        onClick={isClickable ? () => {
                          if (isExpense) setSelectedExpense(record);
                          else if (isPatientTransaction) setSelectedPatientTransaction(record);
                        } : undefined}
                        className={`ios-list-row px-4 py-3.5 ${isClickable ? 'cursor-pointer' : ''}`}
                      >
                        {/* Type indicator */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isExpense ? 'rgba(255, 59, 48, 0.12)' : 'rgba(52, 199, 89, 0.12)'
                          }}
                        >
                          {isExpense
                            ? <TrendingDown size={15} style={{ color: 'var(--ios-red)' }} />
                            : <Receipt size={15} style={{ color: 'var(--ios-green)' }} />
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--ios-label)' }}>
                            {isExpense
                              ? expenseDescription
                              : record.patients?.full_name || 'Unknown Patient'}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--ios-label-secondary)' }}>
                            {isExpense && expenseCategory ? expenseCategory : record.service_category || formatTime(record.created_at)}
                          </p>
                        </div>

                        {/* Right side */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className="text-sm font-bold"
                            style={{ color: isExpense ? 'var(--ios-red)' : 'var(--ios-green)' }}
                          >
                            {isExpense ? '−' : '+'}{formatCurrency(record.amount)}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {record.payment_method}
                          </span>
                        </div>

                        {isClickable && (
                          <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--ios-label-tertiary)' }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ios-backdrop"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl overflow-hidden"
            style={{ boxShadow: 'var(--ios-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
                    <TrendingDown size={20} style={{ color: 'var(--ios-red)' }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--ios-label)' }}>Expense Details</h2>
                </div>
                <button onClick={() => setSelectedExpense(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Description</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{selectedExpense.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Amount</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--ios-red)' }}>{formatCurrency(selectedExpense.amount)}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Payment</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{selectedExpense.payment_method}</p>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Date & Time</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>
                    {formatDate(selectedExpense.created_at)} at {formatTime(selectedExpense.created_at)}
                  </p>
                </div>
                {selectedExpense.created_by_email && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(0, 122, 255, 0.06)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-blue)' }}>Recorded By</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{selectedExpense.created_by_email}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 pb-6">
              <button
                onClick={() => setSelectedExpense(null)}
                className="ios-btn-primary"
                style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Transaction Modal */}
      {selectedPatientTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ios-backdrop"
          onClick={() => setSelectedPatientTransaction(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl overflow-hidden"
            style={{ boxShadow: 'var(--ios-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
                    <Receipt size={20} style={{ color: 'var(--ios-green)' }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--ios-label)' }}>Patient Transaction</h2>
                </div>
                <button onClick={() => setSelectedPatientTransaction(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Patient</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{selectedPatientTransaction.patients?.full_name || 'Unknown Patient'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Amount</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--ios-green)' }}>{formatCurrency(selectedPatientTransaction.amount)}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Payment</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{selectedPatientTransaction.payment_method}</p>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Date & Time</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>
                    {formatDate(selectedPatientTransaction.created_at)} at {formatTime(selectedPatientTransaction.created_at)}
                  </p>
                </div>
                {selectedPatientTransaction.description && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ios-bg)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Description</p>
                    <p className="text-sm" style={{ color: 'var(--ios-label)' }}>{selectedPatientTransaction.description}</p>
                  </div>
                )}
                {selectedPatientTransaction.created_by_email && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(0, 122, 255, 0.06)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--ios-blue)' }}>Added By</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{selectedPatientTransaction.created_by_email}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 pb-6 space-y-2">
              <Link
                href={`/patients/${selectedPatientTransaction.patient_id}`}
                className="block w-full text-center py-4 rounded-2xl text-white text-base font-semibold transition-opacity active:opacity-80"
                style={{ backgroundColor: 'var(--ios-blue)' }}
              >
                View Patient Profile
              </Link>
              <button
                onClick={() => setSelectedPatientTransaction(null)}
                className="w-full py-4 rounded-2xl text-base font-semibold transition-opacity active:opacity-80"
                style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
