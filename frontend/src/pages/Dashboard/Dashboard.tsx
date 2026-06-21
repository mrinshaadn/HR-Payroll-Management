import React from 'react';
import { useHR } from '../../context/HRContext';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../../services/analyticsService';
import { 
  Users, 
  DollarSign, 
  Smile, 
  ArrowUpRight, 
  TrendingUp, 
  ChevronRight, 
  Play, 
  Plus, 
  MapPin, 
  UserMinus,
  CheckCircle,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart, 
  Area 
} from 'recharts';

// Pie/Donut datasets
const departmentData = [
  { name: 'Engineering', value: 42, color: '#004ac6' },
  { name: 'Sales', value: 25, color: '#2563eb' },
  { name: 'Marketing', value: 18, color: '#38bdf8' },
  { name: 'HR & Admin', value: 15, color: '#f59e0b' }
];

const locationData = [
  { name: 'USA', count: 180 },
  { name: 'UK', count: 140 },
  { name: 'India', count: 80 },
  { name: 'Remote', count: 50 }
];

const shiftData = [
  { name: 'Active Shift', value: 75, color: '#10b981' },
  { name: 'Idle', value: 25, color: '#e2e8f0' }
];

const attendanceLineData = [
  { day: '1', active: 20 },
  { day: '6', active: 26 },
  { day: '11', active: 22 },
  { day: '16', active: 31 },
  { day: '21', active: 29 },
  { day: '26', active: 34 },
  { day: '30', active: 36 }
];

const holidays = [
  { title: 'Thanksgiving Break', date: 'Nov 15, 2026', icon: '🦃' },
  { title: 'Christmas Day Holiday', date: 'Dec 14, 2026', icon: '🎄' }
];

const milestones = [
  { name: 'David Wilson', type: 'Birthday', text: 'Turning 32 tomorrow', icon: '🎂' },
  { name: 'Elena Rodriguez', type: 'Work Anniversary', text: '5-Year Silver Milestone', icon: '🎉' }
];

export default function Dashboard() {
  const { 
    employees, 
    leaveRequests, 
    addNotification, 
    currentPayCycleProgress, 
    payCycleStep,
    advancePayCycleStep,
    user,
    clockInActive,
    clockIn,
    clockOut,
    documents,
    attendanceRecords,
    todayRecord,
    refreshData
  } = useHR();
  const navigate = useNavigate();

  const [overview, setOverview] = React.useState<any>(null);
  const [employeeStats, setEmployeeStats] = React.useState<any>(null);

  React.useEffect(() => {
    if (user && user.role !== 'EMPLOYEE') {
      const loadAnalytics = async () => {
        try {
          const ov = await analyticsService.getDashboardAnalytics();
          const stats = await analyticsService.getEmployeeAnalytics();
          if (ov) setOverview(ov);
          if (stats) setEmployeeStats(stats);
        } catch (err) {
          console.error("Failed to load dashboard analytics:", err);
        }
      };
      loadAnalytics();
    }
  }, [user]);

  // Auto-refresh attendance status and analytics every 10 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      refreshData();
      if (user && user.role !== 'EMPLOYEE') {
        analyticsService.getDashboardAnalytics().then(ov => { if (ov) setOverview(ov); }).catch(console.error);
        analyticsService.getEmployeeAnalytics().then(stats => { if (stats) setEmployeeStats(stats); }).catch(console.error);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [refreshData, user]);

  const colors = ['#004ac6', '#2563eb', '#38bdf8', '#f59e0b', '#8b5cf6'];
  const dynDepartmentData = employeeStats?.by_department?.length > 0
    ? employeeStats.by_department.map((item: any, index: number) => ({
        name: item.department__name || 'Unknown',
        value: Math.round((item.count / employeeStats.total_employees) * 100),
        color: colors[index % colors.length]
      }))
    : departmentData;

  const [barChartWidth, setBarChartWidth] = React.useState(0);
  const barContainerRef = React.useRef<HTMLDivElement>(null);

  const [lineChartWidth, setLineChartWidth] = React.useState(0);
  const lineContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!barContainerRef.current) return;
    const barObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setBarChartWidth(entries[0].contentRect.width);
      }
    });
    barObserver.observe(barContainerRef.current);

    if (!lineContainerRef.current) return;
    const lineObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setLineChartWidth(entries[0].contentRect.width);
      }
    });
    lineObserver.observe(lineContainerRef.current);

    return () => {
      barObserver.disconnect();
      lineObserver.disconnect();
    };
  }, []);

  // Dynamic values
  const totalHeadcount = 1240 + employees.length;
  const activeLeaves = leaveRequests.filter(r => r.status === 'APPROVED').length + 38;
  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING').length;

  const handleRunPayroll = () => {
    advancePayCycleStep();
    addNotification('Triggered payroll run sequence.', 'success');
    navigate('/payroll');
  };

  if (user?.role === 'EMPLOYEE') {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-6 shadow-lg text-white">
          <h2 className="text-2xl font-black tracking-tight">Welcome back, {user.name}!</h2>
          <p className="text-xs font-semibold text-sky-100 mt-1">Global Innovations Tech Group • employee command hub</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Attendance Widget */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Today's Shift</span>
              <div className={`rounded-lg p-2 ${
                todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : clockInActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
              }`}>
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-4 space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 dark:text-slate-300">Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-350'
                    : clockInActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-350'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-350'
                }`}>
                  {todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                    ? 'Checked Out'
                    : clockInActive
                    ? 'Checked In'
                    : 'Not Checked In'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Check In:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{todayRecord && todayRecord.clockIn ? todayRecord.clockIn : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Check Out:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{todayRecord && todayRecord.clockOut ? todayRecord.clockOut : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Work Hours:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{todayRecord && todayRecord.workHours ? todayRecord.workHours : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Overtime:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{todayRecord && todayRecord.overtime ? todayRecord.overtime : '0h 00m'}</span>
              </div>

              <div className="space-y-2 mt-4 pt-2">
                <button
                  onClick={clockIn}
                  disabled={!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-'}
                  className={`w-full py-2.5 rounded-lg text-xs font-black text-white transition-all shadow ${
                    !!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/10'
                  }`}
                >
                  {!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-' ? 'Checked In' : 'Check In'}
                </button>

                {(!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-') && (
                  <button
                    onClick={clockOut}
                    disabled={!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-'}
                    className={`w-full py-2.5 rounded-lg text-xs font-black text-white transition-all shadow ${
                      !!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-'
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/10'
                    }`}
                  >
                    {!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-' ? 'Checked Out' : 'Check Out'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Leave balance */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Leave Balance</span>
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <Smile className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">15 Days</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Available for allocation</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center" onClick={() => navigate('/leave')}>
                Apply for leave &rarr;
              </span>
            </div>
          </div>

          {/* Card 3: Payroll */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Latest Net Salary</span>
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">₹4,500.00</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Net payout for last cycle</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center" onClick={() => navigate('/payroll')}>
                View payslips &rarr;
              </span>
            </div>
          </div>

          {/* Card 4: Documents */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">My Documents</span>
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{documents.length} Files</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">HR and personal documents</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center" onClick={() => navigate('/documents')}>
                View documents &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850">
          <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">My Recent Leave Requests</h3>
          </div>
          <div className="mt-4 overflow-x-auto">
            {leaveRequests.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">No recent leave requests found.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
                    <th className="pb-3">Leave Type</th>
                    <th className="pb-3">Dates</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {leaveRequests.slice(0, 5).map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 font-bold text-slate-900 dark:text-slate-100">{req.leaveType}</td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">{req.dates}</td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">{req.duration}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-350' :
                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-350' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-350'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Title & Context Bar */}
      <div className="flex flex-col justify-between space-y-2 md:flex-row md:items-center md:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">Dashboard</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Live analytics feed and corporate command console</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync: Online
          </span>
        </div>
      </div>

      {/* THREE EXECUTIVE SUMMARY TILES */}
      {user?.role === 'ADMIN' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* KPI 1: Headcount */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Headcount</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-450">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.total_employees !== undefined ? overview.total_employees.toLocaleString() : totalHeadcount.toLocaleString()}
            </h3>
            <span className="mt-2 flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+5% growth this month</span>
            </span>
          </div>
        </div>

        {/* KPI 2: Active Payroll */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Active Payroll</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.monthly_payroll !== undefined ? `₹${Number(overview.monthly_payroll).toLocaleString('en-IN')}` : '₹1.25 Cr'}
            </h3>
            <span className="mt-2 flex items-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
              Current Cycle: Processing
            </span>
          </div>
        </div>

        {/* KPI 3: Employee Net Promoter Score */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Employee NPS</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-450">
              <Smile className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">45</h3>
            <span className="mt-2 flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+10 points last quarter</span>
            </span>
          </div>
        </div>

        {/* KPI 4: On Leave State */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">On Leave Today</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-450">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.on_leave !== undefined ? overview.on_leave : activeLeaves}
            </h3>
            <span className="mt-2 flex items-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
              Avg {(((overview?.on_leave ?? activeLeaves) / (overview?.total_employees ?? totalHeadcount)) * 100).toFixed(1)}% of total staff
            </span>
          </div>
        </div>

        </div>
      )}

      {/* ADMIN OR HR SPECIFIC CARDS */}
      {user?.role === 'ADMIN' && (
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total HR Staff</span>
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.total_hr_staff !== undefined ? overview.total_hr_staff : 0}
              </h3>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Assigned Employees</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.assigned_employees !== undefined ? overview.assigned_employees : 0}
              </h3>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Unassigned Employees</span>
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.unassigned_employees !== undefined ? overview.unassigned_employees : 0}
              </h3>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'HR' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: My Employees Count */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">My Employees Count</span>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-450">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {employees.length}
              </h3>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">Assigned directly to you</p>
            </div>
          </div>

          {/* Card 2: My Employees Attendance */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">My Employees Attendance</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.present_today !== undefined ? overview.present_today : 0}
              </h3>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">Present/Late today</p>
            </div>
          </div>

          {/* Card 3: My Leave Requests */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">My Leave Requests</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-450">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {leaveRequests.filter(r => r.status === 'PENDING').length}
              </h3>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">Pending approval</p>
            </div>
          </div>

          {/* Card 4: My Payroll Records */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">My Payroll Records</span>
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-650 dark:bg-purple-950/40 dark:text-purple-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.monthly_payroll !== undefined ? `₹${Number(overview.monthly_payroll).toLocaleString('en-IN')}` : '₹0'}
              </h3>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">Monthly payroll cost</p>
            </div>
          </div>
        </div>
      )}

      {/* GRID: MAIN CORE PIECES */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* ROW 1 COLUMN 1: WORKFORCE OVERVIEW (Department & Location) */}
        <div className="flex flex-col space-y-6 lg:col-span-2">
          
          {/* Card containing Pie + Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Workforce Analytics</h3>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => navigate('/analytics')}>Detailed Analytics &rarr;</span>
            </div>
            
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              
              {/* Department Distribution Donut */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Department Distribution</p>
                <div className="flex items-center justify-between">
                  <div className="h-36 w-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dynDepartmentData}
                          innerRadius={36}
                          outerRadius={54}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {dynDepartmentData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom Legends list */}
                  <div className="flex-1 pl-4 space-y-2">
                    {dynDepartmentData.map((dept: any) => (
                      <div key={dept.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          <span className="truncate max-w-[100px]">{dept.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">{dept.value}%</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Location Bar Chart */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Location Distribution</p>
                <div className="h-36 w-full" ref={barContainerRef}>
                  {barChartWidth > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#64748b" />
                        <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '6px', backgroundColor: '#1e293b', color: '#fff', border: 'none' }} />
                        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Grid sub-blocks: Payroll circular status & Attendance analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Payroll Status Progress */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Payroll Progress Indicator</h4>
              
              <div className="mt-4 flex flex-col items-center justify-center p-3 text-center">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <svg className="absolute transform -rotate-90" width="100" height="100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="currentColor" className="text-emerald-500 transition-all duration-500" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * currentPayCycleProgress) / 100} 
                    />
                  </svg>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{currentPayCycleProgress}%</span>
                </div>
                
                <p className="mt-4 text-xs font-black text-slate-900 dark:text-slate-100">
                  Step {payCycleStep} of 6 processing
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  Nov 15-30 Corporate Pay Cycle
                </p>

                <div className="mt-4 flex space-x-3 w-full">
                  <button
                    onClick={handleRunPayroll}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 text-white rounded-lg py-2.5 text-xs font-black shadow dark:bg-blue-600 dark:hover:bg-blue-700 transition"
                  >
                    Advance Payroll State
                  </button>
                  <button
                    onClick={() => navigate('/payroll')}
                    className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg py-2.5 text-xs font-bold dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Line Plot */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Attendance Analytics</h4>
              <p className="text-[10px] font-bold text-slate-550 dark:text-slate-450 mb-2 mt-1">Daily active physical &amp; remote employees</p>
              
              <div className="h-40 w-full mt-4" ref={lineContainerRef}>
                {lineChartWidth > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceLineData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="attendanceGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                      <Tooltip contentStyle={{ fontSize: '10px', backgroundColor: '#1e293b', color: '#fff', border: 'none' }} />
                      <Area type="monotone" dataKey="active" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#attendanceGlow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT SIDEBAR: HIGH CONTEXT NOTIFICATION PANEL */}
        <div className="space-y-6">
          
          {/* Calendar Holidays */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">Upcoming Corporate Holidays</h4>
            <div className="space-y-4">
              {holidays.map((hol, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/40 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl shrink-0">{hol.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200">{hol.title}</p>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{hol.date}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Anniversaries / Birthdays */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">Birthdays &amp; Anniversaries</h4>
            <div className="space-y-4">
              {milestones.map((mil, idx) => (
                <div key={idx} className="flex items-start space-x-3 border-b border-slate-100 pb-3 dark:border-slate-800/40 last:border-0 last:pb-0">
                  <span className="text-xl shrink-0 mt-0.5">{mil.icon}</span>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100">{mil.name}</p>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-0.5">{mil.type}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-455 mt-1 leading-relaxed">{mil.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Portal Dock (Matches Sidebar quick features too) */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 transition-all duration-200 hover:shadow-md">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">Quick Actions Dock</h4>
            <div className="grid grid-cols-2 gap-3">
              
              <button 
                onClick={handleRunPayroll}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-blue-50 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center group cursor-pointer"
              >
                <Play className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-1.5 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">Run Payroll</span>
              </button>

              <button 
                onClick={() => navigate('/employees')}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-emerald-50 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center group cursor-pointer"
              >
                <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mb-1.5 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">Add Employee</span>
              </button>

              <button 
                onClick={() => navigate('/leave')}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-amber-50 hover:border-amber-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center group cursor-pointer relative"
              >
                <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mb-1.5 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">Approve Leave</span>
                {pendingLeaves > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-[8px] font-black text-white shadow-sm">
                    {pendingLeaves}
                  </span>
                )}
              </button>

              <button 
                onClick={() => navigate('/analytics')}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-purple-50 hover:border-purple-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center group cursor-pointer"
              >
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400 mb-1.5 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">View Reports</span>
              </button>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
