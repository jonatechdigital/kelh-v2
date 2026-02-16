'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Users as UsersIcon, UserPlus, Trash2, Loader2, Key, Copy, Check, Edit } from 'lucide-react';
import { createUser, checkIsAdmin, deleteUser, resetUserPassword } from '@/app/actions/users';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
  full_name?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff',
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; role: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('staff');

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log('Checking admin access...');
      const adminStatus = await checkIsAdmin();
      console.log('Admin status result:', adminStatus);
      setIsAdmin(adminStatus);
      if (!adminStatus) {
        console.log('Not admin, redirecting...');
        // Wait a bit before redirecting so we can see the error
        setTimeout(() => router.push('/'), 2000);
      }
    } catch (error) {
      console.error('Error checking admin:', error);
      setIsAdmin(false);
      setTimeout(() => router.push('/'), 2000);
    }
  };

  const fetchUsers = async () => {
    try {
      const supabase = createClient();
      
      // Fetch from view that includes email
      const { data: usersData, error: usersError } = await supabase
        .from('user_roles_with_email')
        .select('user_id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      const usersWithRoles = (usersData || []).map(u => ({
        id: u.user_id,
        email: u.email || 'No email',
        full_name: u.full_name,
        role: u.role,
        created_at: u.created_at,
      }));

      setUsers(usersWithRoles);
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
      // Show the created user details including password
      setCreatedUser({
        email: result.email!,
        password: result.password!,
        role: result.role!,
      });
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-8 bg-red-50 border border-red-200 rounded-xl">
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700 mb-4">You don't have admin permissions to access this page.</p>
          <p className="text-sm text-red-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Add and manage system users</p>
      </div>

      {/* Create User Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
            <p className="text-sm text-gray-600">Add a new user to the system</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@hospital.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                User Role
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="receptionist">Receptionist</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {createdUser && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">✅ User Created - Share These Credentials</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between bg-white p-2 rounded">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-mono font-semibold">{createdUser.email}</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2 rounded">
                  <span className="text-gray-600">Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{createdUser.password}</span>
                    <button
                      onClick={() => copyToClipboard(createdUser.password)}
                      className="p-1 hover:bg-blue-100 rounded"
                      title="Copy password"
                    >
                      {copiedPassword ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white p-2 rounded">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-semibold capitalize">{createdUser.role}</span>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">⚠️ Copy this password now - you won't be able to see it again!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {submitting ? 'Creating User...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* Current Users */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Current Users ({users.length})</h2>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No users yet. Create your first user above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase">Role</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase">Created</th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-900 font-medium">
                        {user.email}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-600">
                        {user.full_name || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : user.role === 'staff'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditRoleUserId(user.id);
                            setNewRole(user.role);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit Role"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setResetPasswordUserId(user.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={deletingUserId === user.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete User"
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editRoleUserId && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setEditRoleUserId(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Edit className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Role</h2>
                <p className="text-sm text-gray-600">
                  {users.find(u => u.id === editRoleUserId)?.email}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="editRole" className="block text-sm font-medium text-gray-700 mb-1">
                Select New Role
              </label>
              <select
                id="editRole"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="receptionist">Receptionist</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleEditRole}
                className="flex-1 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Update Role
              </button>
              <button
                onClick={() => setEditRoleUserId(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUserId && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setResetPasswordUserId(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-sm text-gray-600">
                  {users.find(u => u.id === resetPasswordUserId)?.email}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleResetPassword}
                disabled={newPassword.length < 6}
                className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                Reset Password
              </button>
              <button
                onClick={() => {
                  setResetPasswordUserId(null);
                  setNewPassword('');
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">Admin</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Full system access</li>
            <li>• Create users</li>
            <li>• Delete records</li>
            <li>• All features</li>
          </ul>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Staff</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Manage patients</li>
            <li>• Record transactions</li>
            <li>• View reports</li>
            <li>• Standard access</li>
          </ul>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900">Receptionist</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Check-in patients</li>
            <li>• Search patients</li>
            <li>• Basic features</li>
            <li>• View only</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
