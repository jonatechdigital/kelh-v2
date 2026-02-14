import Link from 'next/link';
import { Banknote, TrendingDown, UserPlus, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function Home() {
  const today = new Date();

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">KELH Manager V2</h1>
          <p className="text-slate-600">{formatDate(today)}</p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Cash in Drawer */}
          <div className="bg-slate-100 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Cash in Drawer</h3>
            <p className="text-3xl font-bold text-green-600">UGX 0</p>
          </div>

          {/* Digital / Partner */}
          <div className="bg-slate-100 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Digital / Partner</h3>
            <p className="text-3xl font-bold text-blue-600">UGX 0</p>
          </div>

          {/* Patients Today */}
          <div className="bg-slate-100 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Patients Today</h3>
            <p className="text-3xl font-bold text-purple-600">0</p>
          </div>
        </div>

        {/* Main Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* New Sale */}
          <Link 
            href="/sales/new"
            className="bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-md p-6 h-32 flex items-center justify-center gap-4 transition-colors"
          >
            <Banknote size={40} />
            <span className="text-2xl font-bold">NEW SALE</span>
          </Link>

          {/* New Expense */}
          <Link 
            href="/expenses/new"
            className="bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-md p-6 h-32 flex items-center justify-center gap-4 transition-colors"
          >
            <TrendingDown size={40} />
            <span className="text-2xl font-bold">NEW EXPENSE</span>
          </Link>

          {/* Check-In */}
          <Link 
            href="/patients"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md p-6 h-32 flex items-center justify-center gap-4 transition-colors"
          >
            <UserPlus size={40} />
            <span className="text-2xl font-bold">CHECK-IN</span>
          </Link>

          {/* Reports */}
          <Link 
            href="/reports"
            className="bg-slate-600 hover:bg-slate-700 text-white rounded-2xl shadow-md p-6 h-32 flex items-center justify-center gap-4 transition-colors"
          >
            <FileText size={40} />
            <span className="text-2xl font-bold">REPORTS</span>
          </Link>
        </div>
      </div>
    </main>
  );
}