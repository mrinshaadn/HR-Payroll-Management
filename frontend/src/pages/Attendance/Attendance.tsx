import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { analyticsService } from '../../services/analyticsService';
import { 
  Clock, 
  MapPin, 
  AlertTriangle, 
  UserX, 
  CalendarCheck,
  TrendingUp,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { AttendanceRecord } from '../../types';

export default function Attendance() {
  const { 
    user, 
    todayRecord, 
    clockInActive, 
    clockIn,
    clockOut,
    addNotification, 
    employees 
  } = useHR();

  // State variables
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>({
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    half_days: 0,
    leave_days: 0,
    total_working_hours: 0,
    overtime_hours: 0
  });
  const [attendanceAnalytics, setAttendanceAnalytics] = useState<any>(null);

  // Filters state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClockingIn, setIsClockingIn] = useState<boolean>(false);
  const [isClockingOut, setIsClockingOut] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Chart width calculation helper
  const [chartWidth, setChartWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch departments on mount for HR filter dropdown
  useEffect(() => {
    if (isHR) {
      employeeService.getDepartments().then(setDepartments).catch(console.error);
    }
  }, [isHR]);

  // ResizeObserver for Recharts responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setChartWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Main data loader function
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch History
      // HR/Admin gets all (with option to filter), Employee gets only their own (enforced by backend)
      const params: any = {};
      if (isHR) {
        if (selectedEmployeeId) {
          params.employee_id = selectedEmployeeId;
        }
        if (selectedDepartmentId) {
          params.department = selectedDepartmentId;
        }
        if (roleFilter !== 'All' && roleFilter !== 'All Roles') {
          params.role = roleFilter;
        }
      }
      if (statusFilter !== 'All') {
        params.status = statusFilter.toUpperCase();
      }
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const history = await attendanceService.getAttendanceHistory(params);
      setHistoryRecords(history);

      // 2. Fetch Monthly Summary Statistics
      const now = new Date();
      const summaryParams: any = {
        year: now.getFullYear(),
        month: now.getMonth() + 1
      };
      
      // Determine employee ID for stats
      if (isHR) {
        if (selectedEmployeeId) {
          summaryParams.employee_id = selectedEmployeeId;
        } else if (employees.length > 0) {
          // Default to first employee's stats if none chosen, to prevent empty stats card
          summaryParams.employee_id = employees[0].id;
        }
      }

      // If we have a target employee ID or are a regular employee, fetch stats
      if (!isHR || summaryParams.employee_id) {
        const stats = await attendanceService.getMonthlySummary(summaryParams);
        if (stats) {
          setMonthlyStats(stats);
        }
      }

      // 3. Fetch Attendance Analytics if HR/Admin
      if (isHR) {
        try {
          const data = await analyticsService.getAttendanceAnalytics();
          setAttendanceAnalytics(data);
        } catch (err) {
          console.error('Failed to load attendance analytics:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance details:', err);
      addNotification('Error connecting to attendance server.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Reload history when filters change
  useEffect(() => {
    loadData();
    setPage(1); // Reset page on filter change
  }, [selectedEmployeeId, selectedDepartmentId, startDate, endDate, statusFilter, roleFilter, clockInActive]);

  // Auto refresh attendance details and stats every 10 seconds
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(refreshTimer);
  }, [selectedEmployeeId, selectedDepartmentId, startDate, endDate, statusFilter, roleFilter, clockInActive]);

  // Handle Clock In click
  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      await clockIn();
      await loadData();
    } catch (err) {
      console.error(err);
      addNotification('Clock In failed. Please try again.', 'warning');
    } finally {
      setIsClockingIn(false);
    }
  };

  // Handle Clock Out click
  const handleClockOut = async () => {
    setIsClockingOut(true);
    try {
      await clockOut();
      await loadData();
    } catch (err) {
      console.error(err);
      addNotification('Clock Out failed. Please try again.', 'warning');
    } finally {
      setIsClockingOut(false);
    }
  };

  // Export to CSV trigger
  const handleExportCSV = async () => {
    try {
      const now = new Date().toISOString().split('T')[0];
      const params: any = {};
      if (isHR && selectedEmployeeId) params.employee_id = selectedEmployeeId;
      if (statusFilter !== 'All') params.status = statusFilter.toUpperCase();
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      // Re-use history records for local CSV generation
      const recordsToExport = historyRecords;
      if (recordsToExport.length === 0) {
        addNotification('No records to export.', 'warning');
        return;
      }

      const headers = ['Record ID', 'Employee ID', 'Name', 'Shift', 'Clock In', 'Clock Out', 'Hours Worked', 'Overtime', 'Status'];
      const rows = recordsToExport.map(r => [
        r.id,
        r.employeeId,
        r.name,
        r.shiftType,
        r.clockIn,
        r.clockOut,
        r.workHours,
        r.overtime,
        r.status
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Attendance_Ledger_${now}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification('Attendance ledger exported successfully.', 'success');
    } catch (err) {
      console.error(err);
      addNotification('Failed to generate export file.', 'warning');
    }
  };

  // Client-side pagination logic
  const startIndex = (page - 1) * pageSize;
  const paginatedRecords = historyRecords.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(historyRecords.length / pageSize) || 1;

  // Pie chart calculation based on history data
  const shiftDistribution = React.useMemo(() => {
    const counts = { Present: 0, Late: 0, 'Half Day': 0, Absent: 0, Leave: 0 };
    historyRecords.forEach(r => {
      const s = r.status;
      if (s === 'Present' || s === 'WFH') counts.Present++;
      else if (s === 'Late') counts.Late++;
      else if (s === 'Half Day') counts['Half Day']++;
      else if (s === 'Absent') counts.Absent++;
      else if (s === 'Leave') counts.Leave++;
    });

    const total = (counts.Present + counts.Late + counts['Half Day'] + counts.Absent + counts.Leave) || 0;
    
    let presentVal = 0;
    let lateVal = 0;
    let halfDayVal = 0;
    let absentVal = 0;
    let leaveVal = 0;

    if (total > 0) {
      presentVal = Math.round((counts.Present / total) * 100);
      lateVal = Math.round((counts.Late / total) * 100);
      halfDayVal = Math.round((counts['Half Day'] / total) * 100);
      absentVal = Math.round((counts.Absent / total) * 100);
      leaveVal = Math.round((counts.Leave / total) * 100);

      const sum = presentVal + lateVal + halfDayVal + absentVal + leaveVal;
      if (sum !== 100) {
        const vals = [
          { name: 'Present', val: presentVal },
          { name: 'Late', val: lateVal },
          { name: 'Half Day', val: halfDayVal },
          { name: 'Absent', val: absentVal },
          { name: 'Leave', val: leaveVal }
        ];
        vals.sort((a, b) => b.val - a.val);
        const adjustedName = vals[0].name;
        if (adjustedName === 'Present') presentVal += (100 - sum);
        else if (adjustedName === 'Late') lateVal += (100 - sum);
        else if (adjustedName === 'Half Day') halfDayVal += (100 - sum);
        else if (adjustedName === 'Absent') absentVal += (100 - sum);
        else if (adjustedName === 'Leave') leaveVal += (100 - sum);
      }
    }

    return [
      { name: 'Present', value: presentVal, color: '#10b981' },
      { name: 'Late', value: lateVal, color: '#f59e0b' },
      { name: 'Half Day', value: halfDayVal, color: '#f97316' },
      { name: 'Absent', value: absentVal, color: '#ef4444' },
      { name: 'Leave', value: leaveVal, color: '#3b82f6' }
    ];
  }, [historyRecords]);

  // Recharts trend data - group last 7 check-ins
  const trendData = React.useMemo(() => {
    return [...historyRecords]
      .reverse()
      .slice(-7)
      .map((r, i) => {
        let hrs = 0;
        if (r.workHours && r.workHours !== '-') {
          const match = r.workHours.match(/(\d+)h\s*(\d+)m/);
          if (match) {
            hrs = parseInt(match[1]) + (parseInt(match[2]) / 60.0);
          } else {
            hrs = parseFloat(r.workHours) || 0;
          }
        }
        return {
          day: `Day ${i + 1}`,
          hours: hrs,
          name: r.name
        };
      });
  }, [historyRecords]);

  // Attendance History dynamic summary calculations
  const summaryCounts = React.useMemo(() => {
    const counts = { Present: 0, Absent: 0, Late: 0, Leave: 0, WFH: 0 };
    historyRecords.forEach(r => {
      const s = r.status;
      if (s === 'Present') counts.Present++;
      else if (s === 'Absent') counts.Absent++;
      else if (s === 'Late') counts.Late++;
      else if (s === 'Leave') counts.Leave++;
      else if (s === 'WFH') counts.WFH++;
    });
    return counts;
  }, [historyRecords]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">
            {isHR ? 'Staff Attendance Dashboard' : 'My Attendance Portal'}
          </h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {isHR ? 'Monitor company-wide clockings and operational schedules' : 'Log your daily work hours and view personal attendance history'}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex h-9 items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition shadow-sm"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Excel CSV</span>
        </button>
      </div>

      {/* METRIC CARD STATS */}
      <div className={`grid gap-4 sm:grid-cols-2 ${isHR ? 'lg:grid-cols-9' : 'lg:grid-cols-5'}`}>
        
        {/* Today's Status */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Today's Status</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className={`text-xl font-black uppercase ${
                todayRecord ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
              }`}>
                {todayRecord ? todayRecord.status : 'No Clock-In'}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CalendarCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Check In Time */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Check In Time</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {todayRecord ? todayRecord.clockIn : '-'}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Check Out Time */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Check Out Time</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {todayRecord && todayRecord.clockOut && todayRecord.clockOut !== '-' ? todayRecord.clockOut : '-'}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Total Working Hours */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Total Working Hours</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {todayRecord ? todayRecord.workHours : '-'}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Overtime Hours */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Overtime Hours</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {todayRecord ? todayRecord.overtime : '0h 00m'}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Admin Present Today */}
        {user?.role === 'ADMIN' && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-305 uppercase tracking-wider block">Admin Present Today</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {attendanceAnalytics?.total_admin_present_today !== undefined ? attendanceAnalytics.total_admin_present_today : '0'}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* Total HR Present Today */}
        {isHR && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">HR Present Today</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {attendanceAnalytics?.total_hr_present_today !== undefined ? attendanceAnalytics.total_hr_present_today : '0'}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* Total Employees Present Today */}
        {isHR && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Employee Present Today</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {attendanceAnalytics?.total_employees_present_today !== undefined ? attendanceAnalytics.total_employees_present_today : '0'}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* Total Present */}
        {isHR && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Total Present</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {attendanceAnalytics?.present_today !== undefined ? attendanceAnalytics.present_today : '0'}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
        )}

      </div>

      {/* ATTENDANCE HISTORY SUMMARY */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          History Summary Statistics
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Present */}
          <div className="flex items-center justify-between rounded-xl border-l-4 border-emerald-500 border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-850">
            <div>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Present</span>
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-450 mt-1 block">
                {summaryCounts.Present + summaryCounts.WFH}
              </span>
            </div>
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          {/* Absent */}
          <div className="flex items-center justify-between rounded-xl border-l-4 border-rose-500 border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-850">
            <div>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Absent</span>
              <span className="text-3xl font-black text-rose-600 dark:text-rose-455 mt-1 block">
                {summaryCounts.Absent}
              </span>
            </div>
            <div className="rounded-lg bg-rose-100 p-2.5 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
              <UserX className="h-5 w-5" />
            </div>
          </div>

          {/* Late */}
          <div className="flex items-center justify-between rounded-xl border-l-4 border-amber-500 border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-850">
            <div>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Late</span>
              <span className="text-3xl font-black text-amber-600 dark:text-amber-450 mt-1 block">
                {summaryCounts.Late}
              </span>
            </div>
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          {/* On Leave */}
          <div className="flex items-center justify-between rounded-xl border-l-4 border-blue-500 border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-850">
            <div>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">On Leave</span>
              <span className="text-3xl font-black text-blue-600 dark:text-blue-450 mt-1 block">
                {summaryCounts.Leave}
              </span>
            </div>
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* CORE INTERACTIVE LAYOUT GRID */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Side: Attendance Terminal & Stats */}
        <div className="space-y-6">
          
          {/* LIVE TERMINAL CLOCK ELEMENT */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 text-center relative overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/10 rounded-bl-full flex items-center justify-center">
              <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            
            <span className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-300 uppercase">Live Operations Terminal</span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {currentTime.toLocaleTimeString()}
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {/* Shift Detail badge */}
            <div className="mt-4 inline-flex items-center space-x-1.5 rounded-full bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-bold text-slate-700 dark:text-slate-305">Default Shift: 09:00 AM - 05:00 PM</span>
            </div>

            {/* Separate Check In and Check Out buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleClockIn}
                disabled={isClockingIn || (!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-')}
                className={`w-full py-3 rounded-xl font-black text-sm tracking-wide shadow-md transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center space-x-2 ${
                  !!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20 cursor-pointer'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>
                  {isClockingIn ? 'Clocking In...' : (!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-') ? 'Checked In' : 'Check In'}
                </span>
              </button>

              {(!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-') && (
                <button
                  onClick={handleClockOut}
                  disabled={isClockingOut || (!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-')}
                  className={`w-full py-3 rounded-xl font-black text-sm tracking-wide shadow-md transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center space-x-2 ${
                    !!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/20 cursor-pointer'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span>
                    {isClockingOut ? 'Clocking Out...' : (!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-') ? 'Checked Out' : 'Check Out'}
                  </span>
                </button>
              )}
            </div>

            {/* Success details / last transaction */}
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 grid grid-cols-2 gap-2 text-left text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold">Checked In</span>
                <span className="text-slate-900 dark:text-white mt-1 block font-mono font-bold">
                  {todayRecord?.clockIn || '-'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold">Checked Out</span>
                <span className="text-slate-900 dark:text-white mt-1 block font-mono font-bold">
                  {todayRecord?.clockOut && todayRecord.clockOut !== '-' ? todayRecord.clockOut : '-'}
                </span>
              </div>
              {clockInActive && (
                <div className="col-span-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 p-2 rounded-lg text-center font-bold text-[10px] tracking-wide flex items-center justify-center space-x-1 mt-1 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Session Active: Logged in and recording hours</span>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC SHIFT ALLOCATION PIE CHART */}
          {shiftDistribution.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                Monthly Breakdown
              </h4>
              
              <div className="flex items-center justify-between">
                <div className="h-28 w-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={shiftDistribution.filter(s => s.value > 0)} innerRadius={22} outerRadius={34} dataKey="value">
                        {shiftDistribution.filter(s => s.value > 0).map((e, index) => (
                          <Cell key={`cell-${index}`} fill={e.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 pl-4 space-y-2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {shiftDistribution.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span>{entry.name}</span>
                      </div>
                      <span className="text-slate-900 dark:text-white font-black">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Ledger Table, Filters, Pagination */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* SEARCH & FILTERS CONTROL BAR */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 space-y-4 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Filters and Query Controls</span>
              </h3>
              {(selectedEmployeeId || selectedDepartmentId || roleFilter !== 'All' || startDate || endDate || statusFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSelectedEmployeeId('');
                    setSelectedDepartmentId('');
                    setRoleFilter('All');
                    setStartDate('');
                    setEndDate('');
                    setStatusFilter('All');
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${isHR ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-4'}`}>
              
              {/* HR: Filter by specific Employee */}
              {isHR ? (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Employee</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:border-brand-blue"
                  >
                    <option value="">All Team Staff</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Employee Name</label>
                  <input
                    type="text"
                    readOnly
                    value={user?.name || ''}
                    className="h-9 w-full rounded-md border border-slate-300 bg-slate-100 px-2 text-xs font-bold text-slate-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
                  />
                </div>
              )}

              {/* HR: Filter by Department */}
              {isHR && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Department</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:border-brand-blue"
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* HR: Filter by Role */}
              {isHR && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:border-brand-blue"
                  >
                    <option value="All">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="HR">HR</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:border-brand-blue"
                >
                  <option value="All">All Clockings</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="WFH">WFH</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:border-brand-blue"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:border-brand-blue"
                />
              </div>

            </div>
          </div>

          {/* DALLAS TIME CHART */}
          {trendData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Headcount Working Hours Trend</h3>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Hours logged per active shift</p>
                </div>
              </div>
              <div className="h-44 w-full mt-4" ref={containerRef}>
                {chartWidth > 0 && (
                  <ResponsiveContainer width="100%" height={176} minWidth={0} minHeight={0}>
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="attendanceColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#64748b" />
                      <Tooltip contentStyle={{ fontSize: '10px', backgroundColor: '#1e293b', color: '#fff', border: 'none' }} />
                      <Area type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#attendanceColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* MAIN DAILY ATTENDANCE LEDGER TABLE */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-6 py-4">Employee Name</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Assigned HR</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Check In</th>
                    <th className="px-6 py-4">Check Out</th>
                    <th className="px-6 py-4">Hours Worked</th>
                    <th className="px-6 py-4">Overtime</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing record logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <AlertCircle className="h-8 w-8 text-slate-400" />
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-300">No attendance history found</span>
                          <span className="text-[10px] text-slate-500 max-w-xs leading-normal">
                            We couldn't locate any records matching your chosen filters. Please check filters or log a clocking.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img src={rec.avatar} alt="User" className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{rec.name}</p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{rec.employeeId}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                            rec.employeeRole === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-305'
                              : rec.employeeRole === 'HR'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-350'
                          }`}>
                            {rec.employeeRole || 'EMPLOYEE'}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                          {rec.employeeAssignedHR || 'Unassigned'}
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                          {rec.employeeDepartment || 'General'}
                        </td>

                        <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300 font-bold">{rec.clockIn}</td>
                        <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300 font-bold">{rec.clockOut}</td>
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-bold">{rec.workHours}</td>
                        <td className="px-6 py-4 font-mono text-slate-800 dark:text-slate-200 font-bold">{rec.overtime}</td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                            rec.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-350'
                              : rec.status === 'Late'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-350'
                              : rec.status === 'Half Day'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-355'
                              : rec.status === 'Leave'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : rec.status === 'WFH'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-350'
                          }`}>
                            {rec.status}
                          </span>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* LEDGER PAGINATION CONTROL */}
            {historyRecords.length > pageSize && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800/80 dark:bg-slate-850">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                  Showing {startIndex + 1} - {Math.min(startIndex + pageSize, historyRecords.length)} of {historyRecords.length} records
                </span>
                
                <div className="flex space-x-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="inline-flex h-7.5 items-center px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
