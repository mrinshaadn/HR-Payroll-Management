import React, { useState, useEffect } from 'react';
import { useHR } from '../../context/HRContext';
import { api } from '../../services/api';
import { employeeService } from '../../services/employeeService';
import { 
  Users, 
  Search, 
  Filter, 
  Key, 
  Plus, 
  X,
  Lock,
  Mail,
  User,
  Activity,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit3,
  Eye,
  Phone,
  Calendar,
  Building,
  UserCheck,
  UserX
} from 'lucide-react';

interface HRItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  department: {
    id: number;
    name: string;
  } | null;
  designation: {
    id: number;
    name: string;
  } | null;
  status: 'Active' | 'Inactive';
  is_active: boolean;
  joining_date: string | null;
  last_login: string | null;
  date_joined: string;
  employee_id: string | null;
}

export default function HRManagement() {
  const { addNotification } = useHR();
  const [hrList, setHrList] = useState<HRItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<HRItem | null>(null);
  const [showViewModal, setShowViewModal] = useState<HRItem | null>(null);
  const [showResetModal, setShowResetModal] = useState<HRItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<HRItem | null>(null);

  // Form states - Create/Edit HR
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [deptId, setDeptId] = useState('');
  const [desigId, setDesigId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  const loadHRData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.get('/hr/');
      setHrList(response.data);
    } catch (err: any) {
      console.error('Failed to load HR team:', err);
      setErrorMsg('Failed to fetch HR team database. Access restricted to System Admins.');
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
      console.error('Failed to load department/designation dropdowns:', err);
    }
  };

  useEffect(() => {
    loadHRData();
    loadMetadata();
  }, []);

  const handleCreateHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addNotification('Passwords do not match.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        phone_number: phone,
        department: Number(deptId),
        designation: Number(desigId),
        joining_date: joiningDate || undefined,
        password,
        confirm_password: confirmPassword
      };

      const response = await api.post('/hr/', payload);
      if (response.data) {
        addNotification(`HR user account ${username} created successfully!`, 'success');
        setShowAddModal(false);
        // Clear fields
        resetFormStates();
        loadHRData();
      }
    } catch (err: any) {
      console.error('Create HR failed:', err);
      const serverErr = err.response?.data;
      const detail = serverErr?.detail || Object.values(serverErr || {}).flat().join(', ') || 'Failed to create HR account.';
      addNotification(detail, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setActionLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        phone_number: phone,
        department: Number(deptId),
        designation: Number(desigId),
        joining_date: joiningDate || undefined,
      };

      const response = await api.put(`/hr/${showEditModal.id}/`, payload);
      if (response.data) {
        addNotification(`HR user account ${username} updated successfully!`, 'success');
        setShowEditModal(null);
        resetFormStates();
        loadHRData();
      }
    } catch (err: any) {
      console.error('Update HR failed:', err);
      const serverErr = err.response?.data;
      const detail = serverErr?.detail || Object.values(serverErr || {}).flat().join(', ') || 'Failed to update HR account.';
      addNotification(detail, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHR = async () => {
    if (!showDeleteConfirm) return;
    setActionLoading(true);
    try {
      await api.delete(`/hr/${showDeleteConfirm.id}/`);
      addNotification(`HR user ${showDeleteConfirm.username} deleted successfully.`, 'success');
      setShowDeleteConfirm(null);
      loadHRData();
    } catch (err: any) {
      console.error('Delete HR failed:', err);
      addNotification(err.response?.data?.detail || 'Failed to delete HR account.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (hr: HRItem) => {
    try {
      const response = await api.patch(`/hr/${hr.id}/status/`);
      if (response.data) {
        const action = response.data.is_active ? 'activated' : 'deactivated';
        addNotification(`HR account ${hr.username} has been ${action}.`, 'success');
        loadHRData();
      }
    } catch (err: any) {
      console.error('Failed to toggle active state:', err);
      addNotification(err.response?.data?.detail || 'Permission denied.', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;
    if (password !== confirmPassword) {
      addNotification('Passwords do not match.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      // Use the accounts password reset endpoint
      await api.post(`/accounts/users/${showResetModal.id}/reset-password/`, {
        new_password: password,
        confirm_password: confirmPassword
      });
      addNotification(`Password for ${showResetModal.username} reset successfully.`, 'success');
      setShowResetModal(null);
      resetFormStates();
    } catch (err: any) {
      console.error('Password reset failed:', err);
      addNotification(err.response?.data?.detail || 'Failed to reset password.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const resetFormStates = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setPhone('');
    setDeptId('');
    setDesigId('');
    setJoiningDate('');
    setPassword('');
    setConfirmPassword('');
  };

  const openEditModal = (hr: HRItem) => {
    setFirstName(hr.first_name);
    setLastName(hr.last_name);
    setEmail(hr.email);
    setUsername(hr.username);
    setPhone(hr.phone);
    setDeptId(hr.department ? String(hr.department.id) : '');
    setDesigId(hr.designation ? String(hr.designation.id) : '');
    setJoiningDate(hr.joining_date || '');
    setShowEditModal(hr);
  };

  const filteredHR = hrList.filter(hr => {
    const nameMatch = 
      hr.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hr.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hr.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hr.employee_id && hr.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const statusMatch = selectedStatus === 'All' || 
      (selectedStatus === 'Active' && hr.is_active) ||
      (selectedStatus === 'Inactive' && !hr.is_active);

    const deptMatch = selectedDept === 'All' || 
      (hr.department && String(hr.department.id) === selectedDept);

    return nameMatch && statusMatch && deptMatch;
  });

  // Calculate statistics
  const totalHR = hrList.length;
  const activeHR = hrList.filter(h => h.is_active).length;
  const inactiveHR = totalHR - activeHR;
  
  // New HR in last 30 days
  const newHR = hrList.filter(h => {
    const dateJoined = new Date(h.date_joined);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return dateJoined >= thirtyDaysAgo;
  }).length;

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <span>HR Management</span>
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Create, update, deactivate, reset credentials and manage HR department team members separately from regular employees.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            resetFormStates();
            setShowAddModal(true);
          }}
          className="inline-flex h-10 items-center space-x-2 rounded-lg bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700 shadow-md transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Add HR User</span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm font-bold text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">Total HR staff</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalHR}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-450">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">Active HR</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeHR}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-450">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">Inactive HR</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-455 mt-1">{inactiveHR}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-450">
            <UserX className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">New HR (30d)</p>
            <h3 className="text-2xl font-black text-indigo-605 dark:text-indigo-400 mt-1">{newHR}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-450">
            <Activity className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm grid gap-4 md:grid-cols-4">
        
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, username, email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-605 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-805 dark:text-white"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-605 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-805 dark:text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Department filter */}
        <div className="relative">
          <Building className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-605 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-805 dark:text-white"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* HR Table List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-705 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
                <th className="px-6 py-4.5">HR User / ID</th>
                <th className="px-6 py-4.5">Email / Phone</th>
                <th className="px-6 py-4.5">Department</th>
                <th className="px-6 py-4.5">Joining Date</th>
                <th className="px-6 py-4.5">Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-extrabold text-slate-800 dark:divide-slate-800/60 dark:text-slate-305">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-bold dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Activity className="h-7 w-7 animate-spin text-blue-600" />
                      <span className="text-slate-900 dark:text-white">Retrieving HR database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHR.length > 0 ? (
                filteredHR.map((hr) => (
                  <tr key={hr.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-all duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center font-black text-blue-700 dark:text-blue-300 uppercase border border-blue-100 dark:border-blue-900">
                          {hr.username ? hr.username[0] : 'H'}
                        </div>
                        <div>
                          <p className="text-slate-950 dark:text-white font-bold text-sm tracking-tight">{hr.full_name}</p>
                          <p className="text-[10px] text-slate-450 dark:text-slate-400 font-mono">
                            ID: <span className="font-bold text-blue-605">{hr.employee_id || 'Generating...'}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-slate-900 dark:text-slate-200 font-medium">{hr.email}</p>
                      {hr.phone && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{hr.phone}</p>}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-slate-950 dark:text-white font-semibold">{hr.department?.name || 'Unassigned'}</p>
                      {hr.designation?.name && <p className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5">{hr.designation?.name}</p>}
                    </td>

                    <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-mono font-semibold">
                      {hr.joining_date ? new Date(hr.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs font-extrabold border ${
                        hr.is_active 
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                          : 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                      }`}>
                        {hr.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setShowViewModal(hr)}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-405 dark:hover:text-white transition"
                        title="View Profile Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => openEditModal(hr)}
                        className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-600 hover:text-blue-805 dark:bg-blue-950/30 dark:border-blue-900/60 dark:text-blue-400 transition"
                        title="Edit Account Details"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleToggleActive(hr)}
                        className={`p-2 rounded-lg border transition ${
                          hr.is_active
                            ? 'bg-amber-50 hover:bg-amber-100 border-amber-205 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-400'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-205 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-400'
                        }`}
                        title={hr.is_active ? "Deactivate HR User" : "Activate HR User"}
                      >
                        {hr.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => { resetFormStates(); setShowResetModal(hr); }}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-650 dark:bg-slate-805 dark:border-slate-700 dark:text-slate-400 transition"
                        title="Reset Account Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setShowDeleteConfirm(hr)}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 hover:text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-400 transition"
                        title="Delete HR User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-550 font-bold dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertTriangle className="h-10 w-10 text-slate-300" />
                      <span className="text-slate-900 dark:text-white">No HR accounts found matching filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl border border-slate-205 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-805">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center">
                <Plus className="h-5 w-5 text-blue-600 mr-2" />
                <span>Create HR Account</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHR} className="mt-4 space-y-4">
              
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">First Name *</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Email Address *</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@enterprise.com"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Username *</label>
                  <div className="relative mt-1.5">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="janedoe"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Phone Number</label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Joining Date</label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Department *</label>
                  <select
                    required
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Designation *</label>
                  <select
                    required
                    value={desigId}
                    onChange={(e) => setDesigId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                  >
                    <option value="">Select Designation</option>
                    {designations
                      .filter(d => !deptId || d.department === Number(deptId))
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Password *</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Confirm Password *</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex space-x-3.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-xs font-black hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                >
                  {actionLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl border border-slate-205 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-805">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center">
                <Edit3 className="h-5 w-5 text-blue-605 mr-2" />
                <span>Edit HR Account Details</span>
              </h3>
              <button onClick={() => setShowEditModal(null)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditHR} className="mt-4 space-y-4">
              
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">First Name *</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Email Address *</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Username *</label>
                  <div className="relative mt-1.5">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Phone Number</label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Joining Date</label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Department *</label>
                  <select
                    required
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Designation *</label>
                  <select
                    required
                    value={desigId}
                    onChange={(e) => setDesigId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                  >
                    <option value="">Select Designation</option>
                    {designations
                      .filter(d => !deptId || d.department === Number(deptId))
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex space-x-3.5">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-700 hover:bg-slate-55 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-xs font-black hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                >
                  {actionLoading ? 'Updating User...' : 'Update Details'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-205 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span>HR User Profile Info</span>
              </h3>
              <button onClick={() => setShowViewModal(null)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center space-x-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="h-14 w-14 rounded-full bg-blue-105 dark:bg-blue-950 flex items-center justify-center font-black text-xl text-blue-700 dark:text-blue-300 uppercase border border-blue-200">
                  {showViewModal.username ? showViewModal.username[0] : 'H'}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-950 dark:text-white leading-tight">{showViewModal.full_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">ID: <span className="font-bold text-blue-600">{showViewModal.employee_id || 'Generating...'}</span></p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Role: HR Specialist</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Username</span>
                  <span className="text-slate-900 dark:text-white font-mono">@{showViewModal.username}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Email Address</span>
                  <span className="text-slate-900 dark:text-white font-medium">{showViewModal.email}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Phone number</span>
                  <span className="text-slate-900 dark:text-white font-mono">{showViewModal.phone || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Department</span>
                  <span className="text-slate-900 dark:text-white">{showViewModal.department?.name || 'Unassigned'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Designation</span>
                  <span className="text-slate-900 dark:text-white">{showViewModal.designation?.name || 'Unassigned'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Joining Date</span>
                  <span className="text-slate-900 dark:text-white font-mono">{showViewModal.joining_date ? new Date(showViewModal.joining_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Account Created</span>
                  <span className="text-slate-900 dark:text-white font-mono">{new Date(showViewModal.date_joined).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Last Login Activity</span>
                  <span className="text-slate-900 dark:text-white font-mono">
                    {showViewModal.last_login ? new Date(showViewModal.last_login).toLocaleString() : 'Never logged in'}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Operational Status</span>
                  <span className={`inline-flex rounded-md px-2 py-0.5 font-bold ${
                    showViewModal.is_active ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-955'
                  }`}>
                    {showViewModal.is_active ? 'Active Staff' : 'Deactivated / Suspended'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(null)}
                className="w-full mt-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-white text-slate-800 rounded-xl py-3 text-xs font-black shadow-xs"
              >
                Close Profile Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-805 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider">Reset HR Password</h3>
              <button onClick={() => { setShowResetModal(null); resetFormStates(); }} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300">
                Resetting password for user: <span className="font-extrabold">@{showResetModal.username}</span> ({showResetModal.full_name})
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">New Password *</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-606 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-white"
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Verify password"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-bold text-slate-900 focus:border-blue-606 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => { setShowResetModal(null); resetFormStates(); }}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-750 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-xs font-black hover:bg-blue-700 transition"
                >
                  {actionLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-805 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center space-y-3.5">
              <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-955 dark:text-white uppercase tracking-wide">Permanently Delete HR User?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Are you absolutely sure you want to delete <span className="font-extrabold text-slate-800 dark:text-slate-200">@{showDeleteConfirm.username}</span>? This action deletes both the User account and the linked Employee Profile record. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="pt-5 flex space-x-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Discard
              </button>
              <button
                onClick={handleDeleteHR}
                disabled={actionLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3 text-xs font-black shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
