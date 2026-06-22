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
  RefreshCw
} from 'lucide-react';
import { LeaveRequest } from '../../types';

export default function TeamCalendar() {
  const { 
    user, 
    leaveRequests, 
    employees, 
    leaveBalances,
    refreshData,
    isLoading: contextLoading
  } = useHR();

  // Role check
  const isAdmin = user?.role === 'ADMIN';
  const isHR = user?.role === 'HR';
  const isEmployee = user?.role === 'EMPLOYEE';

  // Navigation & view states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'day'>('month');
  
  // Filter states
  const [calDeptFilter, setCalDeptFilter] = useState<string>('All');
  const [calEmpFilter, setCalEmpFilter] = useState<string>('All');
  const [calHrFilter, setCalHrFilter] = useState<string>('All');
  const [calTypeFilter, setCalTypeFilter] = useState<string>('All');
  const [calStatusFilter, setCalStatusFilter] = useState<string>('All');
  const [calStartDateFilter, setCalStartDateFilter] = useState<string>('');
  const [calEndDateFilter, setCalEndDateFilter] = useState<string>('');

  // Loading/error states
  const [hasError, setHasError] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  // Modal state
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<LeaveRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    employeeService.getDepartments().then(setDepartments).catch(() => setHasError(true));
  }, []);

  const handleRetry = async () => {
    setHasError(false);
    try {
      await refreshData();
    } catch {
      setHasError(true);
    }
  };

  // 10. ROLE PERMISSIONS
  // Admin: See all leaves
  // HR: See assigned employees only
  // Employee: See own leaves only
  const roleFilteredRequests = React.useMemo(() => {
    if (!user) return [];
    if (isAdmin || user.is_superuser) {
      return leaveRequests;
    }
    if (isHR) {
      return leaveRequests.filter(req => {
        const isOwn = req.employeeName.toLowerCase() === user.name.toLowerCase();
        const emp = employees.find(e => e.name === req.employeeName);
        const isAssigned = emp && (emp.assigned_hr === user.id || emp.assigned_hr_name === user.username);
        return isOwn || isAssigned;
      });
    }
    // Employee
    return leaveRequests.filter(req => req.employeeName.toLowerCase() === user.name.toLowerCase());
  }, [leaveRequests, user, employees, isAdmin, isHR]);

  // Helper to check if a leave request matches all active filters
  const matchesCalendarFilters = React.useCallback((req: LeaveRequest) => {
    // 1. Employee Filter
    if (calEmpFilter !== 'All') {
      const matchedEmp = employees.find(e => e.id === calEmpFilter || e.name === calEmpFilter);
      if (!matchedEmp || req.employeeName !== matchedEmp.name) {
        return false;
      }
    }

    // 2. Department Filter
    if (calDeptFilter !== 'All') {
      const matchedEmp = employees.find(e => e.name === req.employeeName);
      if (!matchedEmp || matchedEmp.department !== calDeptFilter) {
        return false;
      }
    }

    // 3. HR Filter
    if (calHrFilter !== 'All') {
      const matchedEmp = employees.find(e => e.name === req.employeeName);
      if (!matchedEmp) return false;
      const empHr = String(matchedEmp.assigned_hr || '');
      const empHrName = matchedEmp.assigned_hr_name || '';
      if (empHr !== calHrFilter && empHrName !== calHrFilter) {
        return false;
      }
    }

    // 4. Leave Type Filter
    if (calTypeFilter !== 'All') {
      if (!req.leaveType.toLowerCase().includes(calTypeFilter.toLowerCase())) {
        return false;
      }
    }

    // 5. Status Filter
    if (calStatusFilter !== 'All') {
      if (req.status.toUpperCase() !== calStatusFilter.toUpperCase()) {
        return false;
      }
    }

    // 6. Date Range Filter (Start Date)
    if (calStartDateFilter) {
      const filterStart = new Date(calStartDateFilter + 'T00:00:00');
      if (req.endDate) {
        const reqEnd = new Date(req.endDate + 'T00:00:00');
        if (reqEnd < filterStart) return false;
      }
    }

    // 7. Date Range Filter (End Date)
    if (calEndDateFilter) {
      const filterEnd = new Date(calEndDateFilter + 'T00:00:00');
      if (req.startDate) {
        const reqStart = new Date(req.startDate + 'T00:00:00');
        if (reqStart > filterEnd) return false;
      }
    }

    return true;
  }, [calEmpFilter, calDeptFilter, calHrFilter, calTypeFilter, calStatusFilter, calStartDateFilter, calEndDateFilter, employees]);

  // Analytics computation for Leave Analytics Panel
  const calendarAnalytics = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const onLeaveToday = roleFilteredRequests.filter(req => {
      if (req.status !== 'APPROVED' || !req.startDate || !req.endDate) return false;
      const s = new Date(req.startDate + 'T00:00:00');
      const e = new Date(req.endDate + 'T00:00:00');
      return today >= s && today <= e;
    });

    const pendingApprovals = roleFilteredRequests.filter(req => req.status === 'PENDING');

    const approvedThisMonth = roleFilteredRequests.filter(req => {
      if (req.status !== 'APPROVED' || !req.startDate) return false;
      const s = new Date(req.startDate + 'T00:00:00');
      return s.getMonth() === currentMonth && s.getFullYear() === currentYear;
    });

    const upcomingLeaves = roleFilteredRequests.filter(req => {
      if (req.status !== 'APPROVED' || !req.startDate) return false;
      const s = new Date(req.startDate + 'T00:00:00');
      return s > today;
    }).sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());

    let totalAllocated = 0;
    let totalRemaining = 0;
    leaveBalances.forEach(b => {
      totalAllocated += Number(b.allocated_days) || 0;
      totalRemaining += Number(b.remaining_days) || 0;
    });
    const used = totalAllocated - totalRemaining;
    const utilization = totalAllocated > 0 ? Math.round((used / totalAllocated) * 100) : 0;

    return {
      onLeaveToday,
      pendingApprovals,
      approvedThisMonth,
      upcomingLeaves,
      utilization
    };
  }, [roleFilteredRequests, leaveBalances]);

  // Dynamic leave conflicts list
  const leaveConflictsList = React.useMemo(() => {
    const conflicts: Array<{ req1: LeaveRequest; req2: LeaveRequest; date: string }> = [];
    const activeRequests = roleFilteredRequests.filter(r => r.status === 'APPROVED' || r.status === 'PENDING');

    for (let i = 0; i < activeRequests.length; i++) {
      for (let j = i + 1; j < activeRequests.length; j++) {
        const r1 = activeRequests[i];
        const r2 = activeRequests[j];

        if (r1.startDate && r1.endDate && r2.startDate && r2.endDate) {
          const s1 = new Date(r1.startDate + 'T00:00:00');
          const e1 = new Date(r1.endDate + 'T00:00:00');
          const s2 = new Date(r2.startDate + 'T00:00:00');
          const e2 = new Date(r2.endDate + 'T00:00:00');

          if (s1 <= e2 && s2 <= e1) {
            const emp1 = employees.find(e => e.name === r1.employeeName);
            const emp2 = employees.find(e => e.name === r2.employeeName);
            if (emp1 && emp2 && emp1.department === emp2.department) {
              conflicts.push({
                req1: r1,
                req2: r2,
                date: `${r1.startDate} to ${r1.endDate} overlaps with ${r2.startDate} to ${r2.endDate}`
              });
            }
          }
        }
      }
    }
    return conflicts;
  }, [roleFilteredRequests, employees]);

  // Month Grid
  const calendarMonthGrid = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = endOfMonth.getDate();
    const startOffset = startOfMonth.getDay();

    const dayGrid = [];

    const prevMonthEnd = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      dayGrid.push({
        num: prevMonthEnd - i,
        date: new Date(year, month - 1, prevMonthEnd - i),
        isCurrentMonth: false,
        leaves: [] as LeaveRequest[]
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      dayGrid.push({
        num: d,
        date: new Date(year, month, d),
        isCurrentMonth: true,
        leaves: [] as LeaveRequest[]
      });
    }

    const remaining = (7 - (dayGrid.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      dayGrid.push({
        num: d,
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
        leaves: [] as LeaveRequest[]
      });
    }

    dayGrid.forEach(gridDay => {
      const dVal = new Date(gridDay.date.getTime());
      dVal.setHours(0,0,0,0);

      roleFilteredRequests.forEach(req => {
        if (req.status === 'CANCELLED') return;
        if (req.startDate && req.endDate) {
          const reqStart = new Date(req.startDate + 'T00:00:00');
          const reqEnd = new Date(req.endDate + 'T00:00:00');

          if (dVal >= reqStart && dVal <= reqEnd) {
            if (matchesCalendarFilters(req)) {
              gridDay.leaves.push(req);
            }
          }
        }
      });
    });

    return dayGrid;
  }, [currentDate, roleFilteredRequests, matchesCalendarFilters]);

  // Week Grid
  const calendarWeekGrid = React.useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        date: d,
        leaves: [] as LeaveRequest[]
      });
    }

    days.forEach(gridDay => {
      const dVal = new Date(gridDay.date.getTime());
      dVal.setHours(0,0,0,0);

      roleFilteredRequests.forEach(req => {
        if (req.status === 'CANCELLED') return;
        if (req.startDate && req.endDate) {
          const reqStart = new Date(req.startDate + 'T00:00:00');
          const reqEnd = new Date(req.endDate + 'T00:00:00');

          if (dVal >= reqStart && dVal <= reqEnd) {
            if (matchesCalendarFilters(req)) {
              gridDay.leaves.push(req);
            }
          }
        }
      });
    });

    return days;
  }, [currentDate, roleFilteredRequests, matchesCalendarFilters]);

  // Day Grid
  const calendarDayGrid = React.useMemo(() => {
    const dVal = new Date(currentDate.getTime());
    dVal.setHours(0,0,0,0);

    const leaves: LeaveRequest[] = [];
    roleFilteredRequests.forEach(req => {
      if (req.status === 'CANCELLED') return;
      if (req.startDate && req.endDate) {
        const reqStart = new Date(req.startDate + 'T00:00:00');
        const reqEnd = new Date(req.endDate + 'T00:00:00');

        if (dVal >= reqStart && dVal <= reqEnd) {
          if (matchesCalendarFilters(req)) {
            leaves.push(req);
          }
        }
      }
    });
    return leaves;
  }, [currentDate, roleFilteredRequests, matchesCalendarFilters]);

  const getLeaveStyle = (req: LeaveRequest) => {
    const typeLower = req.leaveType.toLowerCase();
    const statusUpper = req.status.toUpperCase();
    
    if (typeLower.includes('half') || typeLower.includes('half day')) {
      return { bg: 'bg-[#3B82F6]/20 border-[#3B82F6] text-white', dot: 'bg-[#3B82F6]' };
    }
    if (typeLower.includes('wfh') || typeLower.includes('work from home')) {
      return { bg: 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white', dot: 'bg-[#8B5CF6]' };
    }
    if (typeLower.includes('holiday') || typeLower.includes('public holiday')) {
      return { bg: 'bg-[#F97316]/20 border-[#F97316] text-white', dot: 'bg-[#F97316]' };
    }
    
    if (statusUpper === 'APPROVED') {
      return { bg: 'bg-[#22C55E]/20 border-[#22C55E] text-white', dot: 'bg-[#22C55E]' };
    }
    if (statusUpper === 'PENDING') {
      return { bg: 'bg-[#FACC15]/20 border-[#FACC15] text-white', dot: 'bg-[#FACC15]' };
    }
    if (statusUpper === 'REJECTED') {
      return { bg: 'bg-[#EF4444]/20 border-[#EF4444] text-white', dot: 'bg-[#EF4444]' };
    }
    
    return { bg: 'bg-slate-700/40 border-slate-600 text-slate-200', dot: 'bg-slate-500' };
  };

  const getDeptLeaveCount = (deptName: string) => {
    return roleFilteredRequests.filter(req => {
      if (req.status !== 'APPROVED') return false;
      const emp = employees.find(e => e.name === req.employeeName);
      return emp && emp.department === deptName;
    }).length;
  };

  // 6. LOADING STATE
  if (contextLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white bg-slate-950 p-6 rounded-xl border border-slate-800">
        <RefreshCw className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Team Calendar...</p>
      </div>
    );
  }

  // 7. ERROR STATE
  if (hasError) {
    return (
      <div className="backdrop-blur-md bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md mx-auto text-center space-y-4 my-20 text-white">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-black uppercase tracking-widest">Unable to load Team Calendar</h3>
        <p className="text-xs text-slate-400">There was an issue loading the employee leave records from the database.</p>
        <button
          onClick={handleRetry}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition active:scale-95"
        >
          Retry
        </button>
      </div>
    );
  }

  // 8. EMPTY STATE
  if (roleFilteredRequests.length === 0) {
    return (
      <div className="backdrop-blur-md bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md mx-auto text-center space-y-4 my-20 text-white">
        <CalendarIcon className="h-16 w-16 text-slate-600 mx-auto" />
        <h3 className="text-base font-black uppercase tracking-widest">No leave records found</h3>
        <p className="text-xs text-slate-400">We couldn't find any leave requests logged in the database for your access scope.</p>
        <button
          onClick={handleRetry}
          className="px-6 py-2.5 bg-blue-650 hover:bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-wider transition active:scale-95 border border-slate-800"
        >
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white bg-slate-950 p-6 rounded-2xl border border-slate-900">
      
      {/* LEAVE ANALYTICS PANEL */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">On Leave Today</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">{calendarAnalytics.onLeaveToday.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Staff</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 truncate">
            {calendarAnalytics.onLeaveToday.slice(0, 2).map(r => r.employeeName).join(', ') || 'No one on leave'}
          </div>
        </div>

        <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pending Approvals</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-white group-hover:text-yellow-400 transition-colors">{calendarAnalytics.pendingApprovals.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Requests</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-405 truncate">
            Awaiting manager decision
          </div>
        </div>

        <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Approved Leaves (Month)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">{calendarAnalytics.approvedThisMonth.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-405 truncate">
            In this calendar period
          </div>
        </div>

        <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Upcoming Leaves</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-white group-hover:text-purple-400 transition-colors">{calendarAnalytics.upcomingLeaves.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Scheduled</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-405 truncate">
            Next scheduled starts
          </div>
        </div>

        <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Leave Utilization</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-white group-hover:text-orange-400 transition-colors">{calendarAnalytics.utilization}%</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Rate</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-805 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${calendarAnalytics.utilization}%` }} />
          </div>
        </div>
      </div>

      {/* MAIN CALENDAR GRID & CONTROLS LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-4">
        
        {/* LEFT / CENTER: CALENDAR WORKSPACE */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* NAVIGATION & VIEW SWITCHER */}
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  if (calendarViewMode === 'month') {
                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                  } else if (calendarViewMode === 'week') {
                    setCurrentDate(prev => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() - 7);
                      return d;
                    });
                  } else {
                    setCurrentDate(prev => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() - 1);
                      return d;
                    });
                  }
                }}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 transition active:scale-95"
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <h3 className="text-sm font-black uppercase font-mono tracking-wider text-white min-w-[150px] text-center">
                {calendarViewMode === 'month' && currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                {calendarViewMode === 'week' && `Week of ${new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay())).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                {calendarViewMode === 'day' && currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <button 
                onClick={() => {
                  if (calendarViewMode === 'month') {
                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                  } else if (calendarViewMode === 'week') {
                    setCurrentDate(prev => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() + 7);
                      return d;
                    });
                  } else {
                    setCurrentDate(prev => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() + 1);
                      return d;
                    });
                  }
                }}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 transition active:scale-95"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
              
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-white transition active:scale-95"
              >
                Today
              </button>
            </div>

            <div className="flex space-x-1 border border-slate-800 rounded-lg p-0.5 bg-slate-950/60">
              {(['month', 'week', 'day'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setCalendarViewMode(view)}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
                    calendarViewMode === view
                      ? 'bg-blue-600 text-white font-extrabold shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {view} View
                </button>
              ))}
            </div>
          </div>

          {/* FILTERS PANEL */}
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Calendar Filters & Range Query</h4>
              <button
                onClick={() => {
                  setCalDeptFilter('All');
                  setCalEmpFilter('All');
                  setCalHrFilter('All');
                  setCalTypeFilter('All');
                  setCalStatusFilter('All');
                  setCalStartDateFilter('');
                  setCalEndDateFilter('');
                }}
                className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:underline"
              >
                Clear All Filters
              </button>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Employee</label>
                <select
                  value={calEmpFilter}
                  onChange={(e) => setCalEmpFilter(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All Employees</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Assigned HR</label>
                <select
                  value={calHrFilter}
                  onChange={(e) => setCalHrFilter(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All HR Managers</option>
                  {Array.from(new Set(employees.map(e => e.assigned_hr_name).filter(Boolean))).map(hrName => (
                    <option key={hrName} value={hrName}>{hrName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Department</label>
                <select
                  value={calDeptFilter}
                  onChange={(e) => setCalDeptFilter(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Leave Type</label>
                <select
                  value={calTypeFilter}
                  onChange={(e) => setCalTypeFilter(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All Types</option>
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Maternity">Maternity Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Work From Home">Work From Home (WFH)</option>
                  <option value="Public Holiday">Public Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</label>
                <select
                  value={calStatusFilter}
                  onChange={(e) => setCalStatusFilter(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={calStartDateFilter}
                  onChange={(e) => setCalStartDateFilter(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={calEndDateFilter}
                  onChange={(e) => setCalEndDateFilter(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* CALENDAR VIEWS COMPONENT RENDERING */}
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl min-h-[450px]">
            
            {/* MONTH VIEW */}
            {calendarViewMode === 'month' && (
              <div>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-widest text-slate-400 pb-3 border-b border-slate-800">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-slate-400">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2 mt-3">
                  {calendarMonthGrid.map((cell, idx) => {
                    const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                    const isToday = cell.date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div
                        key={idx}
                        className={`p-2 min-h-[110px] rounded-lg border flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${
                          cell.isCurrentMonth
                            ? isWeekend 
                              ? 'bg-slate-950/40 border-slate-850/60 text-slate-400' 
                              : 'bg-slate-900/30 border-slate-800/80 text-white'
                            : 'bg-slate-950/20 border-slate-900/40 text-slate-600'
                        } ${
                          isToday 
                            ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-500' 
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black font-mono px-1 rounded ${isToday ? 'bg-blue-600 text-white' : ''}`}>
                            {cell.num}
                          </span>
                          {isWeekend && cell.isCurrentMonth && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">WE</span>
                          )}
                        </div>

                        <div className="mt-2 space-y-1.5 flex-1 max-h-[80px] overflow-y-auto pr-0.5">
                          {cell.leaves.map((lv, lidx) => {
                            const style = getLeaveStyle(lv);
                            const emp = employees.find(e => e.name === lv.employeeName);
                            return (
                              <div
                                key={lidx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeaveDetail(lv);
                                  setShowDetailModal(true);
                                }}
                                className={`text-[9px] p-1.5 rounded-md border font-bold cursor-pointer transition hover:bg-white/10 flex flex-col space-y-0.5 ${style.bg}`}
                              >
                                <div className="flex items-center space-x-1">
                                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                  <span className="font-extrabold truncate text-white leading-tight">{lv.employeeName}</span>
                                </div>
                                <div className="text-[8px] text-slate-350 truncate">{lv.leaveType}</div>
                                <div className="text-[7.5px] text-slate-400 flex items-center justify-between">
                                  <span>{emp?.department || 'Staff'}</span>
                                  <span className="font-extrabold uppercase text-[7px] tracking-wider">{lv.status}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WEEK VIEW */}
            {calendarViewMode === 'week' && (
              <div className="grid grid-cols-7 gap-3">
                {calendarWeekGrid.map((dayData, idx) => {
                  const isWeekend = dayData.date.getDay() === 0 || dayData.date.getDay() === 6;
                  const isToday = dayData.date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={idx}
                      className={`p-3 min-h-[350px] rounded-xl border flex flex-col justify-between transition-all duration-200 hover:scale-[1.01] ${
                        isWeekend
                          ? 'bg-slate-950/50 border-slate-900 text-slate-400'
                          : 'bg-slate-900/40 border-slate-800 text-white'
                      } ${
                        isToday 
                          ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-500' 
                          : ''
                      }`}
                    >
                      <div className="border-b border-slate-800 pb-2">
                        <span className="block text-[10px] font-black uppercase text-slate-505 tracking-wider">
                          {dayData.date.toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                        <span className={`text-base font-black font-mono leading-none ${isToday ? 'text-blue-400' : ''}`}>
                          {dayData.date.getDate()}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 flex-1 overflow-y-auto pr-0.5">
                        {dayData.leaves.map((lv, lidx) => {
                          const style = getLeaveStyle(lv);
                          const emp = employees.find(e => e.name === lv.employeeName);
                          return (
                            <div
                              key={lidx}
                              onClick={() => {
                                setSelectedLeaveDetail(lv);
                                setShowDetailModal(true);
                              }}
                              className={`p-2.5 rounded-lg border cursor-pointer hover:bg-white/10 transition flex flex-col space-y-1 ${style.bg}`}
                            >
                              <div className="flex items-center space-x-1.5">
                                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                                <span className="font-extrabold text-[10px] text-white truncate leading-tight">{lv.employeeName}</span>
                              </div>
                              <div className="text-[9px] text-slate-350">{lv.leaveType}</div>
                              <div className="text-[8px] text-slate-400 flex items-center justify-between border-t border-white/5 pt-1 mt-1 font-semibold">
                                <span>{emp?.department || 'Staff'}</span>
                                <span className="font-extrabold uppercase text-[7.5px] tracking-wider">{lv.status}</span>
                              </div>
                            </div>
                          );
                        })}
                        {dayData.leaves.length === 0 && (
                          <div className="h-full flex items-center justify-center text-[10px] text-slate-650 font-bold text-center py-20">
                            Clear
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DAY VIEW */}
            {calendarViewMode === 'day' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Leaves Scheduled for Today</span>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">{calendarDayGrid.length} Leave Events</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {calendarDayGrid.map((lv, lidx) => {
                    const style = getLeaveStyle(lv);
                    const emp = employees.find(e => e.name === lv.employeeName);
                    return (
                      <div
                        key={lidx}
                        onClick={() => {
                          setSelectedLeaveDetail(lv);
                          setShowDetailModal(true);
                        }}
                        className={`p-4 rounded-xl border cursor-pointer hover:scale-[1.01] transition duration-200 flex flex-col justify-between space-y-3 ${style.bg}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2.5">
                            <img src={lv.employeeAvatar} alt="" className="h-9 w-9 rounded-full object-cover border border-slate-800" />
                            <div>
                              <span className="font-extrabold text-sm text-white block leading-tight">{lv.employeeName}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{emp?.department || 'No Dept'}</span>
                            </div>
                          </div>
                          <span className="h-2 w-2 rounded-full mt-1" style={{ backgroundColor: style.dot.replace('bg-[', '').replace(']', '') }} />
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>{lv.leaveType}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">{lv.duration}</span>
                          </div>
                          <p className="text-[10px] text-slate-350 leading-relaxed line-clamp-2 italic">
                            "{lv.reason || 'No justification reason provided.'}"
                          </p>
                        </div>

                        <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                          <span>Approved By: {lv.approvedBy || 'System/Pending'}</span>
                          <span className="font-extrabold uppercase text-[8px] px-2 py-0.5 rounded-full border border-white/10 bg-black/20">
                            {lv.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {calendarDayGrid.length === 0 && (
                    <div className="col-span-full py-20 text-center backdrop-blur-xs bg-slate-900/10 border border-dashed border-slate-850 rounded-xl">
                      <AlertCircle className="h-8 w-8 text-slate-655 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Active Leaves</h4>
                      <p className="text-[10px] text-slate-600 font-bold mt-1">There are no leave records matching the active date and filters today.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT SIDE PANEL: ROLE-SPECIFIC ANALYTICS */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* HR WORKSPACE PANEL */}
          {(isHR || isAdmin) && (
            <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              <div className="border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  {isHR ? 'HR Team Scope Overview' : 'Admin Calendar Workspace'}
                </h4>
                <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">
                  {isHR ? 'Assigned Employee Timeoff' : 'All HR leaves & status check'}
                </p>
              </div>

              {/* CONFLICTS SUBPANEL */}
              <div className="space-y-2">
                <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Conflict Warning Panel</span>
                  <span className="px-1.5 py-0.5 bg-red-600/30 text-red-400 text-[8px] font-black rounded font-mono">
                    {leaveConflictsList.length} Alert{leaveConflictsList.length === 1 ? '' : 's'}
                  </span>
                </h5>
                
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {leaveConflictsList.map((conflict, cIdx) => (
                    <div key={cIdx} className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-[9px] space-y-1">
                      <div className="flex items-center justify-between font-black text-red-300">
                        <span>Overlapping leaves in {employees.find(e => e.name === conflict.req1.employeeName)?.department || 'same dept'}</span>
                        <AlertCircle className="h-3 w-3" />
                      </div>
                      <div className="text-slate-300 font-bold">
                        <span className="font-extrabold text-white block">{conflict.req1.employeeName} ({conflict.req1.leaveType})</span>
                        <span className="font-extrabold text-white block">{conflict.req2.employeeName} ({conflict.req2.leaveType})</span>
                      </div>
                      <div className="text-[8px] text-slate-500 font-mono mt-1">
                        Period: {conflict.date}
                      </div>
                    </div>
                  ))}
                  {leaveConflictsList.length === 0 && (
                    <div className="text-center py-6 text-slate-650 text-[10px] font-bold">
                      No concurrent conflicts detected.
                    </div>
                  )}
                </div>
              </div>

              {/* UPCOMING LEAVES PANEL */}
              <div className="space-y-2">
                <h5 className="text-[9px] font-black uppercase text-slate-405 tracking-wider">Upcoming Time Off</h5>
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                  {calendarAnalytics.upcomingLeaves.slice(0, 5).map((ul, uIdx) => {
                    const emp = employees.find(e => e.name === ul.employeeName);
                    return (
                      <div key={uIdx} className="p-2 rounded-lg bg-slate-950/40 border border-slate-805 text-[9px] flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 truncate">
                          <img src={ul.employeeAvatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                          <div className="truncate">
                            <span className="font-extrabold text-white block truncate leading-tight">{ul.employeeName}</span>
                            <span className="text-[8px] text-slate-455 font-bold uppercase tracking-widest">{ul.leaveType}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 text-slate-400 font-mono text-[8px] font-bold">
                          <div>{ul.startDate}</div>
                          <div className="text-slate-500">{ul.duration}</div>
                        </div>
                      </div>
                    );
                  })}
                  {calendarAnalytics.upcomingLeaves.length === 0 && (
                    <div className="text-center py-6 text-slate-650 text-[10px] font-bold">
                      No upcoming leaves planned.
                    </div>
                  )}
                </div>
              </div>

              {/* DEPARTMENT LEAVES SUMMARY */}
              <div className="space-y-2">
                <h5 className="text-[9px] font-black uppercase text-slate-405 tracking-wider">Department Counts</h5>
                <div className="space-y-1.5 text-[9px] font-bold text-slate-400">
                  {departments.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-center justify-between border-b border-slate-900 pb-1">
                      <span className="text-slate-400">{d.name}</span>
                      <span className="font-extrabold text-white font-mono">{getDeptLeaveCount(d.name)} Active</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* COLOR LEGEND STAYS ACTIVE */}
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Calendar Color Legends</h5>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded bg-[#22C55E]" />
                <span className="text-slate-300">Approved</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded bg-[#FACC15]" />
                <span className="text-slate-300">Pending</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded bg-[#EF4444]" />
                <span className="text-slate-300">Rejected</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded bg-[#3B82F6]" />
                <span className="text-slate-300">Half Day</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded bg-[#8B5CF6]" />
                <span className="text-slate-300">WFH</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded bg-[#F97316]" />
                <span className="text-slate-300">Holiday</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* DETAIL MODAL */}
      {showDetailModal && selectedLeaveDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-white">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-widest">Leave Event Details</h3>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedLeaveDetail(null);
                }} 
                className="rounded p-1 hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center space-x-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <img src={selectedLeaveDetail.employeeAvatar} alt="" className="h-12 w-12 rounded-full object-cover border border-slate-700" />
                <div>
                  <h4 className="font-extrabold text-base leading-tight">{selectedLeaveDetail.employeeName}</h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {selectedLeaveDetail.employeeRole || 'EMPLOYEE'} &bull; {selectedLeaveDetail.employeeDepartment || 'Staff'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Leave Type</span>
                  <span className="font-extrabold text-slate-200">{selectedLeaveDetail.leaveType}</span>
                </div>
                <div className="bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Status</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                    selectedLeaveDetail.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedLeaveDetail.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {selectedLeaveDetail.status}
                  </span>
                </div>
                <div className="bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Start Date</span>
                  <span className="font-bold text-slate-200 font-mono">{selectedLeaveDetail.startDate}</span>
                </div>
                <div className="bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">End Date</span>
                  <span className="font-bold text-slate-200 font-mono">{selectedLeaveDetail.endDate}</span>
                </div>
              </div>

              <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-850 text-xs">
                <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Reason / Justification</span>
                <p className="text-slate-300 leading-relaxed italic">
                  "{selectedLeaveDetail.reason || 'No justification reason provided.'}"
                </p>
              </div>

              {selectedLeaveDetail.status !== 'PENDING' && (
                <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-850 text-xs flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Processed By</span>
                    <span className="font-bold text-slate-200">{selectedLeaveDetail.approvedBy || 'System/Admin'}</span>
                  </div>
                  {selectedLeaveDetail.rejectionReason && (
                    <div className="text-right">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-red-400 mb-0.5">Rejection Comment</span>
                      <span className="font-bold text-red-300">{selectedLeaveDetail.rejectionReason}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedLeaveDetail(null);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
