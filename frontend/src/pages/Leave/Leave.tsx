import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { leaveService } from '../../services/leaveService';
import { 
  Calendar, 
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
  Trash2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
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

  // State Management
  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: number; name: string; max_days: number }>>([]);
  const [reports, setReports] = useState<any>({
    total_requests: 0,
    approved_requests: 0,
    pending_requests: 0,
    rejected_requests: 0,
    department_distribution: {}
  });

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

  // Filters and Pagination
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // Load leave types & reports
  useEffect(() => {
    const initData = async () => {
      try {
        const types = await leaveService.getLeaveTypes();
        setLeaveTypes(types);
        if (types.length > 0) {
          setApplyType(types[0].name);
        }

        if (isHR) {
          const rep = await leaveService.getLeaveReports();
          if (rep) setReports(rep);
        }
      } catch (err) {
        console.error('Failed to load leave configuration:', err);
      }
    };
    initData();
  }, [isHR, leaveRequests]);

  // Handle leave application with validations
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

    // Calculate requested duration
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Validate balance if available
    const balanceObj = leaveBalances.find(b => b.leave_type_name.toLowerCase().includes(applyType.toLowerCase()));
    if (balanceObj && diffDays > balanceObj.remaining_days) {
      addNotification(`Insufficient balance. You requested ${diffDays} days but only have ${balanceObj.remaining_days} remaining.`, 'warning');
      return;
    }

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

  // Action Triggers
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
    if (!window.confirm('Are you sure you want to cancel and delete this pending request?')) return;
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
      return 'stroke-slate-400';
    };

    return leaveBalances.map((bal) => {
      const used = bal.allocated_days - bal.remaining_days;
      const percent = bal.allocated_days > 0 ? Math.round((used / bal.allocated_days) * 100) : 0;
      return {
        type: bal.leave_type_name.split(' ')[0], // short name
        fullName: bal.leave_type_name,
        used,
        total: bal.allocated_days,
        percent,
        color: getBalanceColor(bal.leave_type_name)
      };
    });
  }, [leaveBalances]);

  // Calendar setup (October 2026 availability)
  const calendarDays = [
    { num: '27', overlap: false, holiday: false }, { num: '28', overlap: false, holiday: false }, { num: '29', overlap: false, holiday: false }, { num: '30', overlap: false, holiday: false }, { num: '31', overlap: false, holiday: false },
    { num: '1', overlap: false, holiday: false }, { num: '2', overlap: false, holiday: false }, { num: '3', overlap: false, holiday: false }, { num: '4', overlap: false, holiday: false }, { num: '5', overlap: false, holiday: false }, { num: '6', overlap: false, holiday: false },
    { num: '7', overlap: false, holiday: true }, { num: '8', overlap: true, holiday: false }, { num: '9', overlap: true, holiday: false }, { num: '10', overlap: false, holiday: false }, { num: '11', overlap: false, holiday: false }, { num: '12', overlap: false, holiday: false },
    { num: '13', overlap: true, holiday: false }, { num: '14', overlap: false, holiday: false }, { num: '15', overlap: false, holiday: false }, { num: '16', overlap: false, holiday: false }, { num: '17', overlap: false, holiday: false }, { num: '18', overlap: false, holiday: false },
    { num: '19', overlap: true, holiday: false }, { num: '20', overlap: true, holiday: false }, { num: '21', overlap: false, holiday: false }, { num: '22', overlap: false, holiday: false }, { num: '23', overlap: false, holiday: false }, { num: '24', overlap: false, holiday: false },
    { num: '25', overlap: false, holiday: false }, { num: '26', overlap: false, holiday: false }, { num: '27', overlap: false, holiday: false }, { num: '28', overlap: false, holiday: false }, { num: '29', overlap: false, holiday: false }, { num: '30', overlap: false, holiday: false },
    { num: '31', overlap: false, holiday: false }
  ];

  // Filtering list logic
  const filteredRequests = leaveRequests.filter(req => {
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter.toUpperCase();
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

      {/* DYNAMIC LEAVE BALANCES RADIAL ROW */}
      {balances.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {balances.map((bal, idx) => (
            <div key={idx} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center dark:border-slate-805 dark:bg-slate-850 flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bal.type}</span>
              
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
                <span className="text-slate-700 dark:text-slate-350">{bal.total - bal.used} days remaining</span>
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
                <option value="Annual">Annual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Personal">Personal Leave</option>
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
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-450">
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
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : req.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
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
                <span className="text-[10px] font-bold text-slate-450 uppercase">
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

        {/* Right Side: Charts & Availability Calendar */}
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

          {/* Team Availability CSS Calendar */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 dark:border-slate-800">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Team Calendar Overlay</h4>
              <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-800 dark:text-slate-350">
                <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                <span>Oct 2026</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mt-4 text-center text-[10px] font-black text-slate-450">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1 mt-2 text-center text-[11px] font-bold">
              {calendarDays.map((c, i) => (
                <div
                  key={i}
                  className={`py-1.5 rounded-md flex items-center justify-center transition ${
                    c.holiday
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                      : c.overlap
                      ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {c.num}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-[9px] font-bold text-slate-400 pt-3 border-t border-slate-50 dark:border-slate-800">
              <span className="flex items-center"><span className="h-2 w-2 rounded bg-blue-600 mr-1" /> Absence Overlaps</span>
              <span className="flex items-center"><span className="h-2 w-2 rounded bg-rose-100 mr-1" /> Public Holidays</span>
            </div>
          </div>

        </div>

      </div>

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
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98]"
                >
                  {isLoading ? 'Submitting...' : 'Register Application'}
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
