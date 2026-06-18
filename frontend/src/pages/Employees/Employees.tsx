import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  UserX,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Employee, EmployeeStatus } from '../../types';
import { employeeService } from '../../services/employeeService';

// Consistent professional avatar fallback generator
export const getAvatarFallback = (name: string) => {
  const parts = name.trim().split(' ');
  const initials = parts.map(p => p[0] || '').join('').toUpperCase().slice(0, 2);
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  
  return {
    initials: initials || 'EE',
    bgStyle: {
      backgroundColor: `hsl(${h}, 65%, 40%)`,
      color: '#ffffff'
    }
  };
};

export const AvatarComponent = ({ emp, className = "h-9 w-9 text-xs" }: { emp: Employee, className?: string }) => {
  const [imgError, setImgError] = useState(false);
  
  useEffect(() => {
    setImgError(false);
  }, [emp.avatar]);

  if (emp.avatar && !imgError) {
    return (
      <img 
        src={emp.avatar} 
        alt={emp.name} 
        className={`${className} rounded-full object-cover border border-slate-200 dark:border-slate-700`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }
  
  const { initials, bgStyle } = getAvatarFallback(emp.name);
  return (
    <div 
      style={bgStyle} 
      className={`${className} rounded-full flex items-center justify-center font-bold tracking-wider border border-slate-200 dark:border-slate-800 shadow-sm`}
    >
      {initials}
    </div>
  );
};

type SortField = 'id' | 'name' | 'salary' | 'joinDate';
type SortOrder = 'asc' | 'desc';

export default function Employees() {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee, 
    terminateEmployee, 
    restoreEmployee, 
    addNotification, 
    isLoading 
  } = useHR();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active view tab state (ACTIVE, TERMINATED, RESIGNED, ALL)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'TERMINATED' | 'RESIGNED' | 'ALL'>('ACTIVE');

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedLoc, setSelectedLoc] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Multi-select and Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Metadata from backend
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [dbDesignations, setDbDesignations] = useState<any[]>([]);
  const [metadataError, setMetadataError] = useState('');

  // Dialog Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Deletion Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [permanentDelete, setPermanentDelete] = useState(false);

  // Termination Modal
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [empToTerminate, setEmpToTerminate] = useState<Employee | null>(null);
  const [termDate, setTermDate] = useState(new Date().toISOString().split('T')[0]);
  const [termReason, setTermReason] = useState('Voluntary Resignation');
  const [termNotes, setTermNotes] = useState('');
  const [termStatus, setTermStatus] = useState<'TERMINATED' | 'RESIGNED'>('TERMINATED');

  // CSV Import Wizard Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importFailed, setImportFailed] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importPhase, setImportPhase] = useState<'UPLOAD' | 'PREVIEW' | 'COMPLETE'>('UPLOAD');
  const [importSuccessCount, setImportSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State (Add/Edit)
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('Engineering');
  const [formRole, setFormRole] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formStatus, setFormStatus] = useState<EmployeeStatus>('ACTIVE');
  const [formSalary, setFormSalary] = useState<number | ''>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');

  // Load backend metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [depts, desigs] = await Promise.all([
          employeeService.getDepartments(),
          employeeService.getDesignations()
        ]);
        setDbDepartments(depts);
        setDbDesignations(desigs);
        if (depts.length > 0) {
          setFormDept(depts[0].name);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
        setMetadataError('Failed to load departments and designations from backend.');
      }
    };
    fetchMetadata();
  }, []);

  // Sync role dropdown options when department changes
  useEffect(() => {
    const filteredDesigs = dbDesignations.filter(
      d => d.department_name.toLowerCase() === formDept.toLowerCase()
    );
    if (filteredDesigs.length > 0) {
      if (!filteredDesigs.some(d => d.name === formRole)) {
        setFormRole(filteredDesigs[0].name);
      }
    } else {
      setFormRole('');
    }
  }, [formDept, dbDesignations]);

  // Sync search parameter
  useEffect(() => {
    const queryParam = searchParams.get('search');
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [searchParams]);

  // Aggregate Lists for Select Filters dynamically
  const departmentsList = ['All', ...Array.from(new Set(employees.map(e => e.department)))];
  const locationsList = ['All', ...Array.from(new Set(employees.map(e => e.location)))];
  const statusesList = ['All', 'ACTIVE', 'ON LEAVE', 'PROBATION', 'SUSPENDED', 'REMOTE', 'TERMINATED', 'RESIGNED'];

  // Calculate dynamic KPI counts
  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.status === 'ACTIVE' || e.status === 'REMOTE' || e.status === 'ON LEAVE' || e.status === 'PROBATION' || e.status === 'SUSPENDED').length;
  const terminatedCount = employees.filter(e => e.status === 'TERMINATED').length;
  const resignedCount = employees.filter(e => e.status === 'RESIGNED').length;
  
  // Calculate new employees this month
  const newHiresThisMonth = employees.filter(e => {
    if (!e.joinDate || e.joinDate === 'Just Hired') return false;
    const joinDateObj = new Date(e.joinDate);
    const today = new Date();
    return joinDateObj.getMonth() === today.getMonth() && joinDateObj.getFullYear() === today.getFullYear();
  }).length;

  // Sorting Handler
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Form CRUD Handlers
  const handleAddNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formRole) {
      addNotification('Please fill in Name, Email, and Designation.', 'warning');
      return;
    }
    if (!formPassword) {
      addNotification('Password is required for user account.', 'warning');
      return;
    }
    if (formPassword.length < 8) {
      addNotification('Password must be at least 8 characters long.', 'warning');
      return;
    }
    if (formPassword !== formConfirmPassword) {
      addNotification('Passwords do not match.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      await addEmployee({
        name: formName,
        email: formEmail,
        phone: formPhone || '(555) 012-3456',
        status: formStatus,
        department: formDept,
        role: formRole,
        manager: 'Sarah Jenkins',
        location: formLoc,
        salary: formSalary !== '' ? Number(formSalary) : 0,
        password: formPassword,
        confirm_password: formConfirmPassword,
      }, profileImageFile);
      
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormRole('');
      setFormLoc('');
      setFormSalary('');
      setProfileImageFile(null);
      setProfileImagePreview('');
      setFormPassword('');
      setFormConfirmPassword('');
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Error adding employee:', err);
      const errorData = err.response?.data;
      
      // Determine if error is due to previously deleted employee
      const hasPrevDeletedCode = errorData?.code === 'previously_deleted' ||
                                 (Array.isArray(errorData?.code) && errorData.code.includes('previously_deleted')) ||
                                 errorData?.email?.includes('previously_deleted') ||
                                 errorData?.employee_id?.includes('previously_deleted') ||
                                 (errorData && Object.values(errorData).some((v: any) => 
                                   v === 'previously_deleted' || (Array.isArray(v) && v.includes('previously_deleted'))
                                 ));
      
      if (hasPrevDeletedCode) {
        const deletedEmpId = errorData?.employee_id || 
                             (Array.isArray(errorData?.employee_id) ? errorData.employee_id[0] : null) ||
                             (errorData?.email_id) || // fallback check
                             (employees.find(e => e.email.toLowerCase() === formEmail.toLowerCase())?.id);
                             
        if (window.confirm("This employee was previously deleted. Restore employee?")) {
          try {
            setActionLoading(true);
            const updatePayload = {
              first_name: formName.split(' ')[0] || '',
              last_name: formName.split(' ').slice(1).join(' ') || 'Employee',
              email: formEmail,
              phone: formPhone,
              address: formLoc,
              employment_status: formStatus || 'ACTIVE',
              salary: String(formSalary || 50000.0),
            };
            await restoreEmployee(deletedEmpId, updatePayload);
            
            setFormName('');
            setFormEmail('');
            setFormPhone('');
            setFormRole('');
            setFormLoc('');
            setFormSalary('');
            setProfileImageFile(null);
            setProfileImagePreview('');
            setFormPassword('');
            setFormConfirmPassword('');
            setShowAddModal(false);
          } catch (restoreErr) {
            console.error('Error restoring employee:', restoreErr);
            addNotification('Failed to restore employee.', 'warning');
          } finally {
            setActionLoading(false);
          }
        }
      } else {
        const errorMsg = errorData?.email || errorData?.employee_id || 'Failed to create new employee.';
        addNotification(Array.isArray(errorMsg) ? errorMsg[0] : String(errorMsg), 'warning');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) {
      if (formPassword || formConfirmPassword) {
        if (formPassword.length < 8) {
          addNotification('Password must be at least 8 characters long.', 'warning');
          return;
        }
        if (formPassword !== formConfirmPassword) {
          addNotification('Passwords do not match.', 'warning');
          return;
        }
      }

      setActionLoading(true);
      try {
        await updateEmployee(editingEmp.id, {
          name: formName,
          email: formEmail,
          phone: formPhone,
          department: formDept,
          role: formRole,
          location: formLoc,
          status: formStatus,
          salary: Number(formSalary),
          password: formPassword || undefined,
          confirm_password: formConfirmPassword || undefined,
        }, profileImageFile);
        
        setProfileImageFile(null);
        setProfileImagePreview('');
        setFormPassword('');
        setFormConfirmPassword('');
        setShowEditModal(false);
        setEditingEmp(null);
      } catch (err) {
        console.error(err);
        addNotification('Failed to update employee details.', 'warning');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormPhone(emp.phone);
    setFormDept(emp.department);
    setFormRole(emp.role);
    setFormLoc(emp.location);
    setFormStatus(emp.status);
    setFormSalary(emp.salary);
    setProfileImageFile(null);
    setProfileImagePreview(emp.avatar || '');
    setFormPassword('');
    setFormConfirmPassword('');
    setShowEditModal(true);
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addNotification('Image file size cannot exceed 5MB.', 'warning');
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
        addNotification('Only JPG, JPEG, and PNG images are allowed.', 'warning');
        return;
      }
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  // Deletion confirm
  const executeDelete = async () => {
    if (empToDelete) {
      setActionLoading(true);
      try {
        await deleteEmployee(empToDelete.id, permanentDelete);
        setShowDeleteModal(false);
        setEmpToDelete(null);
      } catch (err) {
        console.error(err);
        addNotification('Error removing employee profile.', 'warning');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Termination confirm
  const executeTerminate = async () => {
    if (empToTerminate) {
      setActionLoading(true);
      try {
        await terminateEmployee(empToTerminate.id, {
          termination_date: termDate,
          termination_reason: termReason,
          notes: termNotes,
          status: termStatus
        });
        setShowTerminateModal(false);
        setEmpToTerminate(null);
        setTermNotes('');
      } catch (err) {
        console.error(err);
        addNotification('Error terminating employee.', 'warning');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Restore employee
  const handleRestoreEmployee = async (emp: Employee) => {
    if (window.confirm(`Are you sure you want to restore ${emp.name} to active status?`)) {
      try {
        await restoreEmployee(emp.id);
      } catch (err) {
        console.error(err);
        addNotification('Error restoring employee.', 'warning');
      }
    }
  };

  // CSV Import Actions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      processImportPreview(file);
    }
  };

  const processImportPreview = async (file: File) => {
    setImportLoading(true);
    try {
      const data = await employeeService.importCSV(file, false);
      if (data) {
        setImportPreview(data.preview || []);
        setImportFailed(data.failed_records || []);
        setImportPhase('PREVIEW');
      }
    } catch (err) {
      console.error(err);
      addNotification('Error parsing CSV file.', 'warning');
    } finally {
      setImportLoading(false);
    }
  };

  const executeBulkImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const data = await employeeService.importCSV(importFile, true);
      if (data && data.success) {
        setImportSuccessCount(data.imported_count || 0);
        setImportFailed(data.failed_records || []);
        setImportPhase('COMPLETE');
        addNotification(`Successfully imported ${data.imported_count} employees in bulk.`, 'success');
      } else {
        addNotification('CSV import failed or contained invalid records.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addNotification('Error executing bulk import.', 'warning');
    } finally {
      setImportLoading(false);
    }
  };

  // CSV Export Actions
  const handleExportCSV = async (selectedOnly: boolean = false) => {
    try {
      const ids = selectedOnly ? selectedIds : undefined;
      const params = {
        department: selectedDept !== 'All' ? dbDepartments.find(d => d.name === selectedDept)?.id : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined
      };
      
      const blob = await employeeService.exportCSV(params, ids);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        addNotification('CSV database exported successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      addNotification('Error exporting CSV database.', 'warning');
    }
  };

  // Bulk actions handlers
  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to soft-delete the ${selectedIds.length} selected employees?`)) {
      setActionLoading(true);
      try {
        let successCount = 0;
        for (const id of selectedIds) {
          const success = await employeeService.deleteEmployee(id, false);
          if (success) successCount++;
        }
        addNotification(`Soft-deleted ${successCount} employees successfully.`, 'success');
        setSelectedIds([]);
      } catch (err) {
        console.error(err);
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Multi-select Toggles
  const handleSelectAll = (checked: boolean, list: Employee[]) => {
    if (checked) {
      setSelectedIds(list.map(emp => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Filter Logic: Multi-parameter + Active View Tabs
  const filteredEmployees = employees.filter(emp => {
    // Search filter
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Dropdown filters
    const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
    const matchesLoc = selectedLoc === 'All' || emp.location === selectedLoc;
    const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus;
    
    // Tab filters
    let matchesTab = true;
    if (activeTab === 'ACTIVE') {
      matchesTab = emp.status === 'ACTIVE' || emp.status === 'REMOTE' || emp.status === 'ON LEAVE' || emp.status === 'PROBATION' || emp.status === 'SUSPENDED';
    } else if (activeTab === 'TERMINATED') {
      matchesTab = emp.status === 'TERMINATED';
    } else if (activeTab === 'RESIGNED') {
      matchesTab = emp.status === 'RESIGNED';
    }

    return matchesSearch && matchesDept && matchesLoc && matchesStatus && matchesTab;
  });

  // Sorting logic
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';

    if (sortField === 'id') {
      aVal = a.id;
      bVal = b.id;
    } else if (sortField === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortField === 'salary') {
      aVal = a.salary;
      bVal = b.salary;
    } else if (sortField === 'joinDate') {
      aVal = new Date(a.joinDate || 0).getTime();
      bVal = new Date(b.joinDate || 0).getTime();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">Employees</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Manage directory profiles, CSV imports, and employee status tracking.</p>
        </div>
        <div className="flex space-x-2.5">
          <button 
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center space-x-2 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-850 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800 transition"
          >
            <Upload className="h-4 w-4 text-emerald-500" />
            <span>Bulk Import</span>
          </button>
          <button 
            onClick={() => {
              setFormName('');
              setFormEmail('');
              setFormPhone('');
              setFormRole('');
              setFormLoc('');
              setFormSalary('');
              setFormPassword('');
              setFormConfirmPassword('');
              setProfileImageFile(null);
              setProfileImagePreview('');
              setShowAddModal(true);
            }}
            className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* METADATA ERROR ALERT */}
      {metadataError && (
        <div className="flex items-center space-x-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-950/40">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{metadataError}</span>
        </div>
      )}

      {/* METRIC SUMMARIES GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Employees</span>
            <span className="text-xl font-extrabold text-slate-950 dark:text-white mt-1 block">
              {isLoading ? '...' : totalCount}
            </span>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Employees</span>
            <span className="text-xl font-extrabold text-slate-950 dark:text-white mt-1 block">
              {isLoading ? '...' : activeCount}
            </span>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terminated</span>
            <span className="text-xl font-extrabold text-slate-950 dark:text-white mt-1 block">
              {isLoading ? '...' : terminatedCount}
            </span>
          </div>
          <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <UserMinus className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resigned</span>
            <span className="text-xl font-extrabold text-slate-950 dark:text-white mt-1 block">
              {isLoading ? '...' : resignedCount}
            </span>
          </div>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <UserX className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hired This Month</span>
            <span className="text-xl font-extrabold text-slate-950 dark:text-white mt-1 block">
              {isLoading ? '...' : newHiresThisMonth}
            </span>
          </div>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <UserPlus className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
        
        {/* Search And Action row */}
        <div className="flex flex-col justify-between space-y-2 md:flex-row md:items-center md:space-y-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search via Name, Role, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => handleExportCSV(false)}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-55 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition"
            >
              <Download className="h-3.5 w-3.5 text-blue-500" />
              <span>Export All</span>
            </button>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => handleExportCSV(true)}
                className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-250 dark:border-emerald-900 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-parameter select lists */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 focus:outline-none"
            >
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter Location</label>
            <select
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 focus:outline-none"
            >
              {locationsList.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 focus:outline-none"
            >
              {statusesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* DIRECTORY VIEW TABS */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 space-x-6 text-xs font-bold">
        {[
          { id: 'ACTIVE', label: 'Active Directory' },
          { id: 'TERMINATED', label: 'Terminated Directory' },
          { id: 'RESIGNED', label: 'Resigned Directory' },
          { id: 'ALL', label: 'All Employees' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSelectedIds([]);
            }}
            className={`pb-2.5 border-b-2 transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPOSITORY DATA TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                <th className="px-6 py-3.5 w-12">
                  <input 
                    type="checkbox"
                    checked={sortedEmployees.length > 0 && selectedIds.length === sortedEmployees.length}
                    onChange={(e) => handleSelectAll(e.target.checked, sortedEmployees)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3.5">
                  <button onClick={() => toggleSort('name')} className="flex items-center space-x-1 hover:text-slate-650 focus:outline-none">
                    <span>Employee</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3.5">
                  <button onClick={() => toggleSort('id')} className="flex items-center space-x-1 hover:text-slate-650 focus:outline-none">
                    <span>ID &amp; DEPT</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3.5">STATUS</th>
                <th className="px-6 py-3.5">LOCATION</th>
                <th className="px-6 py-3.5">
                  <button onClick={() => toggleSort('joinDate')} className="flex items-center space-x-1 hover:text-slate-650 focus:outline-none">
                    <span>JOIN DATE</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <span>Synchronizing database...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    No active employees found in this directory.
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={(e) => handleSelectRow(e.target.checked, emp.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Employee Core */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <AvatarComponent emp={emp} className="h-9 w-9 text-xs" />
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">
                            {emp.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* ID & Dept */}
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {emp.id}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                          {emp.department} &bull; <span className="font-semibold">{emp.role}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                        emp.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : emp.status === 'ON LEAVE'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          : emp.status === 'PROBATION'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                          : emp.status === 'SUSPENDED'
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                          : emp.status === 'RESIGNED'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          : emp.status === 'REMOTE'
                          ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                          : emp.status === 'TERMINATED'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {emp.status}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {emp.location}
                      </span>
                    </td>

                    {/* Join Date */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400 dark:text-slate-400 font-semibold">
                        {emp.joinDate}
                      </span>
                    </td>

                    {/* Actions tools element */}
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        title="View Detailed Profile"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-100 bg-white text-slate-400 hover:bg-slate-55 hover:text-slate-850 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => openEditModal(emp)}
                        title="Amend Details"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-100 bg-white text-slate-400 hover:bg-slate-55 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-sky-400 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {emp.status !== 'TERMINATED' && emp.status !== 'RESIGNED' ? (
                        <button 
                          onClick={() => {
                            setEmpToTerminate(emp);
                            setTermStatus('TERMINATED');
                            setShowTerminateModal(true);
                          }}
                          title="Terminate Employee"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-100 bg-white text-slate-400 hover:bg-slate-55 hover:text-amber-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400 transition"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleRestoreEmployee(emp)}
                          title="Restore Employee to Active"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-100 bg-white text-slate-400 hover:bg-slate-55 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-emerald-400 transition"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setEmpToDelete(emp);
                          setPermanentDelete(false);
                          setShowDeleteModal(true);
                        }}
                        title="Delete Employee"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-100 bg-white text-slate-400 hover:bg-slate-55 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Showing <span className="font-bold text-slate-700 dark:text-slate-300">1-{sortedEmployees.length}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{sortedEmployees.length}</span> candidates
          </p>
          <div className="flex space-x-1">
            <button className="rounded border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400" disabled>Previous</button>
            <button className="bg-blue-600 rounded px-2.5 py-1 text-[10px] font-bold text-white shadow">1</button>
            <button className="rounded border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400" disabled>Next</button>
          </div>
        </div>

      </div>

      {/* BULK ACTIONS STICKY BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex items-center space-x-6 z-40 border border-slate-800 animate-slide-up">
          <span className="text-xs font-bold text-slate-300">
            <span className="text-blue-400 font-extrabold">{selectedIds.length}</span> employees selected
          </span>
          <div className="flex space-x-2">
            <button 
              onClick={() => handleExportCSV(true)}
              className="bg-slate-800 hover:bg-slate-700 rounded px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 transition"
            >
              <Download className="h-3 w-3" />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={handleBulkDelete}
              className="bg-rose-650 hover:bg-rose-700 text-white rounded px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 transition"
            >
              <Trash2 className="h-3 w-3" />
              <span>Bulk Delete</span>
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-slate-200 text-[11px] font-bold"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* FORM MODAL: DRAFT ADD EMPLOYEE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Register Corporate Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={actionLoading}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddNewEmployee} className="mt-4 grid gap-4 grid-cols-2">
              
              <div className="col-span-2 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-850">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Profile Image (optional)</label>
                <div className="flex items-center space-x-4">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-blue-500 shadow-sm" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs">No Image</div>
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleProfileImageChange}
                    className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/40 dark:file:text-blue-400"
                    disabled={actionLoading}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Professional Email *</label>
                <input
                  required
                  type="email"
                  placeholder="eleanor@enterprise.co"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Personal Phone Number</label>
                <input
                  type="text"
                  placeholder="(555) 123-4567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Department</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                >
                  {dbDepartments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  {dbDepartments.length === 0 && (
                    <>
                      <option value="Engineering">Engineering</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="HR & Admin">HR &amp; Admin</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Designated Role *</label>
                <select
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                >
                  <option value="">Select Designation</option>
                  {dbDesignations
                    .filter(d => d.department_name.toLowerCase() === formDept.toLowerCase())
                    .map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Geographic Office</label>
                <input
                  type="text"
                  placeholder="e.g. New York Office"
                  value={formLoc}
                  onChange={(e) => setFormLoc(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Annual Salary (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 600000"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Account Password *</label>
                <input
                  required
                  type="password"
                  placeholder="Min 8 characters"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm Password *</label>
                <input
                  required
                  type="password"
                  placeholder="Confirm password"
                  value={formConfirmPassword}
                  onChange={(e) => setFormConfirmPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Operating Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as EmployeeStatus)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON LEAVE">ON LEAVE</option>
                  <option value="PROBATION">PROBATION</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="RESIGNED">RESIGNED</option>
                  <option value="TERMINATED">TERMINATED</option>
                  <option value="REMOTE">REMOTE</option>
                </select>
              </div>

              <div className="col-span-2 pt-4 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Registering...' : 'Register Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL: EDIT EMPLOYEE */}
      {showEditModal && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Amend Employee Details</h3>
              <button onClick={() => { setShowEditModal(false); setEditingEmp(null); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={actionLoading}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 grid gap-4 grid-cols-2">
              
              <div className="col-span-2 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-850">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Profile Image (optional)</label>
                <div className="flex items-center space-x-4">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-blue-500 shadow-sm" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs">No Image</div>
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleProfileImageChange}
                    className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/40 dark:file:text-blue-400"
                    disabled={actionLoading}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Professional Email *</label>
                <input
                  required
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Personal Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Department</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                >
                  {dbDepartments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  {dbDepartments.length === 0 && (
                    <>
                      <option value="Engineering">Engineering</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="HR & Admin">HR &amp; Admin</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Designated Role *</label>
                <select
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                >
                  <option value="">Select Designation</option>
                  {dbDesignations
                    .filter(d => d.department_name.toLowerCase() === formDept.toLowerCase())
                    .map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Geographic Office</label>
                <input
                  type="text"
                  value={formLoc}
                  onChange={(e) => setFormLoc(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Annual Salary (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 600000"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Reset Password (optional)</label>
                <input
                  type="password"
                  placeholder="Min 8 characters to reset"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm Reset Password</label>
                <input
                  type="password"
                  placeholder="Confirm reset password"
                  value={formConfirmPassword}
                  onChange={(e) => setFormConfirmPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Operating Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as EmployeeStatus)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  disabled={actionLoading}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON LEAVE">ON LEAVE</option>
                  <option value="PROBATION">PROBATION</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="RESIGNED">RESIGNED</option>
                  <option value="TERMINATED">TERMINATED</option>
                  <option value="REMOTE">REMOTE</option>
                </select>
              </div>

              <div className="col-span-2 pt-4 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingEmp(null); }}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Applying...' : 'Apply Amendments'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODERN DELETE CONFIRMATION MODAL */}
      {showDeleteModal && empToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Permanently Remove Employee?</h3>
              <p className="text-xs text-slate-400 mt-2 dark:text-slate-500 leading-relaxed">
                You are about to permanently delete the profile of <strong className="text-slate-800 dark:text-slate-200">{empToDelete.name}</strong> (<span className="font-mono">{empToDelete.id}</span>). This action cannot be reversed.
              </p>
              
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-850 rounded-lg w-full text-left space-y-1 text-xs">
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Profile Overview</p>
                <p className="font-extrabold text-slate-800 dark:text-slate-200">{empToDelete.name}</p>
                <p className="text-slate-500">{empToDelete.role} &bull; {empToDelete.department}</p>
                <p className="text-slate-550">{empToDelete.email}</p>
              </div>

              <div className="mt-4 flex items-center space-x-2 w-full text-xs font-bold text-slate-600 dark:text-slate-400">
                <input 
                  type="checkbox" 
                  id="permCheck" 
                  checked={permanentDelete}
                  onChange={(e) => setPermanentDelete(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" 
                />
                <label htmlFor="permCheck" className="cursor-pointer">Permanently purge record from database (Skip Trashbin)</label>
              </div>

              <div className="mt-6 flex space-x-3 w-full">
                <button
                  onClick={() => { setShowDeleteModal(false); setEmpToDelete(null); }}
                  className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 bg-rose-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-rose-700 transition"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Yes, Delete Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODERN TERMINATION MODAL */}
      {showTerminateModal && empToTerminate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-amber-50 dark:bg-amber-955/20 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <UserX className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-center">Terminate Corporate Employee</h3>
              
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-lg w-full text-left space-y-1 text-xs">
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Employee Profile</p>
                <p className="font-extrabold text-slate-800 dark:text-slate-200">{empToTerminate.name}</p>
                <p className="text-slate-500">{empToTerminate.role} &bull; {empToTerminate.department}</p>
              </div>

              <div className="mt-4 space-y-3 w-full text-left">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Termination Status</label>
                  <select
                    value={termStatus}
                    onChange={(e) => setTermStatus(e.target.value as any)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="TERMINATED">Terminated</option>
                    <option value="RESIGNED">Resigned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Effective Termination Date</label>
                  <input
                    type="date"
                    value={termDate}
                    onChange={(e) => setTermDate(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Reason</label>
                  <select
                    value={termReason}
                    onChange={(e) => setTermReason(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Voluntary Resignation">Voluntary Resignation</option>
                    <option value="Involuntary Termination">Involuntary Termination</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Layoff/Redundancy">Layoff/Redundancy</option>
                    <option value="Performance Issues">Performance Issues</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes &amp; Internal Audit details</label>
                  <textarea
                    rows={3}
                    placeholder="Enter secondary details, transition plan description, etc..."
                    value={termNotes}
                    onChange={(e) => setTermNotes(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3 w-full">
                <button
                  onClick={() => { setShowTerminateModal(false); setEmpToTerminate(null); }}
                  className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={executeTerminate}
                  className="flex-1 bg-amber-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-amber-700 transition"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Terminate Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT WIZARD MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                <span>Bulk Import Wizard</span>
              </h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportFailed([]);
                  setImportPhase('UPLOAD');
                }} 
                className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                disabled={importLoading}
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* PHASE 1: UPLOAD */}
            {importPhase === 'UPLOAD' && (
              <div className="mt-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-350 dark:border-slate-700 rounded-xl p-10 text-center bg-slate-50/50 dark:bg-slate-850/20">
                <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Upload Employees Database CSV</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Required columns: employee_id, first_name, last_name, email, department, designation, salary
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 inline-flex items-center space-x-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-xs font-black hover:bg-blue-700 shadow-sm"
                  disabled={importLoading}
                >
                  {importLoading ? 'Reading CSV...' : 'Choose File'}
                </button>
              </div>
            )}

            {/* PHASE 2: PREVIEW */}
            {importPhase === 'PREVIEW' && (
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-3 rounded-lg text-xs font-semibold">
                  <span className="text-slate-500">File selected: <strong className="text-slate-800 dark:text-slate-200">{importFile?.name}</strong></span>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-500 font-bold hover:underline"
                  >
                    Change File
                  </button>
                </div>

                {/* Validation Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/20 p-3 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                    <p className="font-extrabold flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{importPreview.length} Ready to Import</span>
                    </p>
                    <p className="text-[10px] text-emerald-600/80 mt-0.5">Records passed columns layout checks and look valid.</p>
                  </div>
                  <div className={`rounded-lg border p-3 text-xs ${
                    importFailed.length > 0
                      ? 'border-rose-100 bg-rose-50/20 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/10'
                      : 'border-slate-100 bg-slate-50/20 text-slate-400'
                  }`}>
                    <p className="font-extrabold flex items-center space-x-1">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{importFailed.length} Records Contain Errors</span>
                    </p>
                    <p className="text-[10px] mt-0.5">Duplicate IDs or missing departments will be skipped.</p>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-56 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-2">ID</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Role &amp; Dept</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-350">
                      {importPreview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="px-4 py-2 font-mono">{item.employee_id}</td>
                          <td className="px-4 py-2">{item.first_name} {item.last_name}</td>
                          <td className="px-4 py-2 text-slate-500">{item.email}</td>
                          <td className="px-4 py-2 text-slate-550">{item.designation_name} &bull; {item.department_name}</td>
                          <td className="px-4 py-2 text-emerald-500">Ready</td>
                        </tr>
                      ))}
                      {importFailed.map((item, idx) => (
                        <tr key={`fail-${idx}`} className="bg-rose-50/20 text-rose-800 hover:bg-rose-50/30">
                          <td className="px-4 py-2 font-mono">{item.id || 'N/A'}</td>
                          <td className="px-4 py-2 col-span-2 text-rose-600 font-bold" colSpan={3}>
                            Row {item.row}: {item.error}
                          </td>
                          <td className="px-4 py-2 text-rose-500">Failed</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview([]);
                      setImportFailed([]);
                      setImportPhase('UPLOAD');
                    }}
                    className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    disabled={importLoading}
                  >
                    Reset
                  </button>
                  <button
                    onClick={executeBulkImport}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 transition"
                    disabled={importLoading || importPreview.length === 0}
                  >
                    {importLoading ? 'Importing...' : `Import ${importPreview.length} Employees`}
                  </button>
                </div>
              </div>
            )}

            {/* PHASE 3: COMPLETE */}
            {importPhase === 'COMPLETE' && (
              <div className="mt-6 flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Bulk Import Completed</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-md">
                  Bulk creation sequence finished. Mapped database columns processed: <strong className="text-emerald-500">{importSuccessCount}</strong> employees created.
                </p>

                {importFailed.length > 0 && (
                  <div className="w-full text-left space-y-2 text-xs mt-4">
                    <p className="font-bold text-slate-500">Skipped Records Logs ({importFailed.length})</p>
                    <div className="max-h-40 overflow-y-auto border border-rose-100 rounded-lg bg-rose-50/10 p-3 space-y-1 font-mono text-[10px] text-rose-700">
                      {importFailed.map((f, i) => (
                        <p key={i}>Row {f.row}: {f.error}</p>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                    setImportFailed([]);
                    setImportPhase('UPLOAD');
                    // Reload data
                    window.location.reload();
                  }}
                  className="bg-slate-900 text-white rounded-lg w-full py-2.5 text-xs font-bold hover:bg-slate-850 transition"
                >
                  Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
