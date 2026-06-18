import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/employeeService';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
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
  CalendarDays
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
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

  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'Overview' | 'Calendar' | 'Categories'>('Overview');

  // State Management
  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: number; name: string; max_days_per_year: number; is_paid_leave: boolean; description?: string }>>([]);
  const [reports, setReports] = useState<any>({
    total_requests: 0,
    approved_requests: 0,
    pending_requests: 0,
    rejected_requests: 0,
    department_distribution: {}
  });

  // Category management states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryMaxDays, setCategoryMaxDays] = useState(15);
  const [categoryIsPaid, setCategoryIsPaid] = useState(true);

  // Calendar states
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calDeptFilter, setCalDeptFilter] = useState<string>('All');
  const [calEmpFilter, setCalEmpFilter] = useState<string>('All');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  // UI States
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [applyType, setApplyType] = useState<string>('');
  const [applyStartDate, setApplyStartDate] = useState<string>('');
  const [applyEndDate, setApplyEndDate] = useState<string>('');
  const [applyReason, setApplyReason] = useState('');

  // Conflict state flags
  const [conflictOverlap, setConflictOverlap] = useState(false);
  const [conflictBalance, setConflictBalance] = useState(false);
  const [conflictDuplicate, setConflictDuplicate] = useState(false);

  // Filters and Pagination
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // Load config & categories
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
    if (isHR) {
      try {
        const rep = await leaveService.getLeaveReports();
        if (rep) setReports(rep);
      } catch (err) {
        console.error('Failed to load leave reports:', err);
      }
    }
  };

  useEffect(() => {
    loadCategories();
    loadReports();
    if (isHR) {
      employeeService.getDepartments().then(setDepartments).catch(console.error);
    }
  }, [isHR, leaveRequests]);

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

    // Duration
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Balance check
    const balanceObj = leaveBalances.find(b => b.leave_type_name.toLowerCase().includes(applyType.toLowerCase()));
    setConflictBalance(balanceObj ? diffDays > balanceObj.remaining_days : false);

    // Overlap & Duplicate check
    let overlapFound = false;
    let duplicateFound = false;

    // Check against historyRequests for requesting employee (owner)
    const personalRequests = leaveRequests.filter(req => isHR || req.employeeName === user?.name);

    personalRequests.forEach(req => {
      if (req.status === 'REJECTED' || req.status === 'CANCELLED' || req.status === 'Cancelled') return;
      
      const parts = req.dates.split(' - ');
      if (parts[0] && parts[1]) {
        const reqStart = new Date(parts[0]);
        const reqEnd = new Date(parts[1]);

        // Overlap Condition: (StartA <= EndB) and (EndA >= StartB)
        if (start <= reqEnd && end >= reqStart) {
          overlapFound = true;
          // Duplicate condition: same dates and type
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

  // Category Actions
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
        addNotification(`Category ${categoryName} updated successfully.`, 'success');
      } else {
        await leaveService.createLeaveType(payload);
        addNotification(`Category ${categoryName} created successfully.`, 'success');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDesc('');
      setCategoryMaxDays(15);
      setCategoryIsPaid(true);
      await loadCategories();
      refreshData();
    } catch (err) {
      console.error(err);
      addNotification('Error saving leave category.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setCategoryMaxDays(cat.max_days_per_year || 15);
    setCategoryIsPaid(cat.is_paid_leave !== false);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category? Any associated request might trigger database errors.')) return;
    setIsLoading(true);
    try {
      const success = await leaveService.deleteLeaveType(id);
      if (success) {
        addNotification('Category deleted successfully.', 'success');
        await loadCategories();
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

  // Apply Leave Submit
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
      addNotification('Cannot apply. Overlapping request dates detected.', 'warning');
      return;
    }

    if (conflictBalance) {
      addNotification('Cannot apply. Insufficient leave balance.', 'warning');
      return;
    }

    // Calculate requested duration
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    setIsLoading(true);
    try {
      await addLeaveRequest({
        employeeName: user?.name || 'Claimant',
        employeeAvatar: user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        leaveType: applyType as any,
        reason: applyReason,
        dates: `${applyStartDate} - ${applyEndDate}`,
        duration: `${diffDays} Days`
      });
      
      // Reset form
      setApplyStartDate('');
      setApplyEndDate('');
      setApplyReason('');
      setShowApplyModal(false);
    } catch (err) {
      console.error(err);
      addNotification('Failed to submit leave application.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Approvals Actions
  const handleApprove = async (id: string) => {
    setIsLoading(true);
    try {
      await updateLeaveRequestStatus(id, 'APPROVED');
    } catch (err) {
      console.error(err);
      addNotification('Approve action failed.', 'warning');
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
      setShowRejectModal(false);
      setRejectingRequestId(null);
    } catch (err) {
      console.error(err);
      addNotification('Reject action failed.', 'warning');
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

  // Radial progress indicators for leave types
  const balances = React.useMemo(() => {
    const getBalanceColor = (type: string) => {
      if (type.toLowerCase().includes('annual')) return 'stroke-blue-600 dark:stroke-blue-500';
      if (type.toLowerCase().includes('sick')) return 'stroke-emerald-600 dark:stroke-emerald-500';
      if (type.toLowerCase().includes('casual')) return 'stroke-indigo-600 dark:stroke-indigo-500';
      if (type.toLowerCase().includes('personal')) return 'stroke-pink-600 dark:stroke-pink-400';
      return 'stroke-amber-500 dark:stroke-amber-400';
    };

    return leaveBalances.map((bal) => {
      const total = Number(bal.allocated_days) || 15;
      const rem = Number(bal.remaining_days) || 0;
      const used = total - rem;
      const percent = total > 0 ? Math.round((used / total) * 100) : 0;
      return {
        type: bal.leave_type_name.split(' ')[0], // short name
        fullName: bal.leave_type_name,
        used,
        total,
        percent,
        color: getBalanceColor(bal.leave_type_name)
      };
    });
  }, [leaveBalances]);

  // Filtering list logic
  const filteredRequests = leaveRequests.filter(req => {
    const matchesStatus = statusFilter === 'All' || req.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesType = typeFilter === 'All' || req.leaveType.toLowerCase().includes(typeFilter.toLowerCase());
    return matchesStatus && matchesType;
  });

  // Pagination bounds calculation
  const startIndex = (page - 1) * pageSize;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;

  // Chart data from reports api
  const reportChartData = React.useMemo(() => {
    if (!reports.department_distribution) return [];
    return Object.entries(reports.department_distribution).map(([dept, val]) => ({
      name: dept,
      Leaves: val
    }));
  }, [reports]);

  const statsData = React.useMemo(() => {
    return [
      { name: 'Approved', value: reports.approved_requests || 0, color: '#10b981' },
      { name: 'Pending', value: reports.pending_requests || 0, color: '#f59e0b' },
      { name: 'Rejected', value: reports.rejected_requests || 0, color: '#ef4444' }
    ].filter(s => s.value > 0);
  }, [reports]);

  // Dynamic Calendar builder logic for Month View
  const calendarMonthData = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = endOfMonth.getDate();
    const startOffset = startOfMonth.getDay(); // 0 is Sunday, 1 is Monday...

    const dayGrid = [];

    // Fill offset days from previous month
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
      const activeDate = new Date(year, month, d);
      dayGrid.push({
        num: d,
        date: activeDate,
        isCurrentMonth: true,
        leaves: [] as any[]
      });
    }

    // Fill remaining days to hit multiple of 7
    const remaining = (7 - (dayGrid.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      dayGrid.push({
        num: d,
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
        leaves: []
      });
    }

    // Map leaveRequests onto calendar grid days
    dayGrid.forEach(gridDay => {
      const dVal = gridDay.date;
      dVal.setHours(0,0,0,0);

      leaveRequests.forEach(req => {
        // Skip Rejected or Cancelled leaves
        if (req.status === 'REJECTED' || req.status === 'CANCELLED' || req.status === 'Cancelled') return;

        const parts = req.dates.split(' - ');
        if (parts[0] && parts[1]) {
          const reqStart = new Date(parts[0]);
          reqStart.setHours(0,0,0,0);
          const reqEnd = new Date(parts[1]);
          reqEnd.setHours(0,0,0,0);

          if (dVal >= reqStart && dVal <= reqEnd) {
            // Check filters
            let matched = true;
            if (calEmpFilter !== 'All') {
              // Find matching employee by name
              const empRecord = employees.find(e => e.id === calEmpFilter);
              if (empRecord && req.employeeName !== empRecord.name) {
                matched = false;
              }
            }
            if (calDeptFilter !== 'All' && matched) {
              const empRecord = employees.find(e => e.name === req.employeeName);
              if (empRecord && empRecord.department !== calDeptFilter) {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER BAR */}
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">Leave Management</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {isHR ? 'Monitor company-wide availability, configure balances, and manage team holiday approvals' : 'View your remaining balances, check request status, and submit time off'}
          </p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Apply Time Off</span>
        </button>
      </div>

      {/* TABS SELECTION */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 space-x-6 text-xs font-bold text-slate-400">
        <button 
          onClick={() => setActiveSubTab('Overview')}
          className={`pb-3 border-b-2 transition ${activeSubTab === 'Overview' ? 'border-blue-600 text-blue-600 dark:text-sky-450' : 'border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          Overview Logs
        </button>
        <button 
          onClick={() => setActiveSubTab('Calendar')}
          className={`pb-3 border-b-2 transition ${activeSubTab === 'Calendar' ? 'border-blue-600 text-blue-600 dark:text-sky-450' : 'border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          Team Calendar Overlay
        </button>
        {isHR && (
          <button 
            onClick={() => setActiveSubTab('Categories')}
            className={`pb-3 border-b-2 transition ${activeSubTab === 'Categories' ? 'border-blue-600 text-blue-600 dark:text-sky-450' : 'border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            Leave Categories (HR Only)
          </button>
        )}
      </div>

      {activeSubTab === 'Overview' && (
        <>
          {/* DYNAMIC LEAVE BALANCES RADIAL ROW */}
          {balances.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              {balances.map((bal, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center dark:border-slate-805 dark:bg-slate-850 flex flex-col items-center hover:shadow-md transition duration-150">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{bal.fullName}</span>
                  
                  <div className="relative flex h-18 w-18 items-center justify-center my-3">
                    <svg className="absolute transform -rotate-90" width="72" height="72">
                      <circle cx="36" cy="36" r="28" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="5.5" fill="transparent" />
                      <circle cx="36" cy="36" r="28" stroke="currentColor" className={`${bal.color} transition-all duration-300`} strokeWidth="5.5" fill="transparent"
                        strokeDasharray={175.8}
                        strokeDashoffset={175.8 - (175.8 * bal.percent) / 100} 
                      />
                    </svg>
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-none">
                      {bal.used}/{bal.total} <br/> <span className="text-[8px] font-semibold text-slate-400">Days</span>
                    </span>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 leading-tight">
                    Used: {bal.percent}% <br /> 
                    <span className="text-slate-705 dark:text-slate-350">{bal.total - bal.used} days remaining</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-850/20">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              <span>No leave balance allocated for this fiscal cycle.</span>
            </div>
          )}

          {/* CORE ACTIVE REQUESTS & PLANNING GRID */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Left Columns: Ledger Requests */}
            <div className="space-y-4 lg:col-span-2">
              
              {/* SEARCH & FILTERS BAR */}
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Time-Off Requests Log</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type Filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Categories</option>
                    {leaveTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* TABLE LOG */}
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                        <th className="px-6 py-3.5">Employee</th>
                        <th className="px-6 py-3.5">Leave Type</th>
                        <th className="px-6 py-3.5">Reason</th>
                        <th className="px-6 py-3.5">Dates</th>
                        <th className="px-6 py-3.5">Duration</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-slate-405">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                              <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing leave requests...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center space-y-2 py-4">
                              <FileText className="h-8 w-8 text-slate-350" />
                              <span className="font-bold text-xs text-slate-850 dark:text-slate-300">No requests found</span>
                              <span className="text-[10px] text-slate-450 max-w-xs leading-normal">
                                No active or historical leave records match the filters you have configured.
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-2.5">
                                <img src={req.employeeAvatar} alt="Emp" className="h-7 w-7 rounded-full object-cover border border-slate-100 dark:border-slate-800" />
                                <span className="font-extrabold text-slate-850 dark:text-slate-200 leading-tight">{req.employeeName}</span>
                              </div>
                            </td>

                            <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{req.leaveType}</td>
                            <td className="px-6 py-3.5 text-slate-400 dark:text-slate-500 font-medium max-w-xs truncate" title={req.reason}>
                              {req.reason}
                            </td>
                            <td className="px-6 py-3.5 text-slate-650 dark:text-slate-350 font-mono text-[11px]">{req.dates}</td>
                            <td className="px-6 py-3.5 text-slate-600 dark:text-slate-450">{req.duration}</td>
                            
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-l-4 border-emerald-500'
                                  : req.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-l-4 border-amber-500 animate-pulse'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-l-4 border-rose-500'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border-l-4 border-slate-500'
                              }`}>
                                {req.status}
                              </span>
                            </td>

                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {req.status === 'PENDING' ? (
                                  isHR ? (
                                    <>
                                      <button
                                        onClick={() => handleApprove(req.id)}
                                        title="Approve Request"
                                        className="rounded p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenRejectModal(req.id)}
                                        title="Reject Request"
                                        className="rounded p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleCancelRequest(req.id)}
                                      title="Cancel Pending Application"
                                      className="rounded p-1 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">Locked</span>
                                )}
                              </div>
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION PANEL */}
                {filteredRequests.length > pageSize && (
                  <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3 dark:border-slate-800/80 dark:bg-slate-850">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">
                      Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredRequests.length)} of {filteredRequests.length} requests
                    </span>
                    
                    <div className="flex space-x-1">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="inline-flex h-7.5 items-center px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Side: Charts & Aggregates */}
            <div className="space-y-6">
              
              {/* HR REPORTS AND ANALYTICS BAR CHART */}
              {isHR && reportChartData.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 dark:border-slate-800">
                    Leaves by Department
                  </h4>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 8 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 8 }} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="Leaves" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* DYNAMIC REQUEST STATUS RATIO PIE CHART */}
              {isHR && statsData.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 dark:border-slate-800">
                    Request Summary Ratios
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="h-24 w-24">
                      <PieChart width={96} height={96}>
                        <Pie data={statsData} innerRadius={18} outerRadius={28} dataKey="value">
                          {statsData.map((e: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={e.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </div>
                    <div className="flex-1 pl-4 space-y-1 text-[10px] font-bold text-slate-500">
                      {statsData.map((entry: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}</span>
                          </div>
                          <span className="text-slate-850 dark:text-white">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {activeSubTab === 'Calendar' && (
        <div className="space-y-4">
          {/* Calendar Navigation & Filters Control Bar */}
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Nav controls */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={handlePrevMonth} 
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                onClick={handleNextMonth} 
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Department Filter */}
              {isHR && (
                <div>
                  <select
                    value={calDeptFilter}
                    onChange={(e) => setCalDeptFilter(e.target.value)}
                    className="h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {/* Employee Filter */}
              {isHR && (
                <div>
                  <select
                    value={calEmpFilter}
                    onChange={(e) => setCalEmpFilter(e.target.value)}
                    className="h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Employees</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
            </div>

          </div>

          {/* Monthly Calendar Grid Layout */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-50 dark:border-slate-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                <div key={dayName}>{dayName}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 mt-3 min-h-[300px]">
              {calendarMonthData.map((cell, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 min-h-[70px] rounded-lg border flex flex-col justify-between transition-all ${
                    cell.isCurrentMonth 
                      ? 'bg-slate-50/40 border-slate-100 dark:bg-slate-900/10 dark:border-slate-800' 
                      : 'bg-slate-100/30 border-slate-100/50 text-slate-400 dark:bg-slate-900/5 dark:border-slate-850/40 dark:text-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold leading-none">{cell.num}</span>
                  
                  {/* Leaves on this day */}
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[50px] scrollbar-none">
                    {cell.leaves.map((lv, lidx) => (
                      <div 
                        key={lidx} 
                        title={`${lv.employeeName} (${lv.leaveType}): ${lv.reason}`}
                        className={`text-[8px] px-1 py-0.5 rounded font-black truncate max-w-full ${
                          lv.status === 'APPROVED' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l border-emerald-500' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-l border-amber-500'
                        }`}
                      >
                        {lv.employeeName.split(' ')[0]} - {lv.leaveType.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-[9px] font-bold text-slate-400 pt-3 border-t border-slate-50 dark:border-slate-800">
              <span className="flex items-center"><span className="h-2 w-2 rounded bg-emerald-500 mr-1" /> Approved Leaves</span>
              <span className="flex items-center"><span className="h-2 w-2 rounded bg-amber-500 mr-1" /> Pending Leaves</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'Categories' && isHR && (
        <div className="space-y-4">
          <div className="flex justify-between items-center rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Leave Categories Configuration</h3>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryName('');
                setCategoryDesc('');
                setCategoryMaxDays(15);
                setCategoryIsPaid(true);
                setShowCategoryModal(true);
              }}
              className="inline-flex h-8 items-center space-x-1 rounded-md bg-blue-600 px-3 text-[10px] font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Category</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                  <th className="px-6 py-3.5">Category Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Max Days Per Year</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                {leaveTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{type.name}</td>
                    <td className="px-6 py-3.5 text-slate-400 dark:text-slate-500 max-w-sm truncate">{type.description || '-'}</td>
                    <td className="px-6 py-3.5 font-mono">{type.max_days_per_year} Days</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        type.is_paid_leave !== false
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        {type.is_paid_leave !== false ? 'Paid Leave' : 'Unpaid Leave'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditCategory(type)}
                          className="text-xs font-bold text-blue-500 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(type.id)}
                          className="text-xs font-bold text-rose-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Apply Leave */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-155">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Apply Time Off</h3>
              <button onClick={() => setShowApplyModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Leave Category</label>
                <select
                  value={applyType}
                  onChange={(e) => setApplyType(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                >
                  {leaveTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Start Date</label>
                  <input
                    required
                    type="date"
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">End Date</label>
                  <input
                    required
                    type="date"
                    value={applyEndDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Conflict Pre-flight Validations Panel */}
              {(conflictOverlap || conflictBalance || conflictDuplicate) && (
                <div className="rounded-lg p-3 bg-rose-50/80 border border-rose-200/50 dark:bg-rose-950/20 dark:border-rose-900/30 text-xs font-bold text-rose-600 dark:text-rose-400 space-y-1.5">
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>Conflict Validations Detected</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                    {conflictOverlap && <li>Warning: Overlapping leave request dates detected for these dates.</li>}
                    {conflictBalance && <li>Warning: Insufficient remaining leave balance for this type.</li>}
                    {conflictDuplicate && <li>Warning: Exact duplicate leave request dates detected in database.</li>}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Reason / Justification</label>
                <textarea
                  required
                  rows={3}
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="Justification for time off request"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-705 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-305"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isLoading || conflictOverlap || conflictBalance || conflictDuplicate}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Submitting...' : 'Register Application'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Leave Category Create/Edit */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-155">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingCategory ? 'Edit Leave Category' : 'Create Leave Category'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Category Name</label>
                <input
                  required
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Annual Leave, Casual Leave"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Max Days Per Year</label>
                <input
                  required
                  type="number"
                  value={categoryMaxDays}
                  onChange={(e) => setCategoryMaxDays(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  id="categoryIsPaid"
                  type="checkbox"
                  checked={categoryIsPaid}
                  onChange={(e) => setCategoryIsPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="categoryIsPaid" className="text-xs font-bold text-slate-700 dark:text-slate-300">This is a Paid Category</label>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="Provide brief details about this category rule"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-808 dark:border-slate-808 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98]"
                >
                  {isLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reject Leave Request */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-155">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Reject Leave Application</h3>
              <button onClick={() => setShowRejectModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Rejection Justification</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-808 dark:border-slate-808 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-rose-600 text-white rounded-lg py-2 text-xs font-extrabold hover:bg-rose-700 active:scale-[0.98]"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
