'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Users as UsersIcon, UserPlus, Trash2, Loader2, Key, Copy, Check, Edit, X } from 'lucide-react';
import { createUser, checkIsAdmin, deleteUser, resetUserPassword, updateUserRole } from '@/app/actions/users';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
  full_name?: string;
}

const getRoleBadge = (role: string): { bg: string; color: string } => {
  switch (role) {
    case 'admin': return { bg: 'rgba(175, 82, 222, 0.15)', color: '#7a2aaa' };
    case 'staff': return { bg: 'rgba(0, 122, 255, 0.12)', color: 'var(--ios-blue)' };
    default: return { bg: 'rgba(52, 199, 89, 0.12)', color: '#1a7a30' };
  }
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '', role: 'staff' });
  const [submitting, setSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; role: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('staff');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, []);

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

  const fetchUsers = async () => {
    try {
      const supabase = createClient();
      const { data: usersData, error: usersError } = await supabase
        .from('user_roles_with_email')
        .select('user_id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      setUsers((usersData || []).map(u => ({
        id: u.user_id,
        email: u.email || 'No email',
        full_name: u.full_name,
        role: u.role,
        created_at: u.created_at,
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setCreatedUser(null);
    setSubmitting(true);

    const formDataObj = new FormData();
    formDataObj.append('email', formData.email);
    formDataObj.append('password', formData.password);
    formDataObj.append('full_name', formData.full_name);
    formDataObj.append('role', formData.role);

    const result = await createUser(formDataObj);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: result.message || 'User created successfully!' });
      setCreatedUser({ email: result.email!, password: result.password!, role: result.role! });
      setFormData({ email: '', password: '', full_name: '', role: 'staff' });
      fetchUsers();
    }
    setSubmitting(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user: ${email}?`)) return;
    setDeletingUserId(userId);
    const result = await deleteUser(userId);
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      setMessage({ type: 'success', text: result.message || 'User deleted' });
      fetchUsers();
    }
    setDeletingUserId(null);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId || !newPassword) return;
    const result = await resetUserPassword(resetPasswordUserId, newPassword);
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      setCreatedUser({
        email: users.find(u => u.id === resetPasswordUserId)?.email || '',
        password: result.newPassword!,
        role: users.find(u => u.id === resetPasswordUserId)?.role || '',
      });
      setMessage({ type: 'success', text: result.message || 'Password reset' });
      setResetPasswordUserId(null);
      setNewPassword('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleEditRole = async () => {
    if (!editRoleUserId) return;
    const result = await updateUserRole(editRoleUserId, newRole);
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      setMessage({ type: 'success', text: 'Role updated successfully' });
      fetchUsers();
      setEditRoleUserId(null);
    }
  };

  if (isAdmin === null || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent mx-auto mb-3"
            style={{ borderColor: 'var(--ios-blue)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Checking permissions…</p>
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
          <p className="text-sm" style={{ color: 'var(--ios-label-secondary)' }}>Admin permissions required. Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-blue)' }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--ios-label)' }}>User Management</h1>
          <p className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>Add and manage system users</p>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className="p-4 rounded-2xl mb-4 text-sm font-medium"
          style={{
            backgroundColor: message.type === 'success' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
            color: message.type === 'success' ? 'var(--ios-green)' : 'var(--ios-red)',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Created user credentials */}
      {createdUser && (
        <div className="ios-card rounded-2xl p-4 mb-5" style={{ border: '1px solid rgba(0, 122, 255, 0.2)' }}>
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--ios-blue)' }}>Share These Credentials</p>
          <div className="space-y-2">
            {[
              { label: 'Email', value: createdUser.email },
              { label: 'Role', value: createdUser.role },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2" style={{ borderBottom: '0.5px solid var(--ios-separator-opaque)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--ios-label-secondary)' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--ios-label)' }}>{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-medium" style={{ color: 'var(--ios-label-secondary)' }}>Password</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--ios-label)' }}>{createdUser.password}</span>
                <button
                  onClick={() => copyToClipboard(createdUser.password)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: copiedPassword ? 'var(--ios-green)' : 'var(--ios-blue)' }}
                >
                  {copiedPassword ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--ios-orange)' }}>Copy this password now — you won't see it again!</p>
        </div>
      )}

      {/* Create User */}
      <div className="mb-5">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base"
            style={{ backgroundColor: 'var(--ios-blue)' }}
          >
            <UserPlus size={20} />
            Create New User
          </button>
        ) : (
          <div className="ios-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '0.5px solid var(--ios-separator-opaque)' }}>
              <h2 className="text-base font-bold" style={{ color: 'var(--ios-label)' }}>New User</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="ios-input w-full"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="ios-input w-full"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="ios-input w-full"
                  placeholder="user@hospital.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="ios-input w-full"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--ios-label-secondary)' }}>Minimum 6 characters</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-3.5 rounded-2xl text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 rounded-2xl text-white text-base font-semibold disabled:opacity-40"
                  style={{ backgroundColor: 'var(--ios-blue)' }}
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--ios-label-secondary)' }}>
          Users ({users.length})
        </p>

        {users.length === 0 ? (
          <div className="ios-card rounded-2xl p-8 text-center">
            <UsersIcon size={36} className="mx-auto mb-3" style={{ color: 'var(--ios-label-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--ios-label-secondary)' }}>No users yet. Create your first user above.</p>
          </div>
        ) : (
          <div className="ios-card rounded-2xl overflow-hidden">
            {users.map((user, idx) => {
              const badge = getRoleBadge(user.role);
              return (
                <div key={user.id}>
                  {idx > 0 && (
                    <div className="mx-4" style={{ height: '0.5px', backgroundColor: 'var(--ios-separator-opaque)' }} />
                  )}
                  <div className="ios-list-row px-4 py-3.5">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: 'var(--ios-blue)' }}
                    >
                      {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ios-label)' }}>
                          {user.full_name || user.email}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: badge.bg, color: badge.color }}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--ios-label-secondary)' }}>{user.email}</p>
                      <p className="text-xs" style={{ color: 'var(--ios-label-tertiary)' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditRoleUserId(user.id); setNewRole(user.role); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(175, 82, 222, 0.1)', color: 'var(--ios-purple)' }}
                        title="Edit Role"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setResetPasswordUserId(user.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)', color: 'var(--ios-blue)' }}
                        title="Reset Password"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={deletingUserId === user.id}
                        className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
                        style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--ios-red)' }}
                        title="Delete User"
                      >
                        {deletingUserId === user.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Role Reference */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--ios-label-secondary)' }}>Role Reference</p>
        <div className="ios-card rounded-2xl overflow-hidden">
          {[
            {
              role: 'Admin', color: 'var(--ios-purple)', bg: 'rgba(175, 82, 222, 0.12)',
              perms: ['Full system access', 'Create users', 'Delete records', 'All features']
            },
            {
              role: 'Staff', color: 'var(--ios-blue)', bg: 'rgba(0, 122, 255, 0.1)',
              perms: ['Manage patients', 'Record transactions', 'View reports', 'Standard access']
            },
            {
              role: 'Receptionist', color: 'var(--ios-green)', bg: 'rgba(52, 199, 89, 0.1)',
              perms: ['Check-in patients', 'Search patients', 'Basic features', 'View only']
            },
          ].map((item, idx) => (
            <div key={item.role}>
              {idx > 0 && (
                <div className="mx-4" style={{ height: '0.5px', backgroundColor: 'var(--ios-separator-opaque)' }} />
              )}
              <div className="ios-list-row px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.bg }}>
                  <Shield size={16} style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ios-label)' }}>{item.role}</p>
                  <p className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>{item.perms.join(' · ')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Role Modal */}
      {editRoleUserId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ios-backdrop"
          onClick={() => setEditRoleUserId(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ boxShadow: 'var(--ios-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(175, 82, 222, 0.12)' }}>
                    <Edit size={16} style={{ color: 'var(--ios-purple)' }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: 'var(--ios-label)' }}>Edit Role</p>
                    <p className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>{users.find(u => u.id === editRoleUserId)?.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditRoleUserId(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}>
                  <X size={14} />
                </button>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="ios-input w-full"
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditRoleUserId(null)} className="flex-1 py-4 rounded-2xl text-base font-semibold" style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}>
                  Cancel
                </button>
                <button onClick={handleEditRole} className="flex-1 py-4 rounded-2xl text-white text-base font-semibold" style={{ backgroundColor: 'var(--ios-purple)' }}>
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUserId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ios-backdrop"
          onClick={() => { setResetPasswordUserId(null); setNewPassword(''); }}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ boxShadow: 'var(--ios-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}>
                    <Key size={16} style={{ color: 'var(--ios-blue)' }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: 'var(--ios-label)' }}>Reset Password</p>
                    <p className="text-xs" style={{ color: 'var(--ios-label-secondary)' }}>{users.find(u => u.id === resetPasswordUserId)?.email}</p>
                  </div>
                </div>
                <button onClick={() => { setResetPasswordUserId(null); setNewPassword(''); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label-secondary)' }}>
                  <X size={14} />
                </button>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ios-label-secondary)' }}>New Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="ios-input w-full"
                />
                <p className="mt-1.5 text-xs" style={{ color: 'var(--ios-label-secondary)' }}>Minimum 6 characters</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setResetPasswordUserId(null); setNewPassword(''); }}
                  className="flex-1 py-4 rounded-2xl text-base font-semibold"
                  style={{ backgroundColor: 'var(--ios-fill-tertiary)', color: 'var(--ios-label)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={newPassword.length < 6}
                  className="flex-1 py-4 rounded-2xl text-white text-base font-semibold disabled:opacity-40"
                  style={{ backgroundColor: 'var(--ios-blue)' }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
