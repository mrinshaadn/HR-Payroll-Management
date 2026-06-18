import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { analyticsService } from '../../services/analyticsService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Users,
  Briefcase,
  TrendingUp,
  FileText,
  Activity,
  Layers,
  Calendar,
  DollarSign,
  UserCheck,
  AlertTriangle,
  Loader2,
  PieChart as PieIcon,
  ShieldAlert
} from 'lucide-react';

const COLORS = ['#004ac6', '#2563eb', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Reports() {
  const { user } = useHR();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leave' | 'payroll' | 'recruitment' | 'documents'>('employees');

  // API states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [leaveData, setLeaveData] = useState<any>(null);
  const [payrollData, setPayrollData] = useState<any>(null);
  const [recruitmentData, setRecruitmentData] = useState<any>(null);
  const [documentData, setDocumentData] = useState<any>(null);
  const [chartHistory, setChartHistory] = useState<any>(null);

  // Resize / Width calculation hooks to prevent width(-1) error
  const [chartWidth, setChartWidth] = useState(500);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current) {
        setChartWidth(chartContainerRef.current.getBoundingClientRect().width || 500);
      }
    };
    
    // Initial size
    handleResize();

    // Resize observer
    const observer = new ResizeObserver(() => handleResize());
    if (chartContainerRef.current) {
      observer.observe(chartContainerRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab]);

  const loadAnalytics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [emp, att, lv, pay, rec, doc, hist] = await Promise.all([
        analyticsService.getEmployeeAnalytics(),
        analyticsService.getAttendanceAnalytics(),
        analyticsService.getLeaveAnalytics(),
        analyticsService.getPayrollAnalytics(),
        analyticsService.getRecruitmentAnalytics(),
        analyticsService.getDocumentAnalytics(),
        analyticsService.getChartData()
      ]);

      setEmployeeData(emp);
      setAttendanceData(att);
      setLeaveData(lv);
      setPayrollData(pay);
      setRecruitmentData(rec);
      setDocumentData(doc);
      setChartHistory(hist);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setErrorMsg('Failed to fetch analytics from standard DRF backend. Verify your user roles or active tokens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  if (!isHR && user?.role !== 'MANAGER') {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60 space-y-4">
        <div className="flex justify-center">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">Access Restrictions</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">Company-wide dashboards and charts are restricted to HR, Management, and Administrators.</p>
      </div>
    );
  }

  // Formatting helpers
  const formatPercentage = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? '0%' : `${num.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl flex items-center space-x-2">
            <Activity className="h-6 w-6 text-blue-600 animate-pulse" />
            <span>Corporate Intel &amp; Analytics</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Realtime workforce distributions, attendance metrics, leave ratios, and recruiting stats
          </p>
        </div>
        <button 
          onClick={loadAnalytics}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-extrabold text-white hover:bg-blue-700 shadow transition"
        >
          Refresh Feed
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700 dark:bg-rose-950/20 dark:border-rose-900">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {[
          { id: 'employees', name: 'Workforce', icon: Users },
          { id: 'attendance', name: 'Attendance', icon: UserCheck },
          { id: 'leave', name: 'Leaves', icon: Calendar },
          { id: 'payroll', name: 'Payroll', icon: DollarSign },
          { id: 'recruitment', name: 'Recruitment', icon: Briefcase },
          { id: 'documents', name: 'Documents', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                activeTab === tab.id
                  ? 'bg-white shadow text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider">Compiling corporate report ledger...</span>
          </div>
        </div>
      ) : (
        <div ref={chartContainerRef} className="space-y-6">
          
          {/* TAB 1: WORKFORCE EMPLOYEES */}
          {activeTab === 'employees' && employeeData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Headcount</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{employeeData.total_employees}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Active Staff</span>
                  <span className="text-2xl font-black text-emerald-500 mt-1 block">{employeeData.active_employees}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Hired This Month</span>
                  <span className="text-2xl font-black text-blue-500 mt-1 block">{employeeData.new_this_month}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Terminated / Inactive</span>
                  <span className="text-2xl font-black text-rose-500 mt-1 block">{employeeData.terminated}</span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Department Distribution</h3>
                  <div className="h-64 w-full">
                    <BarChart width={chartWidth / 2 - 24} height={250} data={employeeData.by_department?.map((d: any) => ({ name: d.department__name || 'Unassigned', count: d.count })) || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Gender Breakdown</h3>
                  <div className="flex items-center justify-between">
                    <div className="h-56 w-56">
                      <PieChart width={200} height={200}>
                        <Pie
                          data={employeeData.gender_distribution?.map((g: any, index: number) => ({
                            name: g.gender || 'Unknown',
                            value: g.count,
                            color: COLORS[index % COLORS.length]
                          })) || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          dataKey="value"
                        >
                          {employeeData.gender_distribution?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </div>
                    <div className="flex-1 space-y-2 pl-4">
                      {employeeData.gender_distribution?.map((g: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                          <span className="flex items-center space-x-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="dark:text-slate-300">{g.gender || 'Unknown'}</span>
                          </span>
                          <span className="font-extrabold dark:text-white">{g.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === 'attendance' && attendanceData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Present Today</span>
                  <span className="text-2xl font-black text-emerald-500 mt-1 block">{attendanceData.present_today}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Absent Today</span>
                  <span className="text-2xl font-black text-rose-500 mt-1 block">{attendanceData.absent_today}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Late Clock-Ins</span>
                  <span className="text-2xl font-black text-amber-500 mt-1 block">{attendanceData.late_today}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Attendance Rate</span>
                  <span className="text-2xl font-black text-blue-500 mt-1 block">{formatPercentage(attendanceData.attendance_percentage)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Daily Attendance Trend (Last 30 Days)</h3>
                <div className="h-64 w-full">
                  <AreaChart width={chartWidth - 40} height={250} data={attendanceData.monthly_trends?.map((t: any) => ({ date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: t.present_count })) || []}>
                    <defs>
                      <linearGradient id="attendanceColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#attendanceColor)" strokeWidth={2} />
                  </AreaChart>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEAVES */}
          {activeTab === 'leave' && leaveData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Total Requests</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{leaveData.total_leave_requests}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Pending Requests</span>
                  <span className="text-2xl font-black text-amber-500 mt-1 block">{leaveData.pending_leave_requests}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Approved Leaves</span>
                  <span className="text-2xl font-black text-emerald-500 mt-1 block">{leaveData.approved_leave_requests}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Rejected Requests</span>
                  <span className="text-2xl font-black text-rose-500 mt-1 block">{leaveData.rejected_leave_requests}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Department Leave Distribution</h3>
                <div className="h-64 w-full">
                  <BarChart width={chartWidth - 40} height={250} data={leaveData.department_leaves?.map((l: any) => ({ name: l.employee__department__name || 'General', total: l.total_requests, approved: l.approved_requests })) || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="total" name="Total Requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="Approved Requests" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYROLL */}
          {activeTab === 'payroll' && payrollData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Monthly Net Payout</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">₹{payrollData.monthly_payroll_cost.toLocaleString('en-IN')}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Average Salary</span>
                  <span className="text-2xl font-black text-emerald-500 mt-1 block">₹{payrollData.average_salary.toLocaleString('en-IN')}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Tax Payout Summaries</span>
                  <span className="text-2xl font-black text-rose-500 mt-1 block">₹{payrollData.tax_deduction_summary.toLocaleString('en-IN')}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Provident Fund Cost</span>
                  <span className="text-2xl font-black text-blue-500 mt-1 block">₹{payrollData.provident_fund_summary.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Department Payroll Distribution</h3>
                  <div className="h-64 w-full">
                    <BarChart width={chartWidth / 2 - 24} height={250} data={payrollData.department_salaries?.map((d: any) => ({ name: d.department__name || 'Unknown', total: d.total_salary })) || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="total" fill="#004ac6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Deduction Distribution Breakdown</h3>
                  <div className="flex items-center justify-between">
                    <div className="h-56 w-56">
                      <PieChart width={200} height={200}>
                        <Pie
                          data={[
                            { name: 'Income Tax', value: payrollData.tax_deduction_summary },
                            { name: 'Provident Fund', value: payrollData.provident_fund_summary }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          dataKey="value"
                        >
                          <Cell fill="#ef4444" />
                          <Cell fill="#3b82f6" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </div>
                    <div className="flex-1 space-y-2 pl-4 text-xs font-bold">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                          <span className="dark:text-slate-300">Income Tax</span>
                        </span>
                        <span className="dark:text-white">₹{payrollData.tax_deduction_summary.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          <span className="dark:text-slate-300">Provident Fund</span>
                        </span>
                        <span className="dark:text-white">₹{payrollData.provident_fund_summary.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RECRUITMENT */}
          {activeTab === 'recruitment' && recruitmentData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Open Positions</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{recruitmentData.open_jobs}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Total Candidates</span>
                  <span className="text-2xl font-black text-blue-500 mt-1 block">{recruitmentData.total_candidates}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Scheduled Interviews</span>
                  <span className="text-2xl font-black text-amber-500 mt-1 block">{recruitmentData.interviews_scheduled}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Successful Hires</span>
                  <span className="text-2xl font-black text-emerald-500 mt-1 block">{recruitmentData.hired_candidates}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Pipeline Funnel Distribution</h3>
                <div className="h-64 w-full">
                  <BarChart width={chartWidth - 40} height={250} data={recruitmentData.candidates_by_status?.map((c: any) => ({ name: c.status || 'Applied', count: c.count })) || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {activeTab === 'documents' && documentData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Total Vault Documents</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{documentData.total_documents}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Completeness Rate</span>
                  <span className="text-2xl font-black text-emerald-500 mt-1 block">{formatPercentage(documentData.document_completion_rate)}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Monitored Categories</span>
                  <span className="text-2xl font-black text-blue-500 mt-1 block">{documentData.documents_by_category?.length || 0} Categories</span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Documents by Category</h3>
                  <div className="h-64 w-full">
                    <BarChart width={chartWidth / 2 - 24} height={250} data={documentData.documents_by_category?.map((c: any) => ({ name: c.category__name || 'General', count: c.count })) || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Recent Upload Actions</h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {documentData.recently_uploaded?.length > 0 ? (
                      documentData.recently_uploaded.map((doc: any, index: number) => (
                        <div key={index} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-900 dark:text-white truncate max-w-xs">{doc.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">No recent uploads registered.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
