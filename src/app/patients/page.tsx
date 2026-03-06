'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, X, ChevronRight, ArrowLeft } from 'lucide-react';
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

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [referralSource, setReferralSource] = useState<ReferralSource>('Walk-in');

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

      if (error) { console.error('Search error:', error); return; }
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { alert('Please enter patient name'); return; }

    if (phone.trim()) {
      const cleanPhone = phone.trim().replace(/\s/g, '');
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

      if (phone.trim() && fullName.trim()) {
        const { data: existingPatients, error: checkError } = await supabase
          .from('patients')
          .select('id, file_number, full_name, phone, age, referral_source')
          .ilike('full_name', fullName.trim())
          .eq('phone', phone.trim());

        if (!checkError && existingPatients && existingPatients.length > 0) {
          setDuplicatePatient(existingPatients[0]);
          setIsSubmitting(false);
          return;
        }
      }

      const insertData: Record<string, any> = { full_name: fullName.trim() };
      if (phone.trim()) insertData.phone = phone.trim();
      if (age) insertData.age = parseInt(age);
      if (referralSource) insertData.referral_source = referralSource;

      const { data, error } = await supabase.from('patients').insert(insertData).select().single();

      if (error) {
        let errorMsg = 'Failed to register patient. ';
        if (error.message.includes('column')) {
          errorMsg += 'Database schema needs to be updated.';
        } else {
          errorMsg += error.message;
        }
        alert(errorMsg);
        return;
      }

      if (!data || !data.id) {
        alert('Patient may have been registered but ID was not returned.');
        return;
      }

      router.push(`/patients/${data.id}`);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Failed to register patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 13);
    setPhone(cleaned);
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setAge('');
    setReferralSource('Walk-in');
  };

  const closeForm = () => {
    setShowRegisterForm(false);
    resetForm();
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-blue)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ios-label)' }}>Patient Check-In</h1>
          <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Search or register patients</p>
        </div>
      </div>

      {/* iOS Search Bar */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          size={18}
          style={{ color: 'var(--ios-label-secondary)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full pl-10 pr-4 py-3 rounded-xl text-base"
          style={{
            backgroundColor: 'rgba(118, 118, 128, 0.12)',
            border: 'none',
            outline: 'none',
            color: 'var(--ios-label)',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--ios-label-secondary)', color: 'white' }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="mb-5">
          {searching ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--ios-label-secondary)' }}>Searching…</p>
          ) : searchResults.length === 0 ? (
            <div className="ios-card rounded-2xl p-6 text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--ios-label-secondary)' }}>No patients found for "{searchQuery}"</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide px-1 mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </p>
              <div className="ios-card rounded-2xl overflow-hidden">
                {searchResults.map((patient, idx) => (
                  <div key={patient.id}>
                    {idx > 0 && (
                      <div className="mx-4" style={{ height: '0.5px', backgroundColor: 'var(--ios-separator-opaque)' }} />
                    )}
                    <button
                      onClick={() => router.push(`/patients/${patient.id}`)}
                      className="w-full ios-list-row px-4 py-3.5 text-left flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: 'var(--ios-blue)' }}
                      >
                        {patient.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ios-label)' }}>
                          {patient.full_name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--ios-label-secondary)' }}>
                          {formatPatientId(patient.file_number)}
                          {patient.phone && ` · ${patient.phone}`}
                          {patient.age && ` · Age ${patient.age}`}
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--ios-label-tertiary)' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Register New Patient Button */}
      {!showRegisterForm && (
        <button
          onClick={() => setShowRegisterForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base transition-opacity active:opacity-80"
          style={{ backgroundColor: 'var(--ios-blue)' }}
        >
          <UserPlus size={20} />
          Register New Patient
        </button>
      )}

      {/* Register Form — iOS Card */}
      {showRegisterForm && (
        <div className="ios-card rounded-2xl overflow-hidden">
          {/* Form Header */}
          <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '0.5px solid var(--ios-separator-opaque)' }}>
            <h2 className="text-base font-bold" style={{ color: 'var(--ios-label)' }}>New Patient Registration</h2>
            <button
              onClick={closeForm}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleRegister} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                Full Name <span style={{ color: 'var(--ios-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter patient's full name"
                className="ios-input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="e.g., 0700123456"
                maxLength={13}
                className="ios-input w-full"
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--ios-label-secondary)' }}>10–13 digits only</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter age"
                min="0"
                max="150"
                className="ios-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>
                Referral Source
              </label>
              <select
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value as ReferralSource)}
                className="ios-input w-full"
                style={{ cursor: 'pointer' }}
              >
                {REFERRAL_SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-3.5 rounded-2xl text-base font-semibold transition-opacity active:opacity-80"
                style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 rounded-2xl text-white text-base font-semibold transition-opacity active:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: 'var(--ios-green)' }}
              >
                {isSubmitting ? 'Registering…' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Duplicate Patient Modal */}
      {duplicatePatient && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ios-backdrop"
          onClick={() => setDuplicatePatient(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ boxShadow: 'var(--ios-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(255, 149, 0, 0.12)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--ios-orange)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--ios-label)' }}>Patient Already Exists</h2>
                <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>A patient with this name and phone is already registered.</p>
              </div>

              <div className="rounded-2xl p-4 mb-5 space-y-3" style={{ backgroundColor: 'var(--ios-bg)' }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--ios-label-secondary)' }}>Name</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{duplicatePatient.full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--ios-label-secondary)' }}>Phone</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--ios-label)' }}>{duplicatePatient.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--ios-label-secondary)' }}>Patient ID</p>
                  <p className="text-base font-mono font-bold" style={{ color: 'var(--ios-blue)' }}>{formatPatientId(duplicatePatient.file_number)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/patients/${duplicatePatient.id}`)}
                  className="w-full py-4 rounded-2xl text-white text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-blue)' }}
                >
                  Open Patient Profile
                </button>
                <button
                  onClick={() => setDuplicatePatient(null)}
                  className="w-full py-4 rounded-2xl text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
