'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DebugSchemaPage() {
  const [patientsSchema, setPatientsSchema] = useState<any>(null);
  const [ledgerSchema, setLedgerSchema] = useState<any>(null);
  const [patientsData, setPatientsData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSchema = async () => {
    setLoading(true);
    const supabase = createClient();

    // First, try to insert empty records to trigger validation errors that reveal required fields
    const patientsInsertTest = await supabase
      .from('patients')
      .insert({})
      .select();

    const ledgerInsertTest = await supabase
      .from('ledger')
      .insert({})
      .select();

    // For patients table, try different common column combinations
    const patientTests = [
      { label: 'All columns (*)', query: supabase.from('patients').select('*').limit(1) },
      { label: 'With name', query: supabase.from('patients').select('id, name, created_at').limit(1) },
      { label: 'With patient_name', query: supabase.from('patients').select('id, patient_name, created_at').limit(1) },
      { label: 'With full_name', query: supabase.from('patients').select('id, full_name, created_at').limit(1) },
      { label: 'With age', query: supabase.from('patients').select('id, age, created_at').limit(1) },
      { label: 'With first_name, last_name', query: supabase.from('patients').select('id, first_name, last_name, created_at').limit(1) },
    ];

    const patientResults: any[] = [];
    for (const test of patientTests) {
      const result = await test.query;
      patientResults.push({
        label: test.label,
        error: result.error,
        success: !result.error,
        data: result.data,
        columns: result.data?.[0] ? Object.keys(result.data[0]) : []
      });
    }

    setPatientsSchema({
      tests: patientResults,
      insertTest: patientsInsertTest
    });

    // For ledger table, try different common column combinations
    const ledgerTests = [
      { label: 'All columns (*)', query: supabase.from('ledger').select('*').limit(1) },
      { label: 'With amount', query: supabase.from('ledger').select('id, amount, created_at').limit(1) },
      { label: 'With total', query: supabase.from('ledger').select('id, total, created_at').limit(1) },
      { label: 'With value', query: supabase.from('ledger').select('id, value, created_at').limit(1) },
      { label: 'With price', query: supabase.from('ledger').select('id, price, created_at').limit(1) },
      { label: 'Transaction fields', query: supabase.from('ledger').select('id, transaction_type, payment_method, created_at').limit(1) },
    ];

    const ledgerResults: any[] = [];
    for (const test of ledgerTests) {
      const result = await test.query;
      ledgerResults.push({
        label: test.label,
        error: result.error,
        success: !result.error,
        data: result.data,
        columns: result.data?.[0] ? Object.keys(result.data[0]) : []
      });
    }

    setLedgerSchema({
      tests: ledgerResults,
      insertTest: ledgerInsertTest
    });

    // Get all patients
    const allPatients = await supabase
      .from('patients')
      .select('*')
      .limit(10);
    setPatientsData(allPatients);

    // Get all ledger records
    const allLedger = await supabase
      .from('ledger')
      .select('*')
      .limit(10);
    setLedgerData(allLedger);

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Database Schema Debug</h1>
        
        <button
          onClick={checkSchema}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 mb-6"
        >
          {loading ? 'Checking...' : 'Check Schema'}
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patients Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Patients Table</h2>
            
            {patientsSchema?.insertTest && (
              <div className="mb-6 border-2 border-purple-300 bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-purple-900">Insert Test (reveals required fields)</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(patientsSchema.insertTest, null, 2)}
                </pre>
              </div>
            )}
            
            {Array.isArray(patientsSchema?.tests) ? (
              <div className="space-y-4">
                {patientsSchema.tests.map((test: any, idx: number) => (
                  <div key={idx} className={`border-2 rounded-lg p-4 ${test.success ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-lg font-semibold ${test.success ? 'text-green-900' : 'text-red-900'}`}>
                        {test.success ? '✓' : '✗'}
                      </span>
                      <h3 className="font-semibold text-slate-900">{test.label}</h3>
                    </div>
                    
                    {test.error && (
                      <div className="mb-2">
                        <p className="text-sm text-red-700 font-mono">
                          Error: {test.error.message}
                        </p>
                        {test.error.hint && (
                          <p className="text-xs text-red-600 mt-1">
                            Hint: {test.error.hint}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {test.columns.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-green-800 mb-1">Columns found:</p>
                        <p className="text-xs font-mono text-green-700">
                          {test.columns.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {patientsData && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-2 text-slate-800">All Data (up to 10 rows):</h3>
                <pre className="bg-slate-100 rounded p-3 text-xs overflow-auto max-h-96">
                  {JSON.stringify(patientsData, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Ledger Table</h2>
            
            {ledgerSchema?.insertTest && (
              <div className="mb-6 border-2 border-purple-300 bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-purple-900">Insert Test (reveals required fields)</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(ledgerSchema.insertTest, null, 2)}
                </pre>
              </div>
            )}
            
            {Array.isArray(ledgerSchema?.tests) ? (
              <div className="space-y-4">
                {ledgerSchema.tests.map((test: any, idx: number) => (
                  <div key={idx} className={`border-2 rounded-lg p-4 ${test.success ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-lg font-semibold ${test.success ? 'text-green-900' : 'text-red-900'}`}>
                        {test.success ? '✓' : '✗'}
                      </span>
                      <h3 className="font-semibold text-slate-900">{test.label}</h3>
                    </div>
                    
                    {test.error && (
                      <div className="mb-2">
                        <p className="text-sm text-red-700 font-mono">
                          Error: {test.error.message}
                        </p>
                        {test.error.hint && (
                          <p className="text-xs text-red-600 mt-1">
                            Hint: {test.error.hint}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {test.columns.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-green-800 mb-1">Columns found:</p>
                        <p className="text-xs font-mono text-green-700">
                          {test.columns.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {ledgerData && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-2 text-slate-800">All Data (up to 10 rows):</h3>
                <pre className="bg-slate-100 rounded p-3 text-xs overflow-auto max-h-96">
                  {JSON.stringify(ledgerData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
