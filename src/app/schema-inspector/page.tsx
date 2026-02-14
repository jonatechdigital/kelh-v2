'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function SchemaInspectorPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const inspectSchema = async () => {
    setLoading(true);
    const supabase = createClient();

    // Query the information schema to get column definitions
    const patientsColumns = await supabase.rpc('get_table_columns', { table_name: 'patients' });
    const ledgerColumns = await supabase.rpc('get_table_columns', { table_name: 'ledger' });

    // Alternative: Try to insert a test record to see what columns are required
    // This will fail but give us the column names
    const patientsInsertTest = await supabase
      .from('patients')
      .insert({})
      .select();

    const ledgerInsertTest = await supabase
      .from('ledger')
      .insert({})
      .select();

    setResults({
      patientsColumns,
      ledgerColumns,
      patientsInsertTest,
      ledgerInsertTest
    });

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Schema Inspector</h1>
        
        <button
          onClick={inspectSchema}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 mb-6"
        >
          {loading ? 'Inspecting...' : 'Inspect Schema'}
        </button>

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Results</h2>
              <pre className="bg-slate-100 rounded p-4 text-xs overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-2">What we know so far:</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Patients table:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li>✓ Has: <code className="bg-slate-200 px-1 rounded">full_name</code></li>
              <li>✓ Has: <code className="bg-slate-200 px-1 rounded">age</code></li>
              <li>✗ Missing: <code className="bg-red-200 px-1 rounded">name</code></li>
            </ul>
            
            <p className="mt-4"><strong>Ledger table:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li>✓ Has: <code className="bg-slate-200 px-1 rounded">transaction_type</code></li>
              <li>✓ Has: <code className="bg-slate-200 px-1 rounded">payment_method</code></li>
              <li>✗ Missing: <code className="bg-red-200 px-1 rounded">amount</code></li>
              <li className="text-red-700 font-semibold">⚠️ Need to find the amount column name!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
