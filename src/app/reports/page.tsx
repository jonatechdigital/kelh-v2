'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Home, 
  TrendingUp, 
  Users, 
  Target,
  DollarSign,
  Calendar,
  Shield
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
  ResponsiveContainer 
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { DOCTORS, PAYMENT_METHODS } from '@/lib/constants';
import { checkIsAdmin } from '@/app/actions/users';

// Types
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
  patients: {
    age: number | null;
    referral_source: string | null;
  } | null;
}

type DateRange = 'this_month' | 'last_month' | 'last_3_months' | 'this_year';
type ViewTab = 'financial' | 'performance' | 'growth' | 'services';

// Chart Colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const router = useRouter();
  
  // State
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [currentView, setCurrentView] = useState<ViewTab>('financial');
  const [ledgerData, setLedgerData] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Check admin access on mount
  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
      if (!adminStatus) {
        setTimeout(() => router.push('/'), 2000);
      }
    } catch (error) {
      console.error('Error checking admin:', error);
      setIsAdmin(false);
      setTimeout(() => router.push('/'), 2000);
    }
  };
  
  // Fetch data based on date range
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [dateRange, isAdmin]);

  const getDateRangeFilter = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    return startDate.toISOString();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const startDate = getDateRangeFilter();
      
      const { data, error } = await supabase
        .from('ledger')
        .select('*, patient_id, patients(age, referral_source)')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching ledger data:', error);
        return;
      }

      setLedgerData(data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Financial Metrics
  const calculateFinancialMetrics = () => {
    const totalIncome = ledgerData
      .filter(r => r.transaction_type === 'INCOME')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const totalExpense = ledgerData
      .filter(r => r.transaction_type === 'EXPENSE')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const netProfit = totalIncome - totalExpense;
    
    return { totalIncome, totalExpense, netProfit };
  };

  // Income vs Expense Trend (Daily)
  const getIncomeExpenseTrend = () => {
    const dailyData: { [key: string]: { income: number; expense: number } } = {};
    
    ledgerData.forEach(record => {
      const date = new Date(record.created_at).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short' 
      });
      
      if (!dailyData[date]) {
        dailyData[date] = { income: 0, expense: 0 };
      }
      
      if (record.transaction_type === 'INCOME') {
        dailyData[date].income += record.amount;
      } else {
        dailyData[date].expense += record.amount;
      }
    });
    
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      income: data.income,
      expense: data.expense
    }));
  };

  // Income by Payment Method
  const getIncomeByPaymentMethod = () => {
    const paymentData: { [key: string]: number } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'INCOME' && r.payment_method)
      .forEach(record => {
        const method = record.payment_method!;
        paymentData[method] = (paymentData[method] || 0) + record.amount;
      });
    
    return Object.entries(paymentData).map(([name, value]) => ({
      name,
      value
    }));
  };

  // Expense Breakdown by Category
  const getExpenseByCategory = () => {
    const categoryData: { [key: string]: number } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'EXPENSE' && r.description)
      .forEach(record => {
        // Extract category from description (format: [Category] description)
        const match = record.description!.match(/^\[([^\]]+)\]/);
        if (match) {
          const category = match[1];
          categoryData[category] = (categoryData[category] || 0) + record.amount;
        }
      });
    
    return Object.entries(categoryData)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Revenue by Doctor
  const getRevenueByDoctor = () => {
    const doctorRevenue: { [key: string]: number } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'INCOME' && r.doctor && r.doctor !== 'None')
      .forEach(record => {
        const doctor = record.doctor!;
        doctorRevenue[doctor] = (doctorRevenue[doctor] || 0) + record.amount;
      });
    
    return Object.entries(doctorRevenue)
      .map(([doctor, revenue]) => ({ doctor, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Patient Volume by Doctor
  const getPatientVolumeByDoctor = () => {
    const doctorPatients: { [key: string]: Set<string> } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'INCOME' && r.doctor && r.doctor !== 'None')
      .forEach(record => {
        const doctor = record.doctor!;
        if (!doctorPatients[doctor]) {
          doctorPatients[doctor] = new Set();
        }
        // Use record ID as proxy for patient visits
        doctorPatients[doctor].add(record.id);
      });
    
    return Object.entries(doctorPatients)
      .map(([doctor, visits]) => ({ doctor, patients: visits.size }))
      .sort((a, b) => b.patients - a.patients);
  };

  // Revenue by Referral Source
  const getRevenueByReferralSource = () => {
    const referralRevenue: { [key: string]: number } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'INCOME' && r.patients?.referral_source)
      .forEach(record => {
        const source = record.patients!.referral_source!;
        referralRevenue[source] = (referralRevenue[source] || 0) + record.amount;
      });
    
    return Object.entries(referralRevenue)
      .map(([source, revenue]) => ({ source, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Patient Demographics by Referral Source
  const getPatientDemographics = () => {
    const demographics: { [key: string]: number } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'INCOME' && r.patients?.referral_source)
      .forEach(record => {
        const source = record.patients!.referral_source!;
        demographics[source] = (demographics[source] || 0) + 1;
      });
    
    return Object.entries(demographics).map(([name, value]) => ({
      name,
      value
    }));
  };

  // New vs Returning Patients
  const getNewVsReturningPatients = () => {
    const patientIds = new Set<number>();
    const newPatients = new Set<number>();
    const returningPatients = new Set<number>();
    
    // Count unique patients in period
    ledgerData.filter(r => r.transaction_type === 'INCOME' && r.patient_id).forEach(r => {
      patientIds.add(r.patient_id!);
    });
    
    // For each patient, check if first visit ever is in this period
    patientIds.forEach(patientId => {
      const patientRecords = ledgerData
        .filter(r => r.patient_id === patientId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      if (patientRecords.length > 0) {
        const firstVisit = new Date(patientRecords[0].created_at);
        const periodStart = new Date(getDateRangeFilter());
        
        if (firstVisit >= periodStart) {
          newPatients.add(patientId);
        } else {
          returningPatients.add(patientId);
        }
      }
    });
    
    return {
      new: newPatients.size,
      returning: returningPatients.size,
      total: patientIds.size
    };
  };

  // Revenue by Service Category
  const getRevenueByServiceCategory = () => {
    const serviceRevenue: { [key: string]: number } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'INCOME' && r.service_category)
      .forEach(record => {
        const category = record.service_category!;
        serviceRevenue[category] = (serviceRevenue[category] || 0) + record.amount;
      });
    
    return Object.entries(serviceRevenue)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Patient Volume by Service Category
  const getPatientVolumeByService = () => {
    const servicePatients: { [key: string]: number } = {};
    
    ledgerData
      .filter(r => r.transaction_type === 'INCOME' && r.service_category)
      .forEach(record => {
        const category = record.service_category!;
        servicePatients[category] = (servicePatients[category] || 0) + 1;
      });
    
    return Object.entries(servicePatients)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  };

  // New vs Returning Patient Distribution for Pie Chart
  const getPatientTypeDistribution = () => {
    const stats = getNewVsReturningPatients();
    return [
      { name: 'New Patients', value: stats.new },
      { name: 'Returning Patients', value: stats.returning }
    ];
  };

  // Custom Tooltip for Currency
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const metrics = calculateFinancialMetrics();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Bar */}
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

        {/* Admin Access Check */}
        {isAdmin === false && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <Shield size={48} className="text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-4">This page is only accessible to administrators.</p>
            <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
          </div>
        )}

        {isAdmin === null && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Verifying access...</p>
            </div>
          </div>
        )}

        {isAdmin === true && (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Reports & Analytics</h1>
              <p className="text-slate-600">Manager's Dashboard - Hospital Performance Insights</p>
            </div>

        {/* Date Range Filter */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar size={20} />
            <span className="font-medium">Period:</span>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="this_year">This Year</option>
          </select>
        </div>

        {/* View Tabs */}
        <div className="mb-8 flex gap-2 border-b-2 border-slate-200">
          <button
            onClick={() => setCurrentView('financial')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
              currentView === 'financial'
                ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign size={20} />
            Financial Health
          </button>
          <button
            onClick={() => setCurrentView('performance')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
              currentView === 'performance'
                ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={20} />
            Staff Performance
          </button>
          <button
            onClick={() => setCurrentView('growth')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
              currentView === 'growth'
                ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target size={20} />
            Growth & Marketing
          </button>
          <button
            onClick={() => setCurrentView('services')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
              currentView === 'services'
                ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp size={20} />
            Services & Patients
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading data...</p>
            </div>
          </div>
        ) : ledgerData.length === 0 ? (
          // Empty State
          <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-12 text-center">
            <TrendingUp size={48} className="text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No records found</h2>
            <p className="text-slate-600">No data available for the selected period.</p>
          </div>
        ) : (
          <>
            {/* Financial Health View */}
            {currentView === 'financial' && (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-slate-700 font-semibold">Total Income</h3>
                      <TrendingUp className="text-blue-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatCurrency(metrics.totalIncome)}
                    </p>
                  </div>
                  
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-slate-700 font-semibold">Total Expense</h3>
                      <TrendingUp className="text-red-600 rotate-180" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {formatCurrency(metrics.totalExpense)}
                    </p>
                  </div>
                  
                  <div className={`border-2 rounded-lg p-6 ${
                    metrics.netProfit >= 0 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-slate-700 font-semibold">Net Profit</h3>
                      <DollarSign className={metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
                    </div>
                    <p className={`text-3xl font-bold ${
                      metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(metrics.netProfit)}
                    </p>
                  </div>
                </div>

                {/* Income vs Expense Trend */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Income vs Expense Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={getIncomeExpenseTrend()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stackId="1"
                        stroke="#10b981" 
                        fill="#10b981" 
                        name="Income"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expense" 
                        stackId="2"
                        stroke="#ef4444" 
                        fill="#ef4444" 
                        name="Expense"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Income by Payment Method */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Income by Payment Method</h3>
                  {getIncomeByPaymentMethod().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getIncomeByPaymentMethod()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getIncomeByPaymentMethod().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No payment data available</p>
                  )}
                </div>

                {/* Expense Breakdown */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Expense Breakdown by Category</h3>
                  {getExpenseByCategory().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getExpenseByCategory()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="amount" fill="#ef4444" name="Amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No expense data available</p>
                  )}
                </div>
              </div>
            )}

            {/* Staff Performance View */}
            {currentView === 'performance' && (
              <div className="space-y-8">
                {/* Revenue by Doctor */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Revenue by Doctor</h3>
                  {getRevenueByDoctor().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getRevenueByDoctor()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="doctor" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No doctor revenue data available</p>
                  )}
                </div>

                {/* Patient Volume by Doctor */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Patient Volume by Doctor</h3>
                  {getPatientVolumeByDoctor().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getPatientVolumeByDoctor()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="doctor" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="patients" fill="#10b981" name="Patients" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No patient volume data available</p>
                  )}
                </div>
              </div>
            )}

            {/* Growth & Marketing View */}
            {currentView === 'growth' && (
              <div className="space-y-8">
                {/* Revenue by Referral Source */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Revenue by Referral Source</h3>
                  {getRevenueByReferralSource().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getRevenueByReferralSource()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="source" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No referral source data available</p>
                  )}
                </div>

                {/* Patient Demographics */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Patient Demographics (by Referral Source)</h3>
                  {getPatientDemographics().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getPatientDemographics()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getPatientDemographics().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No demographics data available</p>
                  )}
                </div>
              </div>
            )}

            {/* Services & Patients View */}
            {currentView === 'services' && (
              <div className="space-y-8">
                {/* Patient Analytics Cards */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Patient Analytics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(() => {
                      const stats = getNewVsReturningPatients();
                      return (
                        <>
                          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                            <h3 className="text-slate-700 font-semibold mb-2">New Patients</h3>
                            <p className="text-3xl font-bold text-green-600">{stats.new}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0}% of total
                            </p>
                          </div>
                          
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                            <h3 className="text-slate-700 font-semibold mb-2">Returning Patients</h3>
                            <p className="text-3xl font-bold text-blue-600">{stats.returning}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {stats.total > 0 ? Math.round((stats.returning / stats.total) * 100) : 0}% of total
                            </p>
                          </div>
                          
                          <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
                            <h3 className="text-slate-700 font-semibold mb-2">Total Patients</h3>
                            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                            <p className="text-sm text-slate-600 mt-1">In this period</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* New vs Returning Pie Chart */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">New vs Returning Patients</h3>
                  {getPatientTypeDistribution().some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getPatientTypeDistribution()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#3b82f6" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No patient data available</p>
                  )}
                </div>

                {/* Service Category Performance */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Service Performance</h2>
                </div>

                {/* Revenue by Service Category */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Revenue by Service Category</h3>
                  {getRevenueByServiceCategory().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getRevenueByServiceCategory()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" fill="#f59e0b" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No service revenue data available</p>
                  )}
                </div>

                {/* Patient Volume by Service */}
                <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Patient Volume by Service Category</h3>
                  {getPatientVolumeByService().length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getPatientVolumeByService()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" name="Visits" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-600 text-center py-8">No service volume data available</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
}
