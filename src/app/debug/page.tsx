'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function DebugPage() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTests = async () => {
    setTesting(true);
    const supabase = createClient();
    const testResults: any = {
      connection: null,
      patientsTable: null,
      ledgerTable: null,
      samplePatient: null,
      errors: []
    };

    try {
      // Test 1: Connection
      console.log('Testing Supabase connection...');
      const { data: connectionTest, error: connError } = await supabase
        .from('patients')
        .select('count')
        .limit(1);
      
      if (connError) {
        testResults.connection = `❌ Failed: ${connError.message}`;
        testResults.errors.push(connError);
      } else {
        testResults.connection = '✅ Connected';
      }

      // Test 2: Patients table structure
      console.log('Testing patients table...');
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, file_number, full_name, phone, age, referral_source, created_at')
        .limit(1);
      
      if (patientsError) {
        testResults.patientsTable = `❌ Error: ${patientsError.message}`;
        testResults.errors.push(patientsError);
      } else {
        testResults.patientsTable = `✅ Working (${patientsData?.length || 0} records)`;
        testResults.samplePatient = patientsData?.[0] || null;
      }

      // Test 3: Ledger table structure
      console.log('Testing ledger table...');
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('ledger')
        .select('id, transaction_type, amount, payment_method, service_category, doctor, description')
        .limit(1);
      
      if (ledgerError) {
        testResults.ledgerTable = `❌ Error: ${ledgerError.message}`;
        testResults.errors.push(ledgerError);
      } else {
        testResults.ledgerTable = `✅ Working (${ledgerData?.length || 0} records)`;
      }

      // Test 4: Try to insert a test patient
      console.log('Testing patient insertion...');
      const testPatientName = `Test Patient ${Date.now()}`;
      const { data: insertData, error: insertError } = await supabase
        .from('patients')
        .insert({
          full_name: testPatientName,
          phone: '0700000000',
          age: 25,
          referral_source: 'Walk-in'
        })
        .select()
        .single();

      if (insertError) {
        testResults.insertTest = `❌ Failed: ${insertError.message}`;
        testResults.errors.push(insertError);
      } else if (!insertData || !insertData.id) {
        testResults.insertTest = `❌ No ID returned`;
      } else {
        testResults.insertTest = `✅ Success! Created patient ID: ${insertData.id}`;
        testResults.testPatientId = insertData.id;
        
        // Clean up - delete the test patient
        await supabase.from('patients').delete().eq('id', insertData.id);
      }

    } catch (error) {
      console.error('Test error:', error);
      testResults.errors.push(error);
    }

    setResults(testResults);
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Debug & Test Page</h1>
          <p className="text-slate-600">
            Test your database connection and schema
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={testing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {testing ? 'Running Tests...' : 'Run Database Tests'}
          </button>
        </div>

        {results && (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mb-2">Connection Status</h3>
              <p className="font-mono">{results.connection}</p>
            </div>

            {/* Patients Table */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mb-2">Patients Table</h3>
              <p className="font-mono">{results.patientsTable}</p>
              {results.samplePatient && (
                <div className="mt-2 p-2 bg-white rounded">
                  <p className="text-sm text-slate-600">Sample Record:</p>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(results.samplePatient, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Ledger Table */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mb-2">Ledger Table</h3>
              <p className="font-mono">{results.ledgerTable}</p>
            </div>

            {/* Insert Test */}
            {results.insertTest && (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-2">Patient Registration Test</h3>
                <p className="font-mono">{results.insertTest}</p>
                {results.testPatientId && (
                  <p className="text-sm text-slate-600 mt-2">
                    (Test patient was created and deleted successfully)
                  </p>
                )}
              </div>
            )}

            {/* Errors */}
            {results.errors.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-2">Errors Found</h3>
                <div className="space-y-2">
                  {results.errors.map((error: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p className="font-semibold text-red-800">{error.message}</p>
                      {error.hint && <p className="text-red-600">Hint: {error.hint}</p>}
                      {error.details && <p className="text-red-600">Details: {error.details}</p>}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-red-100 rounded">
                  <p className="text-red-900 font-semibold mb-2">Action Required:</p>
                  <p className="text-sm text-red-800">
                    Run <code className="bg-red-200 px-2 py-1 rounded">FIX_SCHEMA.sql</code> in your Supabase SQL Editor
                  </p>
                </div>
              </div>
            )}

            {/* Success */}
            {results.errors.length === 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-2">✅ All Tests Passed!</h3>
                <p className="text-green-800">Your database is configured correctly.</p>
                <div className="mt-4">
                  <Link
                    href="/patients"
                    className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    Go to Patient Check-In →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
          <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Link href="/" className="block text-blue-600 hover:underline">
              → Dashboard
            </Link>
            <Link href="/patients" className="block text-blue-600 hover:underline">
              → Patient Check-In
            </Link>
            <Link href="/schema-check" className="block text-blue-600 hover:underline">
              → Schema Checker
            </Link>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              → Supabase Dashboard ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
