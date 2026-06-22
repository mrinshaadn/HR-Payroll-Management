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
  AlertCircle,
  Users,
  Shield,
  User,
  Activity,
  Layers,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  Legend, 
  CartesianGrid 
} from 'recharts';
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

  const selectedRoleView = user?.role || 'EMPLOYEE';

  // Daily view tab state
  const [activeTab, setActiveTab] = useState<'Today' | 'Yesterday' | 'Last7Days' | 'ThisMonth'>('Today');

  // Calendar state (current year and month)
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  // Filters state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClockingIn, setIsClockingIn] = useState<boolean>(false);
  const [isClockingOut, setIsClockingOut] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Container ref for charts
  const containerRef = useRef<HTMLDivElement>(null);

  const isHR = selectedRoleView === 'HR' || selectedRoleView === 'ADMIN';
  const isAdmin = selectedRoleView === 'ADMIN';

  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch departments on mount
  useEffect(() => {
    employeeService.getDepartments().then(setDepartments).catch(console.error);
  }, []);

  // Helper: Get local date string 'YYYY-MM-DD'
  const getLocalDateString = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // Main data loader function
  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      const history = await attendanceService.getAttendanceHistory(params);
      setHistoryRecords(history);

      // Fetch Monthly Summary Statistics
      const now = new Date();
      const summaryParams: any = {
        year: now.getFullYear(),
        month: now.getMonth() + 1
      };
      
      if (selectedRoleView !== 'EMPLOYEE') {
        if (selectedEmployeeId) {
          summaryParams.employee_id = selectedEmployeeId;
        } else if (employees.length > 0) {
          summaryParams.employee_id = employees[0].id;
        }
      }

      if (selectedRoleView === 'EMPLOYEE' || summaryParams.employee_id) {
        const stats = await attendanceService.getMonthlySummary(summaryParams);
        if (stats) {
          setMonthlyStats(stats);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance details:', err);
      addNotification('Error connecting to attendance server.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Reload history when filters or view changes
  useEffect(() => {
    loadData();
    setPage(1); // Reset page on filter change
  }, [selectedEmployeeId, selectedDepartmentId, startDate, endDate, statusFilter, roleFilter, selectedRoleView]);

  // Auto refresh details every 15 seconds
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(refreshTimer);
  }, [selectedEmployeeId, selectedDepartmentId, startDate, endDate, statusFilter, roleFilter, selectedRoleView]);

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
      const recordsToExport = filteredRecords;
      if (recordsToExport.length === 0) {
        addNotification('No records to export.', 'warning');
        return;
      }

      const headers = ['Record ID', 'Employee ID', 'Name', 'Shift', 'Clock In', 'Clock Out', 'Hours Worked', 'Overtime', 'Status', 'Date'];
      const rows = recordsToExport.map(r => [
        r.id,
        r.employeeId,
        r.name,
        r.shiftType,
        r.clockIn,
        r.clockOut,
        r.workHours,
        r.overtime,
        r.status,
        r.date || ''
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Attendance_Report_${now}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification('Attendance report exported successfully.', 'success');
    } catch (err) {
      console.error(err);
      addNotification('Failed to generate export file.', 'warning');
    }
  };

  // Helper: Parse hours worked string into decimal value
  const parseWorkHours = (hoursStr: string): number => {
    if (!hoursStr || hoursStr === '-') return 0;
    const match = hoursStr.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      return parseInt(match[1]) + (parseInt(match[2]) / 60);
    }
    const floatVal = parseFloat(hoursStr);
    return isNaN(floatVal) ? 0 : floatVal;
  };

  // Dynamic filter logic on frontend records
  const filteredRecords = React.useMemo(() => {
    return historyRecords.filter(rec => {
      // 1. Role-based view scoping
      if (selectedRoleView === 'EMPLOYEE') {
        // Employees can only see their own attendance
        if (rec.name.toLowerCase() !== user?.name.toLowerCase() && rec.employeeId !== user?.email) {
          return false;
        }
      } else if (selectedRoleView === 'HR') {
        // HR can only see their assigned employees, or themselves
        const isAssigned = rec.employeeAssignedHR === user?.name || rec.name.toLowerCase() === user?.name.toLowerCase();
        if (!isAssigned) return false;
      }

      // 2. Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = rec.name.toLowerCase().includes(query);
        const matchesId = rec.employeeId.toLowerCase().includes(query);
        if (!matchesName && !matchesId) return false;
      }

      // 3. Employee Filter (HR/Admin dropdown)
      if (isHR && selectedEmployeeId && rec.employeeId !== selectedEmployeeId) {
        return false;
      }

      // 4. Department Filter
      if (isHR && selectedDepartmentId) {
        // match department name
        const dept = departments.find(d => String(d.id) === selectedDepartmentId);
        if (dept && rec.employeeDepartment !== dept.name) {
          return false;
        }
      }

      // 5. Role Filter (HR/Admin dropdown)
      if (isHR && roleFilter !== 'All') {
        if (rec.employeeRole?.toUpperCase() !== roleFilter.toUpperCase()) {
          return false;
        }
      }

      // 6. Status Filter
      if (statusFilter !== 'All' && rec.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      // 7. Date Range Filter
      if (startDate && rec.date && rec.date < startDate) return false;
      if (endDate && rec.date && rec.date > endDate) return false;

      // 8. Daily View Tabs Filter
      const todayStr = getLocalDateString(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      const recDate = rec.date || '';

      if (activeTab === 'Today') {
        if (recDate !== todayStr) return false;
      } else if (activeTab === 'Yesterday') {
        if (recDate !== yesterdayStr) return false;
      } else if (activeTab === 'Last7Days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);
        if (recDate < sevenDaysAgoStr || recDate > todayStr) return false;
      } else if (activeTab === 'ThisMonth') {
        const firstDayOfMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
        if (recDate < firstDayOfMonthStr || recDate > todayStr) return false;
      }

      return true;
    });
  }, [historyRecords, selectedRoleView, searchQuery, selectedEmployeeId, selectedDepartmentId, roleFilter, statusFilter, startDate, endDate, activeTab, departments, user]);

  // Grouped history by date (sorted descending)
  const groupedHistory = React.useMemo(() => {
    const sorted = [...filteredRecords].sort((a, b) => {
      const dA = a.date || '';
      const dB = b.date || '';
      return dB.localeCompare(dA);
    });

    const groups: { [key: string]: AttendanceRecord[] } = {};
    sorted.forEach(rec => {
      const dateKey = rec.date || 'Unknown Date';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(rec);
    });
    return groups;
  }, [filteredRecords]);

  // Daily Timeline Statistics for each day group
  const dailyTimelineStats = React.useMemo(() => {
    const stats: { [key: string]: { present: number; absent: number; late: number; leave: number; avgHours: string } } = {};
    
    Object.keys(groupedHistory).forEach(dateKey => {
      const records = groupedHistory[dateKey];
      let p = 0, a = 0, l = 0, lv = 0;
      let totalHours = 0;
      let countForHours = 0;

      records.forEach(r => {
        if (r.status === 'Present' || r.status === 'WFH') p++;
        else if (r.status === 'Absent') a++;
        else if (r.status === 'Late') l++;
        else if (r.status === 'Leave') lv++;

        if (r.status !== 'Absent' && r.status !== 'Leave') {
          const hrs = parseWorkHours(r.workHours);
          if (hrs > 0) {
            totalHours += hrs;
            countForHours++;
          }
        }
      });

      const avg = countForHours > 0 ? (totalHours / countForHours).toFixed(1) + 'h' : '0.0h';
      stats[dateKey] = {
        present: p + l, // late is technically present
        absent: a,
        late: l,
        leave: lv,
        avgHours: avg
      };
    });

    return stats;
  }, [groupedHistory]);

  // Calendar Rendering Helpers
  const calendarDays = React.useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const days = [];
    // padding for previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const getCalendarDayStatus = (day: number | null) => {
    if (!day) return null;
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Find record for current employee
    const rec = historyRecords.find(r => {
      const isMe = r.name.toLowerCase() === user?.name.toLowerCase() || r.employeeId === user?.email;
      return isMe && r.date === dateStr;
    });
    return rec ? rec.status : null;
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 1. Daily Attendance Trend (presence percentage over last 10 days)
  const dailyTrendData = React.useMemo(() => {
    const dateGroups: { [key: string]: { present: number; total: number } } = {};
    historyRecords.forEach(r => {
      if (!r.date) return;
      if (!dateGroups[r.date]) {
        dateGroups[r.date] = { present: 0, total: 0 };
      }
      dateGroups[r.date].total++;
      if (r.status !== 'Absent' && r.status !== 'Leave') {
        dateGroups[r.date].present++;
      }
    });

    return Object.keys(dateGroups)
      .sort()
      .slice(-10)
      .map(d => {
        const pct = dateGroups[d].total > 0 ? Math.round((dateGroups[d].present / dateGroups[d].total) * 100) : 0;
        return {
          date: d.substring(5), // MM-DD
          'Rate %': pct
        };
      });
  }, [historyRecords]);

  // 2. Weekly Attendance Trend (average working hours per day of week)
  const weeklyTrendData = React.useMemo(() => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdaySum: { [key: string]: { sum: number; count: number } } = {};
    weekdays.forEach(w => {
      weekdaySum[w] = { sum: 0, count: 0 };
    });

    historyRecords.forEach(r => {
      if (!r.date) return;
      const dayName = weekdays[new Date(r.date).getDay()];
      const hrs = parseWorkHours(r.workHours);
      if (hrs > 0) {
        weekdaySum[dayName].sum += hrs;
        weekdaySum[dayName].count++;
      }
    });

    return weekdays.map(w => ({
      day: w.substring(0, 3),
      'Hours': weekdaySum[w].count > 0 ? parseFloat((weekdaySum[w].sum / weekdaySum[w].count).toFixed(1)) : 0
    }));
  }, [historyRecords]);

  // 3. Monthly Attendance Trend (presence percentage by month)
  const monthlyTrendData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStatsMap: { [key: string]: { present: number; total: number } } = {};

    historyRecords.forEach(r => {
      if (!r.date) return;
      const mIdx = new Date(r.date).getMonth();
      const mName = months[mIdx];
      if (!monthStatsMap[mName]) {
        monthStatsMap[mName] = { present: 0, total: 0 };
      }
      monthStatsMap[mName].total++;
      if (r.status !== 'Absent' && r.status !== 'Leave') {
        monthStatsMap[mName].present++;
      }
    });

    return months
      .filter(m => monthStatsMap[m] !== undefined)
      .map(m => ({
        month: m,
        'Attendance %': Math.round((monthStatsMap[m].present / monthStatsMap[m].total) * 100)
      }));
  }, [historyRecords]);

  // 4. Attendance Status Distribution
  const statusDistributionData = React.useMemo(() => {
    const counts = { Present: 0, Late: 0, Absent: 0, Leave: 0, WFH: 0, 'Half Day': 0 };
    filteredRecords.forEach(r => {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts]++;
      }
    });

    return [
      { name: 'Present', value: counts.Present, color: '#10B981' },
      { name: 'Late', value: counts.Late, color: '#F59E0B' },
      { name: 'Absent', value: counts.Absent, color: '#EF4444' },
      { name: 'Leave', value: counts.Leave, color: '#3B82F6' },
      { name: 'WFH', value: counts.WFH, color: '#6366F1' },
      { name: 'Half Day', value: counts['Half Day'], color: '#F97316' }
    ].filter(item => item.value > 0);
  }, [filteredRecords]);

  // 5. Department Attendance Performance
  const departmentPerformanceData = React.useMemo(() => {
    const deptStatsMap: { [key: string]: { present: number; total: number } } = {};
    historyRecords.forEach(r => {
      const dept = r.employeeDepartment || 'General';
      if (!deptStatsMap[dept]) {
        deptStatsMap[dept] = { present: 0, total: 0 };
      }
      deptStatsMap[dept].total++;
      if (r.status !== 'Absent' && r.status !== 'Leave') {
        deptStatsMap[dept].present++;
      }
    });

    return Object.keys(deptStatsMap).map(d => ({
      department: d,
      'Rate %': Math.round((deptStatsMap[d].present / deptStatsMap[d].total) * 100)
    }));
  }, [historyRecords]);

  // Pagination slice
  const startIndex = (page - 1) * pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  // Render Status Badge
  const renderStatusBadge = (status: AttendanceRecord['status']) => {
    const colors = {
      Present: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      Late: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Half Day': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      Leave: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      WFH: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      Absent: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status] || colors.Present}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 text-white bg-[#0B0F19] min-h-screen p-6 rounded-2xl border border-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#FFFFFF] md:text-3xl flex items-center gap-2">
            <Activity className="h-7 w-7 text-brand-blue animate-pulse" />
            {isHR ? 'Staff Attendance Command Center' : 'My Attendance Dashboard'}
          </h1>
          <p className="text-sm font-medium text-[#D1D5DB]">
            {isHR ? 'Enterprise-wide biometric synchronization and shift allocation metrics' : 'Check-in details, calendar sheets, and monthly summary statistics'}
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex h-9 items-center space-x-1.5 rounded-lg border border-slate-700 bg-brand-blue hover:bg-brand-blue-hover px-4 py-2 text-xs font-bold text-[#FFFFFF] transition shadow-md"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV Ledger</span>
          </button>

          {/* Live Operations clock */}
          <div className="flex items-center space-x-4 bg-[#162237] px-4 py-2.5 rounded-xl border border-slate-700">
            <Clock className="h-5 w-5 text-brand-blue animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <div className="text-base font-extrabold font-mono text-[#FFFFFF] tracking-wider">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-[10px] font-semibold text-[#D1D5DB] uppercase">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC METRIC CARDS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">Presence Rate</span>
            <Activity className="h-5 w-5 text-emerald-450" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#FFFFFF]">{monthlyStats.present_days ? Math.round((monthlyStats.present_days / (monthlyStats.present_days + monthlyStats.absent_days || 1)) * 100) : 94}%</span>
          </div>
          <p className="text-xs text-[#D1D5DB] mt-2">Active shifts current month</p>
        </div>

        <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">Total Working Hours</span>
            <Clock className="h-5 w-5 text-blue-450" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#FFFFFF]">{monthlyStats.total_working_hours || '168.5'} hrs</span>
          </div>
          <p className="text-xs text-[#D1D5DB] mt-2">Accrued current period</p>
        </div>

        <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">Overtime Balance</span>
            <TrendingUp className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#FFFFFF]">{monthlyStats.overtime_hours || '12.4'} hrs</span>
          </div>
          <p className="text-xs text-[#D1D5DB] mt-2">Calculated above default shift</p>
        </div>

        <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">Pending Leaves</span>
            <UserX className="h-5 w-5 text-rose-400" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#FFFFFF]">{monthlyStats.leave_days || '3'} Days</span>
          </div>
          <p className="text-xs text-[#D1D5DB] mt-2">Approved & scheduled leave requests</p>
        </div>
      </div>

      {/* OPERATIONS TERMINAL & ACTION BUTTONS */}
      <div className="bg-[#162237] p-6 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-brand-blue/15 flex items-center justify-center border border-brand-blue/30">
            <MapPin className="h-6 w-6 text-brand-blue" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#FFFFFF]">Biometric Check In Terminal</h3>
            <p className="text-xs text-[#D1D5DB]">Office Location: San Francisco Head Office (HQ)</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={handleClockIn}
            disabled={isClockingIn || (!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-')}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 ${
              !!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-[#FFFFFF] cursor-pointer'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isClockingIn ? 'Clocking...' : (!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-') ? 'Checked In' : 'Clock In'}</span>
          </button>

          {(!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-') && (
            <button
              onClick={handleClockOut}
              disabled={isClockingOut || (!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-')}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 ${
                !!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-700 text-[#FFFFFF] cursor-pointer'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{isClockingOut ? 'Clocking...' : (!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-') ? 'Checked Out' : 'Clock Out'}</span>
            </button>
          )}
        </div>
      </div>

      {/* STICKY FILTERS BAR */}
      <div className="sticky top-0 z-20 bg-[#162237]/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-lg space-y-4">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-brand-blue" />
            <span className="text-sm font-bold text-[#FFFFFF] uppercase tracking-wider">Search & Filter Controls</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#D1D5DB]" />
              <input
                type="text"
                placeholder="Search staff name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 rounded-lg bg-[#0B0F19] text-xs text-[#FFFFFF] border border-slate-700 focus:outline-none focus:border-brand-blue placeholder-[#D1D5DB]/50 font-bold"
              />
            </div>
            
            {(selectedEmployeeId || selectedDepartmentId || roleFilter !== 'All' || startDate || endDate || statusFilter !== 'All' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedEmployeeId('');
                  setSelectedDepartmentId('');
                  setRoleFilter('All');
                  setStartDate('');
                  setEndDate('');
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-brand-blue hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* HR/Admin Specific Employee Filter */}
          {isHR && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#D1D5DB] mb-1.5">Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-700 bg-[#0B0F19] px-2 text-xs font-bold text-[#FFFFFF] focus:outline-none focus:border-brand-blue"
              >
                <option value="">All Team Staff</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Department Filter */}
          {isHR && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#D1D5DB] mb-1.5">Department</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-700 bg-[#0B0F19] px-2 text-xs font-bold text-[#FFFFFF] focus:outline-none focus:border-brand-blue"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={String(dept.id)}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Role Filter */}
          {isHR && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#D1D5DB] mb-1.5">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-700 bg-[#0B0F19] px-2 text-xs font-bold text-[#FFFFFF] focus:outline-none focus:border-brand-blue"
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
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#D1D5DB] mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-700 bg-[#0B0F19] px-2 text-xs font-bold text-[#FFFFFF] focus:outline-none focus:border-brand-blue"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="WFH">WFH</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">On Leave</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#D1D5DB] mb-1.5">📅 Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="h-9 w-full rounded-md border border-slate-700 bg-[#0B0F19] px-2 text-xs font-bold text-[#FFFFFF] focus:outline-none focus:border-brand-blue"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#D1D5DB] mb-1.5">📅 End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="h-9 w-full rounded-md border border-slate-700 bg-[#0B0F19] px-2 text-xs font-bold text-[#FFFFFF] focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>
      </div>

      {/* LAYOUT GRID: Left Side (Charts, Calendar) & Right Side (Ledger) */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* LEFT COLUMN: CHARTS AND PERSONAL CALENDAR */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* PERSONAL CALENDAR VIEW (FOR EMPLOYEE VIEW) */}
          <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-brand-blue" />
                <h3 className="text-sm font-extrabold text-[#FFFFFF]">Attendance Calendar</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-slate-700 text-[#D1D5DB] hover:text-[#FFFFFF]">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-extrabold text-[#FFFFFF] min-w-[80px] text-center">
                  {monthNames[calendarMonth]} {calendarYear}
                </span>
                <button onClick={handleNextMonth} className="p-1 rounded hover:bg-slate-700 text-[#D1D5DB] hover:text-[#FFFFFF]">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold pb-2 border-b border-slate-800 mb-3 text-[#D1D5DB]">
              <span className="flex items-center justify-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Present</span>
              </span>
              <span className="flex items-center justify-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Absent</span>
              </span>
              <span className="flex items-center justify-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Late</span>
              </span>
              <span className="flex items-center justify-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Leave</span>
              </span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#D1D5DB]">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="py-1 text-[#D1D5DB]/80">{d}</div>
              ))}
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="p-2" />;
                const status = getCalendarDayStatus(day);
                let bgClass = 'bg-[#0B0F19] text-[#FFFFFF] border border-slate-800 hover:border-slate-600';
                if (status === 'Present' || status === 'WFH') bgClass = 'bg-emerald-600 text-white font-extrabold';
                else if (status === 'Absent') bgClass = 'bg-rose-600 text-white font-extrabold';
                else if (status === 'Late' || status === 'Half Day') bgClass = 'bg-amber-600 text-white font-extrabold';
                else if (status === 'Leave') bgClass = 'bg-blue-600 text-white font-extrabold';

                return (
                  <div key={day} className={`p-2 rounded-lg transition ${bgClass}`}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MODERN ANALYTICS CHARTS */}
          {isHR && (
            <div className="space-y-6">
              
              {/* CHART 1: Daily Attendance Trend */}
              <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
                <h4 className="text-xs font-extrabold text-[#FFFFFF] uppercase tracking-wider mb-3">1. Daily Attendance Trend</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fill: '#D1D5DB', fontSize: 10, fontWeight: 'bold' }} stroke="#334155" />
                      <YAxis tick={{ fill: '#D1D5DB', fontSize: 10, fontWeight: 'bold' }} stroke="#334155" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#162237', border: '1px solid #334155', color: '#FFF' }} />
                      <Area type="monotone" dataKey="Rate %" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorDaily)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 2: Weekly Attendance Trend */}
              <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
                <h4 className="text-xs font-extrabold text-[#FFFFFF] uppercase tracking-wider mb-3">2. Weekly Work Hours</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <XAxis dataKey="day" tick={{ fill: '#D1D5DB', fontSize: 10, fontWeight: 'bold' }} stroke="#334155" />
                      <YAxis tick={{ fill: '#D1D5DB', fontSize: 10, fontWeight: 'bold' }} stroke="#334155" />
                      <Tooltip contentStyle={{ backgroundColor: '#162237', border: '1px solid #334155', color: '#FFF' }} />
                      <Bar dataKey="Hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 3: Monthly Attendance Trend */}
              <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
                <h4 className="text-xs font-extrabold text-[#FFFFFF] uppercase tracking-wider mb-3">3. Monthly Presence Curve</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <XAxis dataKey="month" tick={{ fill: '#D1D5DB', fontSize: 10, fontWeight: 'bold' }} stroke="#334155" />
                      <YAxis tick={{ fill: '#D1D5DB', fontSize: 10, fontWeight: 'bold' }} stroke="#334155" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#162237', border: '1px solid #334155', color: '#FFF' }} />
                      <Line type="monotone" dataKey="Attendance %" stroke="#6366F1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 4: Attendance Status Distribution */}
              <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
                <h4 className="text-xs font-extrabold text-[#FFFFFF] uppercase tracking-wider mb-3">4. Status Share</h4>
                <div className="flex items-center justify-between">
                  <div className="h-28 w-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDistributionData} innerRadius={18} outerRadius={32} dataKey="value">
                          {statusDistributionData.map((e, index) => (
                            <Cell key={`cell-${index}`} fill={e.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 pl-4 space-y-1.5 text-[10px] font-bold text-[#D1D5DB]">
                    {statusDistributionData.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span>{entry.name}</span>
                        </div>
                        <span className="text-[#FFFFFF] font-black">{entry.value} recs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHART 5: Department Attendance Performance */}
              <div className="bg-[#162237] p-5 rounded-2xl border border-slate-700 shadow-md">
                <h4 className="text-xs font-extrabold text-[#FFFFFF] uppercase tracking-wider mb-3">5. Department Rates</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentPerformanceData} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#D1D5DB', fontSize: 9 }} stroke="#334155" />
                      <YAxis dataKey="department" type="category" tick={{ fill: '#D1D5DB', fontSize: 9, fontWeight: 'bold' }} stroke="#334155" width={70} />
                      <Tooltip contentStyle={{ backgroundColor: '#162237', border: '1px solid #334155', color: '#FFF' }} />
                      <Bar dataKey="Rate %" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: ATTENDANCE HISTORY LIST & TIMELINE */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* DAILY ATTENDANCE TABS */}
          <div className="bg-[#162237] p-4 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <span className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider">Daily Attendance Logs</span>
            <div className="flex space-x-1 bg-[#0B0F19] p-1 rounded-lg border border-slate-700">
              {[
                { key: 'Today', label: 'Today' },
                { key: 'Yesterday', label: 'Yesterday' },
                { key: 'Last7Days', label: 'Last 7 Days' },
                { key: 'ThisMonth', label: 'This Month' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as any);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    activeTab === tab.key 
                      ? 'bg-brand-blue text-[#FFFFFF] shadow-sm' 
                      : 'text-[#D1D5DB] hover:text-[#FFFFFF] hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* GROUPED DATE HISTORY & TIMELINE VIEW */}
          {isLoading ? (
            <div className="bg-[#162237] p-12 text-center rounded-2xl border border-slate-700">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#D1D5DB]">Synchronizing attendance metrics...</span>
              </div>
            </div>
          ) : Object.keys(groupedHistory).length === 0 ? (
            <div className="bg-[#162237] p-12 text-center rounded-2xl border border-slate-700">
              <AlertCircle className="h-8 w-8 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-sm font-extrabold text-[#FFFFFF]">No records matched the selected query parameters</p>
              <p className="text-xs text-[#D1D5DB] mt-1">Please try modifying your date filters, search query, or check-in today.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.keys(groupedHistory).map(dateKey => {
                const dayStats = dailyTimelineStats[dateKey];
                const dayRecords = groupedHistory[dateKey];
                const displayDate = new Date(dateKey).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

                return (
                  <div key={dateKey} className="space-y-4">
                    
                    {/* Date Header */}
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <h3 className="text-base font-extrabold text-[#FFFFFF]">{displayDate}</h3>
                      <span className="text-xs text-[#D1D5DB] font-semibold">{dayRecords.length} Active Records</span>
                    </div>

                    {/* Timeline Summary Card */}
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-5 bg-[#162237] p-4 rounded-xl border border-slate-700 text-center">
                      <div className="bg-[#0B0F19] p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] font-bold text-[#D1D5DB] uppercase block">Total Present</span>
                        <span className="text-lg font-black text-emerald-450 mt-1 block">{dayStats.present}</span>
                      </div>
                      <div className="bg-[#0B0F19] p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] font-bold text-[#D1D5DB] uppercase block">Total Absent</span>
                        <span className="text-lg font-black text-rose-400 mt-1 block">{dayStats.absent}</span>
                      </div>
                      <div className="bg-[#0B0F19] p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] font-bold text-[#D1D5DB] uppercase block">Total Late</span>
                        <span className="text-lg font-black text-amber-450 mt-1 block">{dayStats.late}</span>
                      </div>
                      <div className="bg-[#0B0F19] p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] font-bold text-[#D1D5DB] uppercase block">Total On Leave</span>
                        <span className="text-lg font-black text-blue-400 mt-1 block">{dayStats.leave}</span>
                      </div>
                      <div className="bg-[#0B0F19] p-2.5 rounded-lg border border-slate-800 col-span-2 md:col-span-1">
                        <span className="text-[10px] font-bold text-[#D1D5DB] uppercase block">Avg Hours Worked</span>
                        <span className="text-lg font-black text-[#FFFFFF] mt-1 block">{dayStats.avgHours}</span>
                      </div>
                    </div>

                    {/* Employee Records for this date */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {dayRecords.map(rec => (
                        <div key={rec.id} className="bg-[#162237] p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition shadow flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img src={rec.avatar} alt="User avatar" className="h-10 w-10 rounded-full object-cover border border-slate-600" />
                            <div>
                              <h4 className="text-sm font-extrabold text-[#FFFFFF]">{rec.name}</h4>
                              <p className="text-[10px] text-[#D1D5DB] font-semibold">Check In: <span className="text-[#FFFFFF] font-mono">{rec.clockIn}</span></p>
                              <p className="text-[10px] text-[#D1D5DB] font-semibold">Check Out: <span className="text-[#FFFFFF] font-mono">{rec.clockOut}</span></p>
                            </div>
                          </div>
                          
                          <div className="text-right flex flex-col items-end space-y-1.5">
                            {renderStatusBadge(rec.status)}
                            <span className="text-[10px] text-[#D1D5DB] font-semibold font-mono">Work: {rec.workHours}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* LEDGER PAGINATION CONTROL */}
          {filteredRecords.length > pageSize && (
            <div className="flex items-center justify-between border-t border-slate-850 bg-[#162237] px-6 py-4 rounded-xl shadow-md mt-4">
              <span className="text-xs font-bold text-[#D1D5DB] uppercase">
                Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredRecords.length)} of {filteredRecords.length} records
              </span>
              
              <div className="flex space-x-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#0B0F19] text-[#D1D5DB] hover:bg-slate-750 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="inline-flex h-8 items-center px-3 text-xs font-extrabold text-[#FFFFFF]">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#0B0F19] text-[#D1D5DB] hover:bg-slate-750 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
