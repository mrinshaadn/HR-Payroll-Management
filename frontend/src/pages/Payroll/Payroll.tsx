import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { payrollService } from '../../services/payrollService';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Percent, 
  HelpCircle, 
  Download, 
  CheckCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plus,
  X,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Trash2,
  Edit,
  User
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

export default function Payroll() {
  const { 
    employees, 
    user, 
    addNotification 
  } = useHR();

  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // Tabs: 'Ledger' | 'Salary Structures' | 'Payslips' | 'Reports'
  const [activeTab, setActiveTab] = useState<'Ledger' | 'SalaryStructures' | 'Payslips' | 'Reports'>('Ledger');

  // API Data State
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any>({ summary: {}, departments: [] });
  
  // Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Modals state
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<any>(null);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);

  // Form fields for Salary Structure Modal
  const [structEmployeeId, setStructEmployeeId] = useState('');
  const [structBasic, setStructBasic] = useState(4000);
  const [structHouse, setStructHouse] = useState(500);
  const [structTransport, setStructTransport] = useState(300);
  const [structMedical, setStructMedical] = useState(200);
  const [structSpecial, setStructSpecial] = useState(0);
  const [structBonus, setStructBonus] = useState(0);
  const [structOvertime, setStructOvertime] = useState(25.0);
  const [structTax, setStructTax] = useState(10.0);
  const [structPF, setStructPF] = useState(5.0);

  // Form fields for Payroll Process Modal
  const [processMonth, setProcessMonth] = useState<number>(new Date().getMonth() + 1);
  const [processYear, setProcessYear] = useState<number>(new Date().getFullYear());
  const [processEmployeeId, setProcessEmployeeId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load initial data based on active tab
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'Ledger') {
        const data = await payrollService.getPayrolls();
        setPayrolls(data);
      } else if (activeTab === 'SalaryStructures') {
        const data = await payrollService.getSalaryStructures();
        setSalaryStructures(data);
      } else if (activeTab === 'Payslips') {
        const data = await payrollService.getPayslips();
        setPayslips(data);
      } else if (activeTab === 'Reports') {
        const now = new Date();
        const data = await payrollService.getPayrollReports({ year: now.getFullYear() });
        if (data) setReportsData(data);
      }
    } catch (err) {
      console.error(err);
      addNotification('Error loading payroll data.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setPage(1); // Reset page on tab shift
  }, [activeTab]);

  // Handle Salary Structure Submit (Create / Update)
  const handleStructureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structEmployeeId) {
      addNotification('Please select an employee.', 'warning');
      return;
    }

    const payload = {
      employee: structEmployeeId,
      basic_salary: structBasic.toString(),
      house_allowance: structHouse.toString(),
      transport_allowance: structTransport.toString(),
      medical_allowance: structMedical.toString(),
      special_allowance: structSpecial.toString(),
      bonus: structBonus.toString(),
      overtime_rate: structOvertime.toString(),
      tax_percentage: structTax.toString(),
      provident_fund_percentage: structPF.toString()
    };

    setIsLoading(true);
    try {
      if (editingStructure) {
        await payrollService.updateSalaryStructure(editingStructure.id, payload);
        addNotification('Salary structure updated successfully.', 'success');
      } else {
        await payrollService.createSalaryStructure(payload);
        addNotification('Salary structure created successfully.', 'success');
      }
      setShowStructureModal(false);
      setEditingStructure(null);
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to save salary structure.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Salary Structure Edit click
  const handleEditStructure = (struct: any) => {
    setEditingStructure(struct);
    setStructEmployeeId(struct.employee || struct.employee_id || '');
    setStructBasic(Number(struct.basic_salary) || 0);
    setStructHouse(Number(struct.house_allowance) || 0);
    setStructTransport(Number(struct.transport_allowance) || 0);
    setStructMedical(Number(struct.medical_allowance) || 0);
    setStructSpecial(Number(struct.special_allowance) || 0);
    setStructBonus(Number(struct.bonus) || 0);
    setStructOvertime(Number(struct.overtime_rate) || 0);
    setStructTax(Number(struct.tax_percentage) || 0);
    setStructPF(Number(struct.provident_fund_percentage) || 0);
    setShowStructureModal(true);
  };

  // Handle Salary Structure Delete click
  const handleDeleteStructure = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this salary structure?')) return;
    setIsLoading(true);
    try {
      const success = await payrollService.deleteSalaryStructure(id);
      if (success) {
        addNotification('Salary structure deleted successfully.', 'success');
        loadData();
      } else {
        addNotification('Failed to delete salary structure.', 'warning');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Payroll Process
  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload: any = {
        month: processMonth,
        year: processYear
      };
      if (processEmployeeId) {
        payload.employee_id = processEmployeeId;
      }

      const res = await payrollService.processPayroll(payload);
      if (res && res.success_count > 0) {
        addNotification(`Successfully processed payroll for ${res.success_count} employees.`, 'success');
        setShowProcessModal(false);
        setProcessEmployeeId('');
        loadData();
      } else {
        addNotification('Payroll processing failed or no records modified.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addNotification('Payroll processing failed.', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  // Payslip Download Trigger
  const handleDownloadPayslip = async (payslip: any) => {
    addNotification(`Initiating download for Payslip ${payslip.payslip_number}...`, 'info');
    try {
      await payrollService.downloadPayslip(payslip.id, `Payslip_${payslip.payslip_number}.csv`);
    } catch (err) {
      console.error(err);
      addNotification('Failed to download payslip.', 'warning');
    }
  };

  // Filter & Search Logic
  const filteredPayrolls = payrolls.filter(row => {
    const matchesSearch = searchQuery === '' || 
      (row.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.employee_last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.employee || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesMonth = filterMonth === 'All' || Number(row.payroll_month) === Number(filterMonth);
    const matchesYear = filterYear === 'All' || Number(row.payroll_year) === Number(filterYear);
    const matchesStatus = filterStatus === 'All' || row.status === filterStatus;
    
    return matchesSearch && matchesMonth && matchesYear && matchesStatus;
  });

  const filteredStructures = salaryStructures.filter(row => {
    return searchQuery === '' || 
      (row.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.employee_last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.employee || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredPayslips = payslips.filter(row => {
    return searchQuery === '' || 
      (row.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.employee_last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.payslip_number || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Client-side pagination logic
  const startIndex = (page - 1) * pageSize;
  const paginatedPayrolls = filteredPayrolls.slice(startIndex, startIndex + pageSize);
  const paginatedStructures = filteredStructures.slice(startIndex, startIndex + pageSize);
  const paginatedPayslips = filteredPayslips.slice(startIndex, startIndex + pageSize);

  // Auto Totals for metrics
  const totalCost = payrolls.reduce((acc, row) => acc + Number(row.net_salary || 0), 0);
  const totalAllowances = payrolls.reduce((acc, row) => acc + Number(row.total_allowances || 0), 0);
  const totalDeductions = payrolls.reduce((acc, row) => acc + Number(row.tax_deduction || 0) + Number(row.provident_fund || 0), 0);
  const totalOvertime = payrolls.reduce((acc, row) => acc + Number(row.overtime_amount || 0), 0);

  // Department graph mapping
  const deptSpendingData = React.useMemo(() => {
    if (!reportsData.departments) return [];
    return reportsData.departments.map((d: any) => ({
      name: d.employee__department__name || 'IT',
      Salary: Number(d.total_salary) || 0
    }));
  }, [reportsData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">Payroll Ledger</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {isHR ? 'Formulate compensations, administer salary structures, and process monthly disbursement run cycles' : 'View your monthly payslips, salary details, and historical deposits'}
          </p>
        </div>
        
        {isHR && (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setEditingStructure(null);
                setStructEmployeeId('');
                setStructBasic(4000);
                setStructHouse(500);
                setStructTransport(300);
                setStructMedical(200);
                setStructSpecial(0);
                setStructBonus(0);
                setStructOvertime(25.0);
                setStructTax(10.0);
                setStructPF(5.0);
                setShowStructureModal(true);
              }}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5 text-blue-500" />
              <span>Configure Salary Structure</span>
            </button>
            <button
              onClick={() => setShowProcessModal(true)}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Run Payroll Cycle</span>
            </button>
          </div>
        )}
      </div>

      {/* METRIC SUMMARIES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Payout cost</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-black text-slate-950 dark:text-white">₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              <span className="text-[10px] font-bold text-emerald-500">Gross Cycle</span>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cycle Allowances</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-black text-slate-950 dark:text-white">₹{totalAllowances.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-bold text-emerald-500">Extra Payout</span>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Taxes &amp; Deductions</span>
            <span className="text-xl font-black text-slate-950 dark:text-white mt-1">₹{totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-450">
            <Percent className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Overtime Disbursed</span>
            <span className="text-xl font-black text-slate-950 dark:text-white mt-1">₹{totalOvertime.toLocaleString('en-IN')}</span>
          </div>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* TABS SELECT BAR */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 pb-px">
        {[
          { id: 'Ledger', label: 'Payroll Ledger', hide: false },
          { id: 'SalaryStructures', label: 'Salary Structures', hide: false },
          { id: 'Payslips', label: 'Payslips', hide: false },
          { id: 'Reports', label: 'Analytics Reports', hide: !isHR }
        ].map(t => {
          if (t.hide) return null;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-2.5 px-4 text-xs font-bold transition-all relative ${
                activeTab === t.id
                  ? 'text-blue-500 font-extrabold border-b-2 border-blue-500'
                  : 'text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* FILTER AND SEARCH CONTROLS */}
      {activeTab !== 'Reports' && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'Payslips' ? 'Search by employee or payslip number...' : 'Search by employee name or ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {activeTab === 'Ledger' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800"
              >
                <option value="All">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(2026, i).toLocaleString('en-US', { month: 'long' })}</option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800"
              >
                <option value="All">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Processed">Processed</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* CORE CONTENT SWITCH */}
      <div className="space-y-4">
        
        {/* TAB 1: LEDGER */}
        {activeTab === 'Ledger' && (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Period</th>
                    <th className="px-5 py-3.5">Gross Pay</th>
                    <th className="px-5 py-3.5">Allowances</th>
                    <th className="px-5 py-3.5">Deductions</th>
                    <th className="px-5 py-3.5">Overtime</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Loading ledger statistics...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <AlertCircle className="h-8 w-8 text-slate-350" />
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-300">No payroll entries found</span>
                          <span className="text-[10px] text-slate-450 max-w-xs leading-normal">
                            Run a monthly payroll cycle or adjust filters to view ledger records.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayrolls.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-7.5 w-7.5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-extrabold text-[10px]">
                              {(p.employee_name || 'E').charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-850 dark:text-slate-100 leading-tight">
                                {p.employee_name} {p.employee_last_name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">{p.employee}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-450">
                          {new Date(p.payroll_year, p.payroll_month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">₹{Number(p.gross_salary).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 font-mono text-emerald-600">+₹{Number(p.total_allowances).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 font-mono text-rose-500">-₹{(Number(p.tax_deduction) + Number(p.provident_fund)).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">+₹{Number(p.overtime_amount).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            p.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-900 font-black dark:text-white">
                          ₹{Number(p.net_salary).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredPayrolls.length > pageSize && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3 dark:border-slate-808 dark:bg-slate-850">
                <span className="text-[10px] font-bold text-slate-450 uppercase">
                  Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredPayrolls.length)} of {filteredPayrolls.length} entries
                </span>
                <div className="flex space-x-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page * pageSize >= filteredPayrolls.length}
                    onClick={() => setPage(prev => prev + 1)}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SALARY STRUCTURES */}
        {activeTab === 'SalaryStructures' && (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Basic Salary</th>
                    <th className="px-5 py-3.5">House Allow.</th>
                    <th className="px-5 py-3.5">Transport Allow.</th>
                    <th className="px-5 py-3.5">Medical Allow.</th>
                    <th className="px-5 py-3.5">Tax %</th>
                    <th className="px-5 py-3.5">PF %</th>
                    {isHR && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing compensation definitions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedStructures.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <Lock className="h-8 w-8 text-slate-350" />
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-300">No salary structures configured</span>
                          <span className="text-[10px] text-slate-450 max-w-xs leading-normal">
                            Define a compensation breakdown structure for employees to process payroll.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStructures.map((struct) => (
                      <tr key={struct.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-7.5 w-7.5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-extrabold text-[10px]">
                              {(struct.employee_name || 'E').charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-850 dark:text-slate-100 leading-tight">
                                {struct.employee_name} {struct.employee_last_name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">{struct.employee}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">₹{Number(struct.basic_salary).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-450">₹{Number(struct.house_allowance).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-450">₹{Number(struct.transport_allowance).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-450">₹{Number(struct.medical_allowance).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 font-mono text-rose-500">{struct.tax_percentage}%</td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">{struct.provident_fund_percentage}%</td>
                        
                        {isHR && (
                          <td className="px-5 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => handleEditStructure(struct)}
                              className="rounded p-1 bg-slate-50 hover:bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStructure(struct.id)}
                              className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-slate-800 dark:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYSLIPS */}
        {activeTab === 'Payslips' && (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Payslip Number</th>
                    <th className="px-5 py-3.5">Employee Name</th>
                    <th className="px-5 py-3.5">Pay Period</th>
                    <th className="px-5 py-3.5">Net Salary Payout</th>
                    <th className="px-5 py-3.5">Generated At</th>
                    <th className="px-5 py-3.5 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing generated statements...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedPayslips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <FileText className="h-8 w-8 text-slate-350" />
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-300">No payslips registered</span>
                          <span className="text-[10px] text-slate-450 max-w-xs leading-normal">
                            Payslips will generate immediately after a payroll cycle settles successfully.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayslips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-5 py-3.5 font-mono text-blue-500 font-extrabold">{slip.payslip_number}</td>
                        <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">
                          {slip.employee_name} {slip.employee_last_name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-550 dark:text-slate-400">
                          {new Date(slip.payroll_year, slip.payroll_month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-850 dark:text-white font-extrabold">
                          ₹{Number(slip.net_salary).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">
                          {new Date(slip.generated_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDownloadPayslip(slip)}
                            className="rounded p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400"
                            title="Download Statement"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS */}
        {activeTab === 'Reports' && (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Department Spending Chart */}
            {deptSpendingData.length > 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 dark:border-slate-800">
                  Compensation Cost by Department
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptSpendingData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="Salary" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 flex items-center justify-center text-xs text-slate-400">
                <span>No department analytics records logged for this cycle.</span>
              </div>
            )}

            {/* General summaries details */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-800">
                Financial aggregates summaries
              </h4>
              
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex justify-between border-b border-slate-50 pb-1.5 dark:border-slate-800">
                  <span className="text-slate-400">Mean Payout (Net)</span>
                  <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                    ₹{Number(reportsData.summary?.avg_salary || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5 dark:border-slate-800">
                  <span className="text-slate-400">Total processed employees</span>
                  <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                    {reportsData.summary?.processed_count || 0} Claimant profiles
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5 dark:border-slate-800">
                  <span className="text-slate-400">Aggregate Gross Payout</span>
                  <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                    ₹{Number(reportsData.summary?.total_payout || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: Configure Salary Structure */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-155">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingStructure ? 'Update Salary Structure' : 'Configure Salary Structure'}
              </h3>
              <button onClick={() => setShowStructureModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleStructureSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Employee Claimant</label>
                <select
                  disabled={!!editingStructure}
                  value={structEmployeeId}
                  onChange={(e) => setStructEmployeeId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                >
                  <option value="">Choose employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Basic Salary (INR)</label>
                  <input
                    required
                    type="number"
                    value={structBasic}
                    onChange={(e) => setStructBasic(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">House Allowance</label>
                  <input
                    required
                    type="number"
                    value={structHouse}
                    onChange={(e) => setStructHouse(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Transport Allowance</label>
                  <input
                    required
                    type="number"
                    value={structTransport}
                    onChange={(e) => setStructTransport(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Medical Allowance</label>
                  <input
                    required
                    type="number"
                    value={structMedical}
                    onChange={(e) => setStructMedical(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Special Allowance</label>
                  <input
                    required
                    type="number"
                    value={structSpecial}
                    onChange={(e) => setStructSpecial(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Bonus</label>
                  <input
                    required
                    type="number"
                    value={structBonus}
                    onChange={(e) => setStructBonus(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Overtime Hourly Rate</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={structOvertime}
                    onChange={(e) => setStructOvertime(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax Percentage %</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={structTax}
                    onChange={(e) => setStructTax(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Provident Fund Deductions %</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={structPF}
                    onChange={(e) => setStructPF(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowStructureModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700"
                >
                  Save Configuration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Run Payroll Cycle */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-155">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                Run Payroll Cycle
              </h3>
              <button onClick={() => setShowProcessModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} className="mt-4 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Processing Month</label>
                  <select
                    value={processMonth}
                    onChange={(e) => setProcessMonth(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(2026, i).toLocaleString('en-US', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Processing Year</label>
                  <select
                    value={processYear}
                    onChange={(e) => setProcessYear(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Employee (Optional)</label>
                <select
                  value={processEmployeeId}
                  onChange={(e) => setProcessEmployeeId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-850"
                >
                  <option value="">All Staff Employees (Batch Payout)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-400 mt-1 block leading-normal">
                  If left empty, the payroll system processes monthly disbursements for all active staff.
                </span>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 flex items-center justify-center space-x-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{isProcessing ? 'Settling Ledger...' : 'Start processing'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
