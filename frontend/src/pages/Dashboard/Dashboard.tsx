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
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Shift</span>
              <div className={`rounded-lg p-2 ${
                todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                  ? 'bg-blue-500/10 text-blue-500'
                  : clockInActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-slate-500/10 text-slate-500'
              }`}>
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            
            <div className="mt-3 space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-350">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-bold ${
                  todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                    ? 'text-blue-500'
                    : clockInActive
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                }`}>
                  {todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                    ? 'Checked Out'
                    : clockInActive
                    ? 'Checked In'
                    : 'Not Checked In'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
                <span className="text-slate-400">Check In:</span>
                <span className="text-slate-800 dark:text-slate-200">{todayRecord ? todayRecord.clockIn : '-'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
                <span className="text-slate-400">Check Out:</span>
                <span className="text-slate-800 dark:text-slate-200">{todayRecord ? todayRecord.clockOut : '-'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
                <span className="text-slate-400">Work Hours:</span>
                <span className="text-slate-800 dark:text-slate-200">{todayRecord ? todayRecord.workHours : '-'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
                <span className="text-slate-400">Overtime:</span>
                <span className="text-slate-800 dark:text-slate-200">{todayRecord ? todayRecord.overtime : '0h 00m'}</span>
              </div>

              <div className="space-y-2.5 mt-2">
                <button
                  onClick={clockIn}
                  disabled={!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-'}
                  className={`w-full py-2 rounded-lg text-xs font-extrabold text-white transition-all shadow-md ${
                    !!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-'
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 shadow-blue-500/10'
                  }`}
                >
                  {!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-' ? 'Checked In' : 'Check In'}
                </button>

                {(!!todayRecord && !!todayRecord.clockIn && todayRecord.clockIn !== '-') && (
                  <button
                    onClick={clockOut}
                    disabled={!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-'}
                    className={`w-full py-2 rounded-lg text-xs font-extrabold text-white transition-all shadow-md ${
                      !!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-'
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 shadow-rose-500/10'
                    }`}
                  >
                    {!!todayRecord && !!todayRecord.clockOut && todayRecord.clockOut !== '-' ? 'Checked Out' : 'Check Out'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Leave balance */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Leave Balance</span>
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Smile className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">15 Days</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 cursor-pointer hover:underline" onClick={() => navigate('/leave')}>
                Apply for leave &rarr;
              </p>
            </div>
          </div>

          {/* Card 3: Payroll */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Latest Net Salary</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₹4,500.00</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 cursor-pointer hover:underline" onClick={() => navigate('/payroll')}>
                View payslips &rarr;
              </p>
            </div>
          </div>

          {/* Card 4: Documents */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">My Documents</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{documents.length} Files</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 cursor-pointer hover:underline" onClick={() => navigate('/documents')}>
                View documents &rarr;
              </p>
            </div>
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div className="border-b border-slate-50 pb-3 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">My Recent Leave Requests</h3>
          </div>
          <div className="mt-4 overflow-x-auto">
            {leaveRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent leave requests found.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <th className="pb-2">Leave Type</th>
                    <th className="pb-2">Dates</th>
                    <th className="pb-2">Duration</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.slice(0, 5).map((req) => (
                    <tr key={req.id} className="border-b border-slate-55 dark:border-slate-800/40 py-2">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{req.leaveType}</td>
                      <td className="py-2.5 text-slate-550">{req.dates}</td>
                      <td className="py-2.5 text-slate-550">{req.duration}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                          req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* KPI 1: Headcount */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Headcount</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.total_employees !== undefined ? overview.total_employees.toLocaleString() : totalHeadcount.toLocaleString()}
            </h3>
            <span className="mt-1 flex items-center text-[10px] font-bold text-emerald-500">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              <span>+5% growth this month</span>
            </span>
          </div>
        </div>

        {/* KPI 2: Active Payroll */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Payroll</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.monthly_payroll !== undefined ? `₹${Number(overview.monthly_payroll).toLocaleString('en-IN')}` : '₹1.25 Cr'}
            </h3>
            <span className="mt-1 flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
              Current Cycle: Processing
            </span>
          </div>
        </div>

        {/* KPI 3: Employee Net Promoter Score */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Employee NPS</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Smile className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">45</h3>
            <span className="mt-1 flex items-center text-[10px] font-bold text-emerald-500">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              <span>+10 points last quarter</span>
            </span>
          </div>
        </div>

        {/* KPI 4: On Leave State */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">On Leave Today</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.on_leave !== undefined ? overview.on_leave : activeLeaves}
            </h3>
            <span className="mt-1 flex items-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              Avg {(((overview?.on_leave ?? activeLeaves) / (overview?.total_employees ?? totalHeadcount)) * 100).toFixed(1)}% of total staff
            </span>
          </div>
        </div>

      </div>

      {/* GRID: MAIN CORE PIECES */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* ROW 1 COLUMN 1: WORKFORCE OVERVIEW (Department & Location) */}
        <div className="flex flex-col space-y-6 lg:col-span-2">
          
          {/* Card containing Pie + Bar */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Workforce Analytics</h3>
              <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => navigate('/analytics')}>Detailed Analytics &rarr;</span>
            </div>
            
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              
              {/* Department Distribution Donut */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Department Distribution</p>
                <div className="flex items-center justify-between">
                  <div className="h-36 w-36">
                    <PieChart width={144} height={144}>
                      <Pie
                        data={dynDepartmentData}
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {dynDepartmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                  
                  {/* Custom Legends list */}
                  <div className="flex-1 pl-4 space-y-1.5">
                    {dynDepartmentData.map((dept) => (
                      <div key={dept.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dept.color }} />
                          <span>{dept.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{dept.value}%</span>
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
                    <BarChart width={barChartWidth} height={144} data={locationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '6px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={26} />
                    </BarChart>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Grid sub-blocks: Payroll circular status & Attendance analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Payroll Status Progress */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Payroll Progress Indicator</h4>
              
              <div className="mt-4 flex flex-col items-center justify-center p-3 text-center">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <svg className="absolute transform -rotate-90" width="100" height="100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="currentColor" className="text-emerald-500 transition-all duration-500" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * currentPayCycleProgress) / 100} 
                    />
                  </svg>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{currentPayCycleProgress}%</span>
                </div>
                
                <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Step {payCycleStep} of 6 processing
                </p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                  Nov 15-30 Corporate Pay Cycle
                </p>

                <div className="mt-4 flex space-x-3 w-full">
                  <button
                    onClick={handleRunPayroll}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-extrabold shadow dark:bg-blue-600 dark:hover:bg-blue-700 transition"
                  >
                    Advance Payroll State
                  </button>
                  <button
                    onClick={() => navigate('/payroll')}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg py-2 text-xs font-bold dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Line Plot */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Attendance Analytics</h4>
              <p className="text-[10px] font-bold text-slate-400 mb-2 mt-1">Daily active physical &amp; remote employees</p>
              
              <div className="h-40 w-full mt-2" ref={lineContainerRef}>
                {lineChartWidth > 0 && (
                  <AreaChart width={lineChartWidth} height={160} data={attendanceLineData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="active" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#attendanceGlow)" />
                  </AreaChart>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT SIDEBAR: HIGH CONTEXT NOTIFICATION PANEL */}
        <div className="space-y-6">
          
          {/* Calendar Holidays */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Upcoming Corporate Holidays</h4>
            <div className="space-y-3">
              {holidays.map((hol, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2 dark:border-slate-800/40 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{hol.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{hol.title}</p>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{hol.date}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              ))}
            </div>
          </div>

          {/* Anniversaries / Birthdays */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Birthdays &amp; Anniversaries</h4>
            <div className="space-y-3">
              {milestones.map((mil, idx) => (
                <div key={idx} className="flex items-center space-x-3 border-b border-slate-50 pb-2 dark:border-slate-800/40 last:border-0 last:pb-0">
                  <span className="text-lg">{mil.icon}</span>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{mil.name}</p>
                    <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400">{mil.type}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{mil.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Portal Dock (Matches Sidebar quick features too) */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Quick Actions Dock</h4>
            <div className="grid grid-cols-2 gap-3">
              
              <button 
                onClick={handleRunPayroll}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-blue-50 hover:border-blue-200 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center"
              >
                <Play className="h-4 w-4 text-blue-500 mb-1" />
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">Run Payroll</span>
              </button>

              <button 
                onClick={() => navigate('/employees')}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-emerald-50 hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center"
              >
                <Plus className="h-4 w-4 text-emerald-500 mb-1" />
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">Add Employee</span>
              </button>

              <button 
                onClick={() => navigate('/leave')}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-amber-50 hover:border-amber-200 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center"
              >
                <CheckCircle className="h-4 w-4 text-amber-500 mb-1" />
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">Approve Leave</span>
                {pendingLeaves > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white">
                    {pendingLeaves} pending
                  </span>
                )}
              </button>

              <button 
                onClick={() => navigate('/analytics')}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-purple-50 hover:border-purple-200 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition text-center"
              >
                <TrendingUp className="h-4 w-4 text-purple-500 mb-1" />
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">View Reports</span>
              </button>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
