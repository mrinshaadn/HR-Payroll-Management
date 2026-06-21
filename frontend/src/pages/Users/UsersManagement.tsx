import React, { useState, useEffect } from 'react';
import { useHR } from '../../context/HRContext';
import { api } from '../../services/api';
import { employeeService } from '../../services/employeeService';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Key, 
  Plus, 
  X,
  Lock,
  Mail,
  User,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  is_active: boolean;
  date_joined: string;
}

export default function UsersManagement() {
  const { addNotification } = useHR();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<UserItem | null>(null);

  // Form states - Create User
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'HR' | 'EMPLOYEE'>('HR');
  const [deptId, setDeptId] = useState('');
  const [desigId, setDesigId] = useState('');

  // Dropdown options
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  // Form states - Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const loadUsersData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.get('/accounts/users/');
      setUsers(response.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setErrorMsg('Failed to fetch user database. Access restricted to System Admins.');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const depts = await employeeService.getDepartments();
      setDepartments(depts);
      const desigs = await api.get('/designations/');
      setDesignations(desigs.data.results || desigs.data);
    } catch (err) {
      console.error('Failed to load metadata dropdowns:', err);
    }
  };

  useEffect(() => {
    loadUsersData();
    loadMetadata();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (password !== confirmPassword) {
      addNotification('Passwords do not match.', 'error');
      return;
    }
    setAddLoading(true);

    try {
      const payload: any = {
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        password,
        confirm_password: confirmPassword,
        role
      };

      if (role === 'EMPLOYEE') {
        if (deptId) payload.department = Number(deptId);
        if (desigId) payload.designation = Number(desigId);
      }

      const response = await api.post('/accounts/users/', payload);
      if (response.data) {
        addNotification(`User account ${username} created successfully!`, 'success');
        setShowAddModal(false);
        // Reset states
        setFirstName('');
        setLastName('');
        setEmail('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setRole('HR');
        setDeptId('');
        setDesigId('');
        loadUsersData();
      }
    } catch (err: any) {
      console.error('Create user failed:', err);
      const serverErr = err.response?.data;
      const detail = serverErr?.detail || Object.values(serverErr || {}).flat().join(', ') || 'Failed to create user account.';
      addNotification(detail, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleActive = async (userItem: UserItem) => {
    try {
      const response = await api.post(`/accounts/users/${userItem.id}/toggle-active/`);
      if (response.data) {
        const action = response.data.is_active ? 'activated' : 'deactivated';
        addNotification(`User ${userItem.username} has been ${action}.`, 'success');
        loadUsersData();
      }
    } catch (err: any) {
      console.error('Failed to toggle active state:', err);
      addNotification(err.response?.data?.detail || 'Permission denied.', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;
    if (newPassword !== confirmNewPassword) {
      addNotification('Passwords do not match.', 'error');
      return;
    }
    setResetLoading(true);

    try {
      const response = await api.post(`/accounts/users/${showResetModal.id}/reset-password/`, {
        new_password: newPassword,
        confirm_password: confirmNewPassword
      });
      if (response.data) {
        addNotification(`Password for ${showResetModal.username} reset successfully.`, 'success');
        setShowResetModal(null);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      console.error('Password reset failed:', err);
      addNotification(err.response?.data?.detail || 'Failed to reset password.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const nameMatch = 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const roleMatch = selectedRole === 'All' || u.role === selectedRole;
    return nameMatch && roleMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Shield className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <span>Enterprise User Management</span>
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            System Administrators console to configure accounts, assign roles, reset security codes, and activate/deactivate accounts.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowAddModal(true);
          }}
          className="inline-flex h-10 items-center space-x-2 rounded-lg bg-indigo-600 px-5 text-sm font-extrabold text-white hover:bg-indigo-700 shadow-md transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Account</span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm font-bold text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-605" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm grid gap-4 md:grid-cols-4">
        
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by username, email or full name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-950"
          />
        </div>

        {/* Role filter */}
        <div className="relative">
          <Filter className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-950"
          >
            <option value="All" className="dark:bg-slate-900">All System Roles</option>
            <option value="ADMIN" className="dark:bg-slate-900">ADMIN</option>
            <option value="HR" className="dark:bg-slate-900">HR</option>
            <option value="EMPLOYEE" className="dark:bg-slate-900">EMPLOYEE</option>
          </select>
        </div>

        {/* Total Users stats banner */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-750">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold uppercase">Listed users</span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{filteredUsers.length}</span>
        </div>

      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-200">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
                <th className="px-6 py-4.5">Account User</th>
                <th className="px-6 py-4.5">Email Address</th>
                <th className="px-6 py-4.5">Role Assignment</th>
                <th className="px-6 py-4.5">Membership Date</th>
                <th className="px-6 py-4.5">Account Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-extrabold text-slate-800 dark:divide-slate-800/60 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-bold dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Activity className="h-7 w-7 animate-spin text-indigo-600" />
                      <span className="text-slate-900 dark:text-white">Retrieving corporate accounts database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-all duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-750 dark:text-slate-250 uppercase border border-slate-200 dark:border-slate-700">
                          {u.username ? u.username[0] : 'U'}
                        </div>
                        <div>
                          <p className="text-slate-950 dark:text-white font-bold text-sm tracking-tight">{u.first_name} {u.last_name}</p>
                          <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-medium">
                      {u.email}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-black border ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900'
                          : u.role === 'HR'
                          ? 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                          : 'bg-slate-100 text-slate-950 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}>
                        <span>{u.role}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono font-semibold">
                      {new Date(u.date_joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs font-extrabold border ${
                        u.is_active 
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-305 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                          : 'bg-rose-100 text-rose-955 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                      }`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-2 rounded-lg border transition ${
                          u.is_active
                            ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-400'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-400'
                        }`}
                        title={u.is_active ? "Deactivate User" : "Activate User"}
                      >
                        {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => setShowResetModal(u)}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-650 dark:bg-slate-800 dark:hover:bg-indigo-950/40 dark:border-slate-700 dark:hover:border-indigo-900 transition"
                        title="Reset User Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-bold dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="h-10 w-10 text-slate-300" />
                      <span className="text-slate-900 dark:text-white">No user accounts found matching query filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center">
                <Plus className="h-5 w-5 text-indigo-605 mr-2" />
                <span>Create New User Account</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">First Name *</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Connor"
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Email Address *</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.connor@corporate.com"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Username *</label>
                <div className="relative mt-1.5">
                  <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="sarahconnor"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Password *</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 chars"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Confirm Password *</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm security code"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Role Assignment *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-950 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white"
                >
                  <option value="HR" className="dark:bg-slate-900">HR</option>
                  <option value="EMPLOYEE" className="dark:bg-slate-900">EMPLOYEE</option>
                  <option value="ADMIN" className="dark:bg-slate-900">ADMIN</option>
                </select>
              </div>

              {role === 'EMPLOYEE' && (
                <div className="grid gap-4 grid-cols-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-850">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-750 dark:text-slate-300">Department</label>
                    <select
                      value={deptId}
                      onChange={(e) => setDeptId(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                    >
                      <option value="" className="dark:bg-slate-900">None</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id} className="dark:bg-slate-900">{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-750 dark:text-slate-300">Designation</label>
                    <select
                      value={desigId}
                      onChange={(e) => setDesigId(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                    >
                      <option value="" className="dark:bg-slate-900">None</option>
                      {designations
                        .filter(d => !deptId || d.department === Number(deptId))
                        .map(d => (
                          <option key={d.id} value={d.id} className="dark:bg-slate-900">{d.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-3 flex space-x-3.5">
                <button
                  type="button"
                  disabled={addLoading}
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-750 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-xs font-black hover:bg-indigo-700 shadow-md transition disabled:opacity-40"
                >
                  {addLoading ? 'Saving Account...' : 'Create Account'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider">Reset Account Password</h3>
              <button onClick={() => { setShowResetModal(null); setNewPassword(''); setConfirmNewPassword(''); }} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-750 text-xs text-slate-600 dark:text-slate-300">
                Resetting password for user: <span className="font-extrabold">@{showResetModal.username}</span> ({showResetModal.first_name} {showResetModal.last_name})
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">New Password *</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Confirm New Password *</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Verify code sequence"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-white"
                  />
                </div>
              </div>

              {resetLoading && (
                <p className="text-xs text-indigo-605 font-bold animate-pulse">Saving updated password code...</p>
              )}

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={() => {
                    setShowResetModal(null);
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-750 hover:bg-slate-55 dark:border-slate-700 dark:text-slate-300"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-xs font-black disabled:opacity-40"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
