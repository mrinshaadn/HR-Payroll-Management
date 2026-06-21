import React, { useState, useEffect } from 'react';
import { useHR } from '../../context/HRContext';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/employeeService';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  Plus, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  FileText, 
  PieChart as PieIcon, 
  Trash2, 
  Settings, 
  User, 
  Users, 
  Info,
  Layers,
  BarChart2,
  CalendarDays
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { LeaveRequest } from '../../types';

export default function Leave() {
  const { 
    user, 
    leaveRequests, 
    updateLeaveRequestStatus, 
    addLeaveRequest, 
    employees, 
    addNotification,
    leaveBalances,
    refreshData
  } = useHR();

  // Role check
  const isAdmin = user?.role === 'ADMIN';
  const isHR = user?.role === 'HR';
  const isEmployee = user?.role === 'EMPLOYEE';

  // Navigation Sub Tab
  const [activeSubTab, setActiveSubTab] = useState<'Overview' | 'Calendar' | 'Categories'>('Overview');

  // State Management
  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: number; name: string; max_days_per_year: number; is_paid_leave: boolean; description?: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [reports, setReports] = useState<any>({
    total_requests: 0,
    approved_requests: 0,
    pending_requests: 0,
    rejected_requests: 0,
    department_distribution: {}
  });

  // Calendar states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calDeptFilter, setCalDeptFilter] = useState<string>('All');
  const [calEmpFilter, setCalEmpFilter] = useState<string>('All');

  // Modals state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryMaxDays, setCategoryMaxDays] = useState(15);
  const [categoryIsPaid, setCategoryIsPaid] = useState(true);

  // Form states
  const [applyType, setApplyType] = useState<string>('');
  const [applyStartDate, setApplyStartDate] = useState<string>('');
  const [applyEndDate, setApplyEndDate] = useState<string>('');
  const [applyReason, setApplyReason] = useState('');

  // Conflict Pre-submission state
  const [conflictOverlap, setConflictOverlap] = useState(false);
  const [conflictBalance, setConflictBalance] = useState(false);
  const [conflictDuplicate, setConflictDuplicate] = useState(false);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);

  // Load backend configurations
  const loadCategories = async () => {
    try {
      const types = await leaveService.getLeaveTypes();
      setLeaveTypes(types as any);
      if (types.length > 0 && !applyType) {
        setApplyType(types[0].name);
      }
    } catch (err) {
      console.error('Failed to load leave categories:', err);
    }
  };

  const loadReports = async () => {
    try {
      const rep = await leaveService.getLeaveReports();
      if (rep) setReports(rep);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  useEffect(() => {
    loadCategories();
    loadReports();
    employeeService.getDepartments().then(setDepartments).catch(console.error);
  }, [leaveRequests]);

  // Pre-submission Conflict check Hook
  useEffect(() => {
    if (!applyStartDate || !applyEndDate || !applyType) {
      setConflictOverlap(false);
      setConflictBalance(false);
      setConflictDuplicate(false);
      return;
    }

    const start = new Date(applyStartDate);
    const end = new Date(applyEndDate);

    if (start > end) {
      setConflictOverlap(false);
      setConflictBalance(false);
      setConflictDuplicate(false);
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Balance check
    const balanceObj = leaveBalances.find(b => b.leave_type_name.toLowerCase().includes(applyType.toLowerCase()));
    setConflictBalance(balanceObj ? diffDays > balanceObj.remaining_days : false);

    // Overlap & Duplicate check
    let overlapFound = false;
    let duplicateFound = false;

    // Filter requests belonging to current user
    const personalRequests = leaveRequests.filter(req => req.employeeName.toLowerCase() === user?.name.toLowerCase());

    personalRequests.forEach(req => {
      if (req.status === 'REJECTED' || req.status === 'CANCELLED') return;
      
      if (req.startDate && req.endDate) {
        const reqStart = new Date(req.startDate + 'T00:00:00');
        const reqEnd = new Date(req.endDate + 'T00:00:00');

        if (start <= reqEnd && end >= reqStart) {
          overlapFound = true;
          if (
            start.getTime() === reqStart.getTime() && 
            end.getTime() === reqEnd.getTime() &&
            req.leaveType.toLowerCase() === applyType.toLowerCase()
          ) {
            duplicateFound = true;
          }
        }
      }
    });

    setConflictOverlap(overlapFound);
    setConflictDuplicate(duplicateFound);
  }, [applyStartDate, applyEndDate, applyType, leaveBalances, leaveRequests, user]);

  // Submit Leave Request
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyType || !applyStartDate || !applyEndDate || !applyReason) {
      addNotification('Please fill in all required fields.', 'warning');
      return;
    }

    const start = new Date(applyStartDate);
    const end = new Date(applyEndDate);
    if (start > end) {
      addNotification('Start date cannot be after end date.', 'warning');
      return;
    }

    if (conflictOverlap) {
      addNotification('Overlapping leave dates detected.', 'warning');
      return;
    }

    if (conflictBalance) {
      addNotification('Insufficient leave balance.', 'warning');
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    setIsLoading(true);
    try {
      const success = await addLeaveRequest({
        employeeName: user?.name || 'Claimant',
        employeeAvatar: user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        leaveType: applyType as any,
        reason: applyReason,
        dates: `${applyStartDate} - ${applyEndDate}`,
        duration: `${diffDays} Days`
      });
      addNotification('Leave applied successfully.', 'success');
      setApplyStartDate('');
      setApplyEndDate('');
      setApplyReason('');
      setShowApplyModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to submit leave application.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Approval actions (Approvals and rejection)
  const handleApprove = async (id: string) => {
    setIsLoading(true);
    try {
      await updateLeaveRequestStatus(id, 'APPROVED');
      addNotification('Leave request approved.', 'success');
      refreshData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to approve request.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRejectModal = (id: string) => {
    setRejectingRequestId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequestId || !rejectionReason) return;
    setIsLoading(true);
    try {
      await updateLeaveRequestStatus(rejectingRequestId, 'REJECTED', rejectionReason);
      addNotification('Leave request rejected.', 'success');
      setShowRejectModal(false);
      setRejectingRequestId(null);
      refreshData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to reject request.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending request?')) return;
    setIsLoading(true);
    try {
      const success = await leaveService.cancelLeaveRequest(id);
      if (success) {
        addNotification('Leave request cancelled successfully.', 'success');
        refreshData();
      } else {
        addNotification('Failed to cancel request.', 'warning');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Leave Category Management
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;
    setIsLoading(true);
    try {
      const payload = {
        name: categoryName,
        description: categoryDesc,
        max_days_per_year: categoryMaxDays,
        is_paid_leave: categoryIsPaid
      };
      if (editingCategory) {
        await leaveService.updateLeaveType(editingCategory.id, payload);
        addNotification(`Category ${categoryName} updated.`, 'success');
      } else {
        await leaveService.createLeaveType(payload);
        addNotification(`Category ${categoryName} created.`, 'success');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      loadCategories();
      refreshData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to save category.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    setIsLoading(true);
    try {
      const success = await leaveService.deleteLeaveType(id);
      if (success) {
        addNotification('Category deleted successfully.', 'success');
        loadCategories();
        refreshData();
      } else {
        addNotification('Failed to delete category.', 'warning');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filters logic
  const filteredRequests = leaveRequests.filter(req => {
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter.toUpperCase();
    const matchesType = typeFilter === 'All' || req.leaveType.toLowerCase().includes(typeFilter.toLowerCase());
    
    // Scoping check (HR vs Admin vs Employee is handled backend, frontend filters department/employee name)
    let matchesDept = true;
    if (deptFilter !== 'All') {
      const empProfile = employees.find(e => e.name === req.employeeName);
      if (empProfile && empProfile.department !== deptFilter) {
        matchesDept = false;
      }
    }
    return matchesStatus && matchesType && matchesDept;
  });

  // Client-side pagination bounds
  const startIndex = (page - 1) * pageSize;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;

  // Analytics Computation
  // Today count: approved requests spanning current time localdate
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  const onLeaveTodayCount = leaveRequests.filter(req => {
    if (req.status !== 'APPROVED' || !req.startDate || !req.endDate) return false;
    const s = new Date(req.startDate + 'T00:00:00');
    const e = new Date(req.endDate + 'T00:00:00');
    return todayDate >= s && todayDate <= e;
  }).length;

  const totalLeaveRequests = leaveRequests.length;
  const pendingApprovalsCount = leaveRequests.filter(req => req.status === 'PENDING').length;
  const approvedRequestsCount = leaveRequests.filter(req => req.status === 'APPROVED').length;
  const rejectedRequestsCount = leaveRequests.filter(req => req.status === 'REJECTED').length;

  // Chart datasets
  // 1. Department Leave Distribution
  const departmentChartData = React.useMemo(() => {
    const mapping: Record<string, number> = {};
    leaveRequests.forEach(req => {
      if (req.status !== 'APPROVED') return;
      const empProfile = employees.find(e => e.name === req.employeeName);
      const deptName = empProfile?.department || 'Unassigned';
      mapping[deptName] = (mapping[deptName] || 0) + 1;
    });
    return Object.entries(mapping).map(([name, value]) => ({ name, value }));
  }, [leaveRequests, employees]);

  // 2. Leave Type Distribution
  const typeChartData = React.useMemo(() => {
    const mapping: Record<string, number> = {};
    leaveRequests.forEach(req => {
      if (req.status !== 'APPROVED') return;
      mapping[req.leaveType] = (mapping[req.leaveType] || 0) + 1;
    });
    return Object.entries(mapping).map(([name, value]) => ({ name, value }));
  }, [leaveRequests]);

  // 3. Monthly Leave Trends
  const trendChartData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mapping: Record<string, number> = {};
    leaveRequests.forEach(req => {
      if (req.status !== 'APPROVED' || !req.startDate) return;
      const dateObj = new Date(req.startDate + 'T00:00:00');
      const mName = months[dateObj.getMonth()];
      mapping[mName] = (mapping[mName] || 0) + 1;
    });
    return months.map(m => ({ month: m, Leaves: mapping[m] || 0 }));
  }, [leaveRequests]);

  // Calendar builder
  const calendarMonthGrid = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = endOfMonth.getDate();
    const startOffset = startOfMonth.getDay();

    const dayGrid = [];

    // Fill offset days
    const prevMonthEnd = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      dayGrid.push({
        num: prevMonthEnd - i,
        date: new Date(year, month - 1, prevMonthEnd - i),
        isCurrentMonth: false,
        leaves: []
      });
    }

    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      dayGrid.push({
        num: d,
        date: new Date(year, month, d),
        isCurrentMonth: true,
        leaves: [] as LeaveRequest[]
      });
    }

    // Fill remaining days
    const remaining = (7 - (dayGrid.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      dayGrid.push({
        num: d,
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
        leaves: []
      });
    }

    // Map leaves
    dayGrid.forEach(gridDay => {
      const dVal = new Date(gridDay.date.getTime());
      dVal.setHours(0,0,0,0);

      leaveRequests.forEach(req => {
        if (req.status === 'CANCELLED') return;
        if (req.startDate && req.endDate) {
          const reqStart = new Date(req.startDate + 'T00:00:00');
          const reqEnd = new Date(req.endDate + 'T00:00:00');

          if (dVal >= reqStart && dVal <= reqEnd) {
            let matched = true;
            if (calEmpFilter !== 'All') {
              const matchedEmp = employees.find(e => e.id === calEmpFilter);
              if (matchedEmp && req.employeeName !== matchedEmp.name) {
                matched = false;
              }
            }
            if (calDeptFilter !== 'All' && matched) {
              const matchedEmp = employees.find(e => e.name === req.employeeName);
              if (matchedEmp && matchedEmp.department !== calDeptFilter) {
                matched = false;
              }
            }
            if (matched) {
              gridDay.leaves.push(req);
            }
          }
        }
      });
    });

    return dayGrid;
  }, [currentDate, leaveRequests, calDeptFilter, calEmpFilter, employees]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">Leave Ledger Workspace</h1>
          <p className="text-xs font-semibold text-slate-405 dark:text-slate-500">
            {isAdmin ? 'System administration portal: Override, stats, categories and full calendar visibility' :
             isHR ? 'HR Team Dashboard: Approvals for assigned staff, scoped calendars, and analytics' :
             'Employee Workspace: Apply time off, monitor remaining balance caps, and cancel pending applications'}
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowApplyModal(true)}
            className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Apply Time Off</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD LEVEL STATISTICS CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Requests</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{totalLeaveRequests}</span>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <FileText className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Pending Approvals</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{pendingApprovalsCount}</span>
          </div>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
            <CalendarIcon className="h-4 w-4 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Approved Leaves</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{approvedRequestsCount}</span>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Rejected Leaves</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{rejectedRequestsCount}</span>
          </div>
          <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
            <XCircle className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">On Leave Today</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{onLeaveTodayCount}</span>
          </div>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: 'Overview', label: 'Availability Dashboard' },
          { id: 'Calendar', label: 'Team Calendar' },
          { id: 'Categories', label: 'Leave Configurations', hidden: !isHR && !isAdmin }
        ].filter(t => !t.hidden).map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveSubTab(t.id as any);
              setPage(1);
            }}
            className={`pb-2.5 px-4 text-xs font-bold transition-all relative ${
              activeSubTab === t.id
                ? 'text-blue-600 dark:text-blue-400 font-extrabold border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* MAIN VIEW LAYOUT */}
      {activeSubTab === 'Overview' && (
        <div className="space-y-6">
          
          {/* BALANCE CARDS (EMPLOYEE OR HR PROFILE VIEW) */}
          {(isEmployee || isHR) && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">My Allocation Balances</h3>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                {leaveBalances.map((bal, index) => {
                  const used = Number(bal.allocated_days) - Number(bal.remaining_days);
                  return (
                    <div key={bal.id || index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow transition">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">{bal.leave_type_name}</span>
                      <div className="flex items-baseline space-x-1 mt-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{bal.remaining_days}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Days Left</span>
                      </div>
                      <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600" 
                          style={{ width: `${Math.min(100, (used / (Number(bal.allocated_days) || 1)) * 100)}%` }} 
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-405 mt-1 block">Allocated: {bal.allocated_days} days</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REQUESTS LIST WITH APPROVAL ACTIONS */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Table history column */}
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {isAdmin ? 'Organization-wide Requests Ledger' :
                   isHR ? 'My Team Leave Requests' : 'My Leave Request Logs'}
                </h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="h-8.5 rounded-md border border-slate-205 bg-slate-50 px-2 text-[10px] font-bold text-slate-805 dark:border-slate-850 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    className="h-8.5 rounded-md border border-slate-205 bg-slate-50 px-2 text-[10px] font-bold text-slate-805 dark:border-slate-850 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Types</option>
                    {leaveTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>

                  {isAdmin && (
                    <select
                      value={deptFilter}
                      onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                      className="h-8.5 rounded-md border border-slate-205 bg-slate-50 px-2 text-[10px] font-bold text-slate-805 dark:border-slate-850 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <option value="All">All Departments</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                        <th className="px-6 py-3.5">Employee</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Dates</th>
                        <th className="px-6 py-3.5">Duration</th>
                        <th className="px-6 py-3.5">Reason</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/40 text-slate-800 dark:text-slate-200">
                      {paginatedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                            No requests match selected filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedRequests.map(req => {
                          const isOwnRequest = req.employeeName.toLowerCase() === user?.name.toLowerCase();
                          const isApplicantHR = req.employeeRole === 'HR';
                          return (
                            <tr key={req.id} className="hover:bg-slate-55/30 dark:hover:bg-slate-800/10">
                              <td className="px-6 py-3.5">
                                <div className="flex items-center space-x-2.5">
                                  <img src={req.employeeAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                                  <div>
                                    <span className="font-extrabold block leading-tight">{req.employeeName}</span>
                                    <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">{req.employeeRole || 'EMPLOYEE'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3.5 font-sans font-bold">{req.leaveType}</td>
                              <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">{req.dates}</td>
                              <td className="px-6 py-3.5 font-sans font-bold">{req.duration}</td>
                              <td className="px-6 py-3.5 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${
                                  req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-205 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                  req.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border-amber-205 dark:bg-amber-955/40 dark:text-amber-300' :
                                  req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-205 dark:bg-rose-950/60 dark:text-rose-300' :
                                  'bg-slate-100 text-slate-700 border-slate-205'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-right space-x-1">
                                {req.status === 'PENDING' && (
                                  <>
                                    {/* Action scoping checks */}
                                    {((isAdmin && !isOwnRequest) || (isHR && !isOwnRequest && !isApplicantHR)) ? (
                                      <>
                                        <button
                                          onClick={() => handleApprove(req.id)}
                                          title="Approve"
                                          className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-slate-800 dark:text-emerald-400"
                                        >
                                          <CheckCircle className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleOpenRejectModal(req.id)}
                                          title="Reject"
                                          className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-450"
                                        >
                                          <XCircle className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    ) : isOwnRequest ? (
                                      <button
                                        onClick={() => handleCancelRequest(req.id)}
                                        title="Cancel"
                                        className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-455 font-bold">Scoped</span>
                                    )}
                                  </>
                                )}

                                {/* Admin override action capability */}
                                {isAdmin && req.status !== 'PENDING' && (
                                  <div className="inline-flex space-x-1.5">
                                    {req.status !== 'APPROVED' && (
                                      <button
                                        onClick={() => handleApprove(req.id)}
                                        title="Override to Approve"
                                        className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800"
                                      >
                                        Approve
                                      </button>
                                    )}
                                    {req.status !== 'REJECTED' && (
                                      <button
                                        onClick={() => handleOpenRejectModal(req.id)}
                                        title="Override to Reject"
                                        className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-slate-800"
                                      >
                                        Reject
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredRequests.length > pageSize && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5 dark:border-slate-805 dark:bg-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredRequests.length)} of {filteredRequests.length} requests
                    </span>
                    <div className="flex space-x-1">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-55 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        disabled={page * pageSize >= filteredRequests.length}
                        onClick={() => setPage(prev => prev + 1)}
                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-55 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side analytics column */}
            <div className="space-y-6">
              
              {/* Analytics Section (Only for HR or ADMIN roles) */}
              {(isHR || isAdmin) && (
                <>
                  {/* Leaves by department donut */}
                  {departmentChartData.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Department Leave Distribution</h4>
                        <p className="text-[10px] text-slate-505 dark:text-slate-455">Total approved leaves by organizational division</p>
                      </div>
                      <div className="h-40 w-full flex items-center justify-between">
                        <div className="h-28 w-28 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={departmentChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={28}
                                outerRadius={40}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {departmentChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 pl-4 space-y-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-450 overflow-hidden">
                          {departmentChartData.slice(0, 5).map((entry, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="truncate pr-1 block">{entry.name}</span>
                              <span className="font-extrabold font-mono text-slate-850 dark:text-white shrink-0">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Monthly leave trends */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Monthly Time Off Trend</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-455">Aggregate monthly trend charts</p>
                    </div>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChartData}>
                          <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ fontSize: '10px' }} />
                          <Line type="monotone" dataKey="Leaves" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* General details info card */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs leading-relaxed text-blue-750 dark:text-blue-300">
                <div className="flex space-x-2">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold">Hierarchy Approval Scope</h5>
                    <p className="mt-1 font-medium text-[11px] leading-normal">
                      Leave requests follow standard corporate routes. Employees submit to assigned HR representatives. HR users submit to Administrators. Decisions can be overwritten by Admin systems at any point.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TEAM CALENDAR VIEW */}
      {activeSubTab === 'Calendar' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-slate-105 border border-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-slate-105 border border-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(isHR || isAdmin) && (
                <>
                  <select
                    value={calDeptFilter}
                    onChange={(e) => setCalDeptFilter(e.target.value)}
                    className="h-8.5 rounded-md border border-slate-205 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-805 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>

                  <select
                    value={calEmpFilter}
                    onChange={(e) => setCalEmpFilter(e.target.value)}
                    className="h-8.5 rounded-md border border-slate-205 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-805 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Employees</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold uppercase tracking-widest text-slate-500 pb-3 border-b border-slate-200 dark:border-slate-850">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 mt-3 min-h-[300px]">
              {calendarMonthGrid.map((cell, idx) => (
                <div
                  key={idx}
                  className={`p-2 min-h-[80px] rounded-lg border flex flex-col justify-between transition ${
                    cell.isCurrentMonth
                      ? 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/10 dark:border-slate-800'
                      : 'bg-slate-100/30 border-slate-200/40 text-slate-400 dark:bg-slate-900/5'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">{cell.num}</span>

                  <div className="mt-1.5 space-y-1 max-h-[50px] overflow-y-auto pr-0.5">
                    {cell.leaves.map((lv, lidx) => (
                      <div
                        key={lidx}
                        title={`${lv.employeeName}: ${lv.leaveType} (${lv.reason})`}
                        className={`text-[8px] px-1 py-0.5 rounded font-black truncate ${
                          lv.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-305' :
                          lv.status === 'PENDING' ? 'bg-amber-100 text-amber-805 dark:bg-amber-955/40 dark:text-amber-300' :
                          'bg-rose-105 text-rose-800 dark:bg-rose-955/40'
                        }`}
                      >
                        {lv.employeeName.split(' ')[0]} - {lv.leaveType.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATIONS AND CATEGORIES FOR HR/ADMIN */}
      {activeSubTab === 'Categories' && (isHR || isAdmin) && (
        <div className="space-y-4">
          <div className="flex justify-between items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Leave Categories Configuration</h3>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryName('');
                setCategoryDesc('');
                setCategoryMaxDays(15);
                setCategoryIsPaid(true);
                setShowCategoryModal(true);
              }}
              className="inline-flex h-8.5 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Category</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:border-slate-800">
                  <th className="px-6 py-3.5">Category Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Max Days Per Year</th>
                  <th className="px-6 py-3.5">Paid Category</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/40 text-slate-800 dark:text-slate-200 font-semibold">
                {leaveTypes.map(type => (
                  <tr key={type.id} className="hover:bg-slate-55/30">
                    <td className="px-6 py-3.5 font-bold">{type.name}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 max-w-sm truncate">{type.description || '-'}</td>
                    <td className="px-6 py-3.5 font-mono">{type.max_days_per_year} Days</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        type.is_paid_leave ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {type.is_paid_leave ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingCategory(type);
                          setCategoryName(type.name);
                          setCategoryDesc(type.description || '');
                          setCategoryMaxDays(type.max_days_per_year);
                          setCategoryIsPaid(type.is_paid_leave);
                          setShowCategoryModal(true);
                        }}
                        className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(type.id)}
                        className="text-[11px] font-black text-rose-600 dark:text-rose-450 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Apply Leave Request */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 dark:text-slate-100">Apply Time Off</h3>
              <button onClick={() => setShowApplyModal(false)} className="rounded p-1 hover:bg-slate-105">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Leave Category *</label>
                <select
                  value={applyType}
                  onChange={(e) => setApplyType(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {leaveTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Start Date *</label>
                  <input
                    required
                    type="date"
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">End Date *</label>
                  <input
                    required
                    type="date"
                    value={applyEndDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Conflict indicator notifications */}
              {(conflictOverlap || conflictBalance || conflictDuplicate) && (
                <div className="rounded-lg p-3.5 bg-rose-50 border border-rose-300 text-rose-800 space-y-1 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
                  <div className="flex items-center space-x-1.5 text-xs font-black">
                    <AlertCircle className="h-4 w-4" />
                    <span>Leave Request Conflict Detected</span>
                  </div>
                  <ul className="list-disc pl-4 text-[10px] font-bold">
                    {conflictOverlap && <li>Conflict: Dates overlap with an active existing leave request.</li>}
                    {conflictBalance && <li>Conflict: Requested duration exceeds remaining leave balance.</li>}
                    {conflictDuplicate && <li>Conflict: Exact duplicate date range and category detected.</li>}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Justification Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="Detail the reason for requesting time off..."
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 border border-slate-300 rounded-lg py-2.5 text-xs font-bold text-slate-705 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isLoading || conflictOverlap || conflictBalance || conflictDuplicate}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 disabled:opacity-40"
                >
                  {isLoading ? 'Submitting...' : 'Apply Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reject Leave Request with comments */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl border border-slate-205 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-900 dark:text-slate-100">Reject Application Reason</h3>
              <button onClick={() => setShowRejectModal(false)} className="rounded p-1">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-705 dark:text-slate-200">Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Detail why this application is rejected..."
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2 text-xs font-bold text-slate-850 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 border border-slate-300 rounded-lg py-2 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 text-white rounded-lg py-2 text-xs font-extrabold hover:bg-rose-700"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Category Add/Edit */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 dark:text-slate-100">
                {editingCategory ? 'Edit Leave Category' : 'Create Leave Category'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="rounded p-1">
                <X className="h-4 w-4 text-slate-505" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">Category Name *</label>
                <input
                  required
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Annual Leave, Casual Leave"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-850 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">Max Days Per Year *</label>
                <input
                  required
                  type="number"
                  value={categoryMaxDays}
                  onChange={(e) => setCategoryMaxDays(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-850 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="categoryIsPaid"
                  type="checkbox"
                  checked={categoryIsPaid}
                  onChange={(e) => setCategoryIsPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="categoryIsPaid" className="text-xs font-bold text-slate-700 dark:text-slate-200">This is a Paid Category</label>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205">Description</label>
                <textarea
                  rows={2}
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="Enter details or eligibility rules..."
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2 text-xs font-bold text-slate-850 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 border border-slate-300 rounded-lg py-2.5 text-xs font-bold text-slate-705 dark:border-slate-700 dark:text-slate-300"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
