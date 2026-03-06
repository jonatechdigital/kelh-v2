'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Shield,
  RefreshCw,
  BarChart2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { checkIsAdmin } from '@/app/actions/users';

interface LedgerRecord {
  id: string;
  created_at: string;
  transaction_type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string | null;
  payment_method: string | null;
  doctor: string | null;
  service_category: string | null;
  patient_id: number | null;
  patients: { age: number | null; referral_source: string | null } | null;
}

type DateRange = 'this_month' | 'last_month' | 'last_3_months' | 'this_year';
type ViewTab = 'financial' | 'performance' | 'growth' | 'services';

const IOS_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA'];

const TAB_CONFIG: { id: ViewTab; label: string; icon: typeof DollarSign }[] = [
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'performance', label: 'Staff', icon: Users },
  { id: 'growth', label: 'Growth', icon: Target },
  { id: 'services', label: 'Services', icon: TrendingUp },
];

export default function ReportsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [currentView, setCurrentView] = useState<ViewTab>('financial');
  const [ledgerData, setLedgerData] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { checkAdminAccess(); }, []);

  const checkAdminAccess = async () => {
    try {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
      if (!adminStatus) setTimeout(() => router.push('/'), 2000);
    } catch (error) {
      console.error('Error checking admin:', error);
      setIsAdmin(false);
      setTimeout(() => router.push('/'), 2000);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [dateRange, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();
    const channel = supabase
      .channel('ledger-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger' },
        (payload: any) => {
          const changeDate = new Date((payload.new?.created_at || payload.old?.created_at) as string);
          if (changeDate >= new Date(getDateRangeFilter())) fetchData();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dateRange, isAdmin]);

  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'this_month': return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'last_month': return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      case 'last_3_months': return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      case 'this_year': return new Date(now.getFullYear(), 0, 1).toISOString();
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ledger')
        .select('*, patient_id, patients(age, referral_source)')
        .gte('created_at', getDateRangeFilter())
        .order('created_at', { ascending: true });

      if (error) { console.error('Error fetching ledger data:', error); return; }
      setLedgerData(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const calculateFinancialMetrics = () => {
    const totalIncome = ledgerData.filter(r => r.transaction_type === 'INCOME').reduce((s, r) => s + r.amount, 0);
    const totalExpense = ledgerData.filter(r => r.transaction_type === 'EXPENSE').reduce((s, r) => s + r.amount, 0);
    return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  };

  const getIncomeExpenseTrend = () => {
    const daily: { [key: string]: { income: number; expense: number } } = {};
    ledgerData.forEach(record => {
      const date = new Date(record.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (!daily[date]) daily[date] = { income: 0, expense: 0 };
      if (record.transaction_type === 'INCOME') daily[date].income += record.amount;
      else daily[date].expense += record.amount;
    });
    return Object.entries(daily).map(([date, data]) => ({ date, ...data }));
  };

  const getIncomeByPaymentMethod = () => {
    const d: { [k: string]: number } = {};
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.payment_method)
      .forEach(r => { d[r.payment_method!] = (d[r.payment_method!] || 0) + r.amount; });
    return Object.entries(d).map(([name, value]) => ({ name, value }));
  };

  const getExpenseByCategory = () => {
    const d: { [k: string]: number } = {};
    ledgerData.filter(r => r.transaction_type === 'EXPENSE' && r.description)
      .forEach(r => {
        const match = r.description!.match(/^\[([^\]]+)\]/);
        if (match) d[match[1]] = (d[match[1]] || 0) + r.amount;
      });
    return Object.entries(d).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  };

  const getRevenueByDoctor = () => {
    const d: { [k: string]: number } = {};
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.doctor && r.doctor !== 'None')
      .forEach(r => { d[r.doctor!] = (d[r.doctor!] || 0) + r.amount; });
    return Object.entries(d).map(([doctor, revenue]) => ({ doctor, revenue })).sort((a, b) => b.revenue - a.revenue);
  };

  const getPatientVolumeByDoctor = () => {
    const d: { [k: string]: Set<string> } = {};
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.doctor && r.doctor !== 'None')
      .forEach(r => {
        if (!d[r.doctor!]) d[r.doctor!] = new Set();
        d[r.doctor!].add(r.id);
      });
    return Object.entries(d).map(([doctor, visits]) => ({ doctor, patients: visits.size })).sort((a, b) => b.patients - a.patients);
  };

  const getRevenueByReferralSource = () => {
    const d: { [k: string]: number } = {};
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.patients?.referral_source)
      .forEach(r => { const s = r.patients!.referral_source!; d[s] = (d[s] || 0) + r.amount; });
    return Object.entries(d).map(([source, revenue]) => ({ source, revenue })).sort((a, b) => b.revenue - a.revenue);
  };

  const getPatientDemographics = () => {
    const d: { [k: string]: number } = {};
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.patients?.referral_source)
      .forEach(r => { const s = r.patients!.referral_source!; d[s] = (d[s] || 0) + 1; });
    return Object.entries(d).map(([name, value]) => ({ name, value }));
  };

  const getNewVsReturningPatients = () => {
    const patientIds = new Set<number>();
    const newP = new Set<number>(), retP = new Set<number>();
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.patient_id).forEach(r => patientIds.add(r.patient_id!));
    patientIds.forEach(id => {
      const recs = ledgerData.filter(r => r.patient_id === id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (recs.length > 0) {
        new Date(recs[0].created_at) >= new Date(getDateRangeFilter()) ? newP.add(id) : retP.add(id);
      }
    });
    return { new: newP.size, returning: retP.size, total: patientIds.size };
  };

  const getRevenueByServiceCategory = () => {
    const d: { [k: string]: number } = {};
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.service_category)
      .forEach(r => { d[r.service_category!] = (d[r.service_category!] || 0) + r.amount; });
    return Object.entries(d).map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue);
  };

  const getPatientVolumeByService = () => {
    const d: { [k: string]: number } = {};
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.service_category)
      .forEach(r => { d[r.service_category!] = (d[r.service_category!] || 0) + 1; });
    return Object.entries(d).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  };

  const getPatientTypeDistribution = () => {
    const stats = getNewVsReturningPatients();
    return [{ name: 'New Patients', value: stats.new }, { name: 'Returning Patients', value: stats.returning }];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl p-3 shadow-lg" style={{ backgroundColor: 'var(--ios-card)', border: '0.5px solid var(--ios-separator-opaque)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ios-label-secondary)' }}>{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const metrics = calculateFinancialMetrics();

  if (isAdmin === null || (loading && isAdmin === null)) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent mx-auto mb-3"
            style={{ borderColor: 'var(--ios-blue)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Verifying access…</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="ios-card rounded-2xl p-8 max-w-sm text-center">
          <Shield size={40} className="mx-auto mb-4" style={{ color: 'var(--ios-red)' }} />
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--ios-label)' }}>Access Denied</h2>
          <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>This page is admin-only. Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-blue)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--ios-label)' }}>Reports & Analytics</h1>
          <p className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>Hospital Performance Insights</p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
          style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)', color: 'var(--ios-blue)' }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Date Range + Last Updated */}
      <div className="flex items-center gap-3 mb-5">
        <div className="ios-card rounded-xl px-3 py-2 flex-1">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="w-full text-sm bg-transparent border-none outline-none font-medium"
            style={{ color: 'var(--ios-label)' }}
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
        {lastUpdated && (
          <p className="text-xs shrink-0" style={{ color: 'var(--ios-label-secondary)' }}>
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* iOS Tab Bar — scrollable on small screens */}
      <div className="ios-tab-scroll mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="ios-segmented-control w-full" style={{ backgroundColor: 'rgba(118, 118, 128, 0.12)', minWidth: 320 }}>
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`ios-segmented-option flex-1 flex items-center justify-center gap-1.5${currentView === tab.id ? ' active' : ''}`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
            style={{ borderColor: 'var(--ios-blue)', borderTopColor: 'transparent' }} />
        </div>
      ) : ledgerData.length === 0 ? (
        <div className="ios-card rounded-2xl p-12 text-center">
          <BarChart2 size={40} className="mx-auto mb-3" style={{ color: 'var(--ios-label-tertiary)' }} />
          <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>No records found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ios-label-secondary)' }}>No data for the selected period</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Financial Health */}
          {currentView === 'financial' && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="ios-card rounded-2xl p-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Income</p>
                  <p className="text-base font-bold leading-tight" style={{ color: 'var(--ios-green)' }}>
                    {formatCurrency(metrics.totalIncome)}
                  </p>
                </div>
                <div className="ios-card rounded-2xl p-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Expenses</p>
                  <p className="text-base font-bold leading-tight" style={{ color: 'var(--ios-red)' }}>
                    {formatCurrency(metrics.totalExpense)}
                  </p>
                </div>
                <div className="ios-card rounded-2xl p-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Net</p>
                  <p className="text-base font-bold leading-tight" style={{ color: metrics.netProfit >= 0 ? 'var(--ios-green)' : 'var(--ios-red)' }}>
                    {formatCurrency(metrics.netProfit)}
                  </p>
                </div>
              </div>

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Income vs Expense Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={getIncomeExpenseTrend()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ios-separator-opaque)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#34C759" fill="rgba(52, 199, 89, 0.2)" name="Income" />
                    <Area type="monotone" dataKey="expense" stackId="2" stroke="#FF3B30" fill="rgba(255, 59, 48, 0.2)" name="Expense" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Income by Payment Method</h3>
                {getIncomeByPaymentMethod().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={getIncomeByPaymentMethod()} cx="50%" cy="50%" labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value.toLocaleString()}`}
                        outerRadius={80} dataKey="value">
                        {getIncomeByPaymentMethod().map((_, i) => (
                          <Cell key={i} fill={IOS_COLORS[i % IOS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No payment data available</p>
                )}
              </div>

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Expense Breakdown by Category</h3>
                {getExpenseByCategory().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getExpenseByCategory()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ios-separator-opaque)" />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--ios-label-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill="#FF3B30" name="Amount" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No expense data available</p>
                )}
              </div>
            </>
          )}

          {/* Staff Performance */}
          {currentView === 'performance' && (
            <>
              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Revenue by Doctor</h3>
                {getRevenueByDoctor().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getRevenueByDoctor()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ios-separator-opaque)" />
                      <XAxis dataKey="doctor" tick={{ fontSize: 10, fill: 'var(--ios-label-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#007AFF" name="Revenue" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No doctor revenue data</p>
                )}
              </div>

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Patient Volume by Doctor</h3>
                {getPatientVolumeByDoctor().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getPatientVolumeByDoctor()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ios-separator-opaque)" />
                      <XAxis dataKey="doctor" tick={{ fontSize: 10, fill: 'var(--ios-label-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                      <Tooltip />
                      <Bar dataKey="patients" fill="#34C759" name="Patients" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No patient volume data</p>
                )}
              </div>
            </>
          )}

          {/* Growth & Marketing */}
          {currentView === 'growth' && (
            <>
              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Revenue by Referral Source</h3>
                {getRevenueByReferralSource().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getRevenueByReferralSource()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ios-separator-opaque)" />
                      <XAxis dataKey="source" tick={{ fontSize: 10, fill: 'var(--ios-label-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#AF52DE" name="Revenue" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No referral source data</p>
                )}
              </div>

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Patient Demographics by Referral Source</h3>
                {getPatientDemographics().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={getPatientDemographics()} cx="50%" cy="50%" labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80} dataKey="value">
                        {getPatientDemographics().map((_, i) => (
                          <Cell key={i} fill={IOS_COLORS[i % IOS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No demographics data</p>
                )}
              </div>
            </>
          )}

          {/* Services & Patients */}
          {currentView === 'services' && (
            <>
              {(() => {
                const stats = getNewVsReturningPatients();
                return (
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                    <div className="ios-card rounded-2xl p-4">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ios-label-secondary)' }}>New</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--ios-green)' }}>{stats.new}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ios-label-tertiary)' }}>
                        {stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0}%
                      </p>
                    </div>
                    <div className="ios-card rounded-2xl p-4">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Returning</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--ios-blue)' }}>{stats.returning}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ios-label-tertiary)' }}>
                        {stats.total > 0 ? Math.round((stats.returning / stats.total) * 100) : 0}%
                      </p>
                    </div>
                    <div className="ios-card rounded-2xl p-4">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ios-label-secondary)' }}>Total</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--ios-label)' }}>{stats.total}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ios-label-tertiary)' }}>patients</p>
                    </div>
                  </div>
                );
              })()}

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>New vs Returning Patients</h3>
                {getPatientTypeDistribution().some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={getPatientTypeDistribution()} cx="50%" cy="50%" labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80} dataKey="value">
                        <Cell fill="#34C759" />
                        <Cell fill="#007AFF" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No patient data</p>
                )}
              </div>

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Revenue by Service Category</h3>
                {getRevenueByServiceCategory().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getRevenueByServiceCategory()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ios-separator-opaque)" />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--ios-label-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#FF9500" name="Revenue" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No service revenue data</p>
                )}
              </div>

              <div className="ios-card rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--ios-label)' }}>Patient Volume by Service Category</h3>
                {getPatientVolumeByService().length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getPatientVolumeByService()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ios-separator-opaque)" />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--ios-label-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ios-label-secondary)' }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#5856D6" name="Visits" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ios-label-secondary)' }}>No service volume data</p>
                )}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
