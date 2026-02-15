'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, X, ArrowLeft, Home } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatPatientId } from '@/lib/utils';
import { REFERRAL_SOURCES, type ReferralSource } from '@/lib/constants';

interface Patient {
  id: number;
  file_number: number;
  full_name: string;
  phone: string | null;
  age: number | null;
  referral_source: string | null;
}

export default function PatientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicatePatient, setDuplicatePatient] = useState<Patient | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [referralSource, setReferralSource] = useState<ReferralSource>('Walk-in');

  // Search patients
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('patients')
        .select('id, file_number, full_name, phone, age, referral_source')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Search error:', error);
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Register new patient - handles form submission and duplicate checking
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      alert('Please enter patient name');
      return;
    }

    // Validate phone number format if provided
    if (phone.trim()) {
      const cleanPhone = phone.trim().replace(/\s/g, '');
      // Phone should be 10 digits (0XXXXXXXXX) or 12 digits with country code
      if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        alert('Please enter a valid phone number (10-13 digits)');
        return;
      }
      if (!/^\d+$/.test(cleanPhone)) {
        alert('Phone number should only contain digits');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // Check for duplicate patients - BOTH phone AND name must match
      if (phone.trim() && fullName.trim()) {
        const { data: existingPatients, error: checkError } = await supabase
          .from('patients')
          .select('id, file_number, full_name, phone, age, referral_source')
          .ilike('full_name', fullName.trim())
          .eq('phone', phone.trim());

        if (checkError) {
          console.error('Error checking for duplicates:', checkError);
          // Continue anyway if check fails
        } else if (existingPatients && existingPatients.length > 0) {
          // Show custom modal instead of browser confirm
          setDuplicatePatient(existingPatients[0]);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Start with minimal required data
      const insertData: Record<string, any> = {
        full_name: fullName.trim(),
      };

      // Only add optional fields if they have values
      if (phone.trim()) {
        insertData.phone = phone.trim();
      }
      
      if (age) {
        insertData.age = parseInt(age);
      }
      
      if (referralSource) {
        insertData.referral_source = referralSource;
      }

      const { data, error } = await supabase
        .from('patients')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Registration error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Show user-friendly error
        let errorMsg = 'Failed to register patient. ';
        if (error.message.includes('column')) {
          errorMsg += 'Database schema needs to be updated. Please run FIX_SCHEMA.sql';
        } else {
          errorMsg += error.message;
        }
        alert(errorMsg);
        return;
      }

      if (!data || !data.id) {
        console.error('No patient data returned:', data);
        alert('Patient may have been registered but ID was not returned. Check your database.');
        return;
      }

      console.log('Patient registered successfully:', data);
      console.log('Redirecting to patient ID:', data.id);

      // Redirect to patient profile
      router.push(`/patients/${data.id}`);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Failed to register patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle phone input - allow only digits and limit length
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits and limit to 13 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 13);
    setPhone(cleaned);
  };

  // Reset form
  const resetForm = () => {
    setFullName('');
    setPhone('');
    setAge('');
    setReferralSource('Walk-in');
  };

  // Close form
  const closeForm = () => {
    setShowRegisterForm(false);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Bar - Consistent with other pages */}
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Patient Check-In</h1>
          <p className="text-slate-600">Search for existing patients or register new ones</p>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone number..."
              className="w-full p-3 pl-14 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Register Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center gap-3 text-lg font-semibold transition-colors"
          >
            <UserPlus size={24} />
            Register New Patient
          </button>
        </div>

        {/* Register Form */}
        {showRegisterForm && (
          <div className="mb-8 bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">New Patient Registration</h2>
              <button
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-slate-700 font-medium mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter patient's full name"
                  className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-700 font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="e.g., 0700123456"
                  maxLength={13}
                  className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">10-13 digits only</p>
              </div>

              {/* Age */}
              <div>
                <label className="block text-slate-700 font-medium mb-2">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter age"
                  min="0"
                  max="150"
                  className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Referral Source */}
              <div>
                <label className="block text-slate-700 font-medium mb-2">Referral Source</label>
                <select
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value as ReferralSource)}
                  className="w-full p-3 text-lg border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {REFERRAL_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 p-3 text-lg border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 p-3 text-lg bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {searching ? 'Searching...' : `Found ${searchResults.length} patient(s)`}
            </h2>

            {searchResults.length === 0 && !searching && (
              <p className="text-slate-600 text-center py-8">
                No patients found matching "{searchQuery}"
              </p>
            )}

            <div className="space-y-3">
              {searchResults.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  className="w-full bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono font-semibold text-blue-600">
                          {formatPatientId(patient.file_number)}
                        </span>
                        <span className="text-lg font-bold text-slate-900">
                          {patient.full_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        {patient.phone && (
                          <span className="text-sm">{patient.phone}</span>
                        )}
                        {patient.age && (
                          <span className="text-sm">Age: {patient.age}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Patient Modal */}
      {duplicatePatient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setDuplicatePatient(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Patient Already Exists</h2>
              <p className="text-slate-600">A patient with this exact name and phone number is already registered.</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-slate-600">Name</p>
                  <p className="text-lg font-semibold text-slate-900">{duplicatePatient.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Phone</p>
                  <p className="text-lg font-semibold text-slate-900">{duplicatePatient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Patient ID</p>
                  <p className="text-lg font-mono font-semibold text-blue-600">{formatPatientId(duplicatePatient.file_number)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push(`/patients/${duplicatePatient.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors"
              >
                Open Patient Profile
              </button>
              <button
                onClick={() => setDuplicatePatient(null)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 p-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
