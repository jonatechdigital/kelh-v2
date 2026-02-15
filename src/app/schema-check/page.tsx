'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

export default function SchemaCheckerPage() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<{
    patientsColumns: ColumnInfo[];
    ledgerColumns: ColumnInfo[];
    missingPatientColumns: string[];
    missingLedgerColumns: string[];
    error: string | null;
  } | null>(null);

  const REQUIRED_PATIENT_COLUMNS = [
    'id',
    'full_name',
    'phone',
    'age',
    'referral_source',
    'address',
    'medical_history',
    'created_at',
    'updated_at'
  ];

  const REQUIRED_LEDGER_COLUMNS = [
    'id',
    'transaction_type',
    'payment_method',
    'amount',
    'patient_id',
    'service_category',
    'doctor',
    'description',
    'created_at',
    'updated_at'
  ];

  const checkSchema = async () => {
    setChecking(true);
    setResults(null);

    try {
      const supabase = createClient();

      // Check patients table columns
      const { data: patientsData, error: patientsError } = await supabase
        .rpc('get_table_columns', { table_name: 'patients' });

      // Check ledger table columns
      const { data: ledgerData, error: ledgerError } = await supabase
        .rpc('get_table_columns', { table_name: 'ledger' });

      // If RPC doesn't exist, try direct query (will show us the error)
      let patientsColumns: ColumnInfo[] = [];
      let ledgerColumns: ColumnInfo[] = [];
      let errorMsg: string | null = null;

      if (patientsError) {
        errorMsg = `Cannot check schema automatically. Error: ${patientsError.message}. Please run the SQL query manually in Supabase.`;
      } else {
        patientsColumns = patientsData || [];
        ledgerColumns = ledgerData || [];
      }

      // Find missing columns
      const patientColumnNames = patientsColumns.map(c => c.column_name);
      const ledgerColumnNames = ledgerColumns.map(c => c.column_name);

      const missingPatientColumns = REQUIRED_PATIENT_COLUMNS.filter(
        col => !patientColumnNames.includes(col)
      );

      const missingLedgerColumns = REQUIRED_LEDGER_COLUMNS.filter(
        col => !ledgerColumnNames.includes(col)
      );

      setResults({
        patientsColumns,
        ledgerColumns,
        missingPatientColumns,
        missingLedgerColumns,
        error: errorMsg
      });
    } catch (error) {
      console.error('Schema check error:', error);
      setResults({
        patientsColumns: [],
        ledgerColumns: [],
        missingPatientColumns: [],
        missingLedgerColumns: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Database Schema Checker</h1>
          <p className="text-slate-600">
            This tool helps diagnose database schema issues
          </p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-yellow-900 mb-3">⚠️ Manual Check Required</h2>
          <p className="text-yellow-800 mb-4">
            Run this SQL query in your Supabase SQL Editor to see your current schema:
          </p>
          <pre className="bg-yellow-100 p-4 rounded text-sm overflow-x-auto mb-4">
{`-- Check patients table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

-- Check ledger table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ledger' 
ORDER BY ordinal_position;`}
          </pre>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Required Columns</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Patients Table</h3>
              <ul className="space-y-1">
                {REQUIRED_PATIENT_COLUMNS.map((col) => (
                  <li key={col} className="text-slate-700 font-mono text-sm">
                    • {col}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Ledger Table</h3>
              <ul className="space-y-1">
                {REQUIRED_LEDGER_COLUMNS.map((col) => (
                  <li key={col} className="text-slate-700 font-mono text-sm">
                    • {col}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-900 mb-3">✅ How to Fix Missing Columns</h2>
          <p className="text-green-800 mb-4">
            If any columns are missing from your database:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-green-800 mb-4">
            <li>Open your Supabase Dashboard</li>
            <li>Go to SQL Editor</li>
            <li>Copy and paste the contents of <code className="bg-green-100 px-2 py-1 rounded font-mono">FIX_SCHEMA.sql</code></li>
            <li>Click Run</li>
            <li>Refresh this page and try again</li>
          </ol>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Open Supabase Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
