import React, { useState, useEffect, useCallback } from 'react';
import { useHR } from '../../context/HRContext';
import {
  payrollService,
  PayrollRecord,
  PayslipRecord,
  SalaryStructure,
  PayrollDashboard,
} from '../../services/payrollService';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Percent,
  Download,
  Play,
  Plus,
  X,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Trash2,
  Edit,
  Users,
  CheckCircle2,
  BarChart2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
function fmt(value: string | number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function monthName(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] || '';
}

function fullMonthName(m: number): string {
  return ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][m - 1] || '';
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------
function MetricCard({
  label, value, sub, icon, color
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      <div>
        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">{label}</span>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
          {sub && <span className={`text-[10px] font-bold ${color.includes('blue') ? 'text-blue-600 dark:text-blue-400' : color.includes('emerald') ? 'text-emerald-600 dark:text-emerald-400' : color.includes('rose') ? 'text-rose-600 dark:text-rose-400' : color.includes('amber') ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'}`}>{sub}</span>}
        </div>
      </div>
      <div className={`rounded-xl p-2.5 ${color.includes('blue') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300' :
        color.includes('emerald') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' :
          color.includes('rose') ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' :
            color.includes('amber') ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-305' :
              'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300'}`}>
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Paid'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
    : status === 'Processed'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

function LoadingTable({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-5 py-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Loading data...</span>
        </div>
      </td>
    </tr>
  );
}

function EmptyTable({ cols, icon, title, sub }: {
  cols: number; icon: React.ReactNode; title: string; sub: string;
}) {
  return (
    <tr>
      <td colSpan={cols} className="px-5 py-14 text-center">
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="text-slate-400 dark:text-slate-500">{icon}</div>
          <p className="font-bold text-xs text-slate-800 dark:text-slate-205">{title}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">{sub}</p>
        </div>
      </td>
    </tr>
  );
}

// -------------------------------------------------------------------------
// Tab Button Component
// -------------------------------------------------------------------------
const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-2.5 px-4 text-xs font-bold transition-all relative whitespace-nowrap ${
      active
        ? 'text-blue-600 dark:text-blue-400 font-extrabold border-b-2 border-blue-600 dark:border-blue-400'
        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
    }`}
  >
    {label}
  </button>
);

// -------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------
export default function Payroll() {
  const { employees, user, addNotification } = useHR();

  const isHR = user?.role === 'HR' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Tabs
  type HRTab = 'Dashboard' | 'Ledger' | 'SalaryStructures' | 'Payslips' | 'Reports';
  type EmpTab = 'MyPayroll' | 'MyPayslips';
  const [activeHRTab, setActiveHRTab] = useState<HRTab>('Dashboard');
  const [activeEmpTab, setActiveEmpTab] = useState<EmpTab>('MyPayroll');

  // Data state
  const [dashboard, setDashboard] = useState<PayrollDashboard | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [reportsData, setReportsData] = useState<any>({ summary: {}, departments: [] });

  // Employee data
  const [myPayrolls, setMyPayrolls] = useState<PayrollRecord[]>([]);
  const [myPayslips, setMyPayslips] = useState<PayslipRecord[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);

  // Structure form
  const [structEmployeeId, setStructEmployeeId] = useState('');
  const [structBasic, setStructBasic] = useState(40000);
  const [structHouse, setStructHouse] = useState(5000);
  const [structTransport, setStructTransport] = useState(3000);
  const [structMedical, setStructMedical] = useState(2000);
  const [structSpecial, setStructSpecial] = useState(0);
  const [structBonus, setStructBonus] = useState(0);
  const [structOvertime, setStructOvertime] = useState(250);
  const [structTax, setStructTax] = useState(10.0);
  const [structPF, setStructPF] = useState(5.0);

  // Process modal form
  const [processMonth, setProcessMonth] = useState<number>(new Date().getMonth() + 1);
  const [processYear, setProcessYear] = useState<number>(new Date().getFullYear());
  const [processEmployeeId, setProcessEmployeeId] = useState<string>('');
  const [processOverride, setProcessOverride] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // -----------------------------------------------------------------------
  // Data Loading
  // -----------------------------------------------------------------------
  const loadHRData = useCallback(async (tab: HRTab) => {
    setIsLoading(true);
    setError(null);
    try {
      if (tab === 'Dashboard') {
        const [dash, payrollList] = await Promise.all([
          payrollService.getPayrollDashboard(),
          payrollService.getPayrolls(),
        ]);
        setDashboard(dash);
        setPayrolls(payrollList);
      } else if (tab === 'Ledger') {
        const data = await payrollService.getPayrolls();
        setPayrolls(data);
      } else if (tab === 'SalaryStructures') {
        const data = await payrollService.getSalaryStructures();
        setSalaryStructures(data);
      } else if (tab === 'Payslips') {
        const data = await payrollService.getPayslips();
        setPayslips(data);
      } else if (tab === 'Reports') {
        const now = new Date();
        const data = await payrollService.getPayrollReports({ year: now.getFullYear() });
        if (data) setReportsData(data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to load payroll data.';
      setError(msg);
      addNotification(msg, 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  const loadEmployeeData = useCallback(async (tab: EmpTab) => {
    setIsLoading(true);
    setError(null);
    try {
      if (tab === 'MyPayroll') {
        const data = await payrollService.getMyPayroll();
        setMyPayrolls(data);
      } else if (tab === 'MyPayslips') {
        const data = await payrollService.getMyPayslips();
        setMyPayslips(data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to load your payroll data.';
      setError(msg);
      addNotification(msg, 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (isHR) {
      loadHRData(activeHRTab);
      setPage(1);
    }
  }, [activeHRTab, isHR]);

  useEffect(() => {
    if (!isHR) {
      loadEmployeeData(activeEmpTab);
      setPage(1);
    }
  }, [activeEmpTab, isHR]);

  // -----------------------------------------------------------------------
  // Handlers – Salary Structure
  // -----------------------------------------------------------------------
  const resetStructureForm = () => {
    setEditingStructure(null);
    setStructEmployeeId('');
    setStructBasic(40000);
    setStructHouse(5000);
    setStructTransport(3000);
    setStructMedical(2000);
    setStructSpecial(0);
    setStructBonus(0);
    setStructOvertime(250);
    setStructTax(10.0);
    setStructPF(5.0);
  };

  const handleStructureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structEmployeeId) {
      addNotification('Please select an employee.', 'warning');
      return;
    }
    const payload = {
      employee: structEmployeeId,
      basic_salary: String(structBasic),
      house_allowance: String(structHouse),
      transport_allowance: String(structTransport),
      medical_allowance: String(structMedical),
      special_allowance: String(structSpecial),
      bonus: String(structBonus),
      overtime_rate: String(structOvertime),
      tax_percentage: String(structTax),
      provident_fund_percentage: String(structPF),
    };
    setIsLoading(true);
    try {
      if (editingStructure) {
        await payrollService.updateSalaryStructure(editingStructure.id, payload);
        addNotification('Salary structure updated successfully.', 'success');
      } else {
        await payrollService.createSalaryStructure(payload);
        addNotification('Salary structure created and assigned successfully.', 'success');
      }
      setShowStructureModal(false);
      resetStructureForm();
      loadHRData('SalaryStructures');
      setActiveHRTab('SalaryStructures');
    } catch (err: any) {
      const msg = err?.response?.data?.employee?.[0]
        || err?.response?.data?.detail
        || 'Failed to save salary structure. Employee may already have one.';
      addNotification(msg, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStructure = (struct: SalaryStructure) => {
    setEditingStructure(struct);
    setStructEmployeeId(struct.employee);
    setStructBasic(Number(struct.basic_salary));
    setStructHouse(Number(struct.house_allowance));
    setStructTransport(Number(struct.transport_allowance));
    setStructMedical(Number(struct.medical_allowance));
    setStructSpecial(Number(struct.special_allowance));
    setStructBonus(Number(struct.bonus));
    setStructOvertime(Number(struct.overtime_rate));
    setStructTax(Number(struct.tax_percentage));
    setStructPF(Number(struct.provident_fund_percentage));
    setShowStructureModal(true);
  };

  const handleDeleteStructure = async (id: number) => {
    if (!window.confirm('Delete this salary structure? This cannot be undone.')) return;
    setIsLoading(true);
    try {
      await payrollService.deleteSalaryStructure(id);
      addNotification('Salary structure deleted.', 'success');
      loadHRData('SalaryStructures');
    } catch {
      addNotification('Failed to delete salary structure.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Handlers – Process Payroll
  // -----------------------------------------------------------------------
  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload: any = {
        month: processMonth,
        year: processYear,
        override: processOverride,
      };
      if (processEmployeeId) payload.employee_id = processEmployeeId;

      const res = await payrollService.processPayroll(payload);

      // Always close modal and refresh regardless of partial success/failure
      setShowProcessModal(false);
      setProcessEmployeeId('');
      setProcessOverride(false);

      if (res && res.success_count > 0) {
        addNotification(
          `✅ Payroll processed for ${res.success_count} employee${res.success_count !== 1 ? 's' : ''}.`,
          'success'
        );
      }

      if (res && res.failed_count > 0) {
        // Show each individual error
        res.errors?.forEach((err: any) => {
          addNotification(
            `⚠ ${err.name || err.employee_id}: ${err.detail}`,
            'warning'
          );
        });
      }

      if (res && res.success_count === 0 && res.failed_count === 0) {
        addNotification('No employees found to process.', 'warning');
      }

      // Always refresh ledger + dashboard after processing
      loadHRData('Ledger');
      setActiveHRTab('Ledger');

    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Payroll processing failed.';
      addNotification(`❌ ${detail}`, 'warning');
    } finally {
      setIsProcessing(false);
    }
  };


  // -----------------------------------------------------------------------
  // Payslip Download
  // -----------------------------------------------------------------------
  const handleDownload = (slip: PayslipRecord) => {
    payrollService.downloadPayslipFromData(slip);
    addNotification(`Payslip ${slip.payslip_number} opened for download.`, 'info');
  };

  // -----------------------------------------------------------------------
  // Filtering & Pagination
  // -----------------------------------------------------------------------
  const filteredPayrolls = payrolls.filter(row => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (row.employee_name || '').toLowerCase().includes(q)
      || (row.employee_last_name || '').toLowerCase().includes(q)
      || (row.employee_id_str || '').toLowerCase().includes(q);
    const matchMonth = filterMonth === 'All' || Number(row.payroll_month) === Number(filterMonth);
    const matchYear = filterYear === 'All' || Number(row.payroll_year) === Number(filterYear);
    const matchStatus = filterStatus === 'All' || row.status === filterStatus;
    return matchSearch && matchMonth && matchYear && matchStatus;
  });

  const filteredStructures = salaryStructures.filter(row => {
    const q = searchQuery.toLowerCase();
    return !q
      || (row.employee_name || '').toLowerCase().includes(q)
      || (row.employee_last_name || '').toLowerCase().includes(q)
      || (row.employee_id || '').toLowerCase().includes(q);
  });

  const filteredPayslips = payslips.filter(row => {
    const q = searchQuery.toLowerCase();
    return !q
      || (row.employee_name || '').toLowerCase().includes(q)
      || (row.employee_last_name || '').toLowerCase().includes(q)
      || (row.payslip_number || '').toLowerCase().includes(q);
  });

  const startIndex = (page - 1) * pageSize;

  const deptChartData = React.useMemo(() => {
    if (!reportsData.departments) return [];
    return reportsData.departments.map((d: any) => ({
      name: d.employee__department__name || 'Unknown',
      Salary: Number(d.total_salary) || 0,
      Employees: d.employee_count || 0,
    }));
  }, [reportsData]);

  const trendChartData = React.useMemo(() => {
    if (!dashboard?.monthly_trend) return [];
    return dashboard.monthly_trend.map(t => ({
      name: t.month_name,
      Total: t.total_salary,
      Headcount: t.employee_count,
    }));
  }, [dashboard]);


  // -----------------------------------------------------------------------
  // Render Helpers (TabButton is top-level function above)
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // EMPLOYEE VIEW
  // -----------------------------------------------------------------------
  if (!isHR) {
    const myLatest = myPayrolls[0];
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">
            My Payroll
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            View your salary details, payroll history, and download payslips
          </p>
        </div>

        {/* Salary Summary Cards */}
        {myLatest && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Net Salary (Latest)"
              value={fmt(myLatest.net_salary)}
              sub={`${fullMonthName(myLatest.payroll_month)} ${myLatest.payroll_year}`}
              icon={<DollarSign className="h-5 w-5" />}
              color="text-blue-600"
            />
            <MetricCard
              label="Gross Salary"
              value={fmt(myLatest.gross_salary)}
              sub="Before deductions"
              icon={<TrendingUp className="h-5 w-5" />}
              color="text-emerald-600"
            />
            <MetricCard
              label="Total Deductions"
              value={fmt(Number(myLatest.tax_deduction) + Number(myLatest.provident_fund))}
              sub="Tax + PF"
              icon={<Percent className="h-5 w-5" />}
              color="text-rose-600"
            />
            <MetricCard
              label="Total Allowances"
              value={fmt(myLatest.total_allowances)}
              sub="HRA + Transport + Medical"
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="text-amber-600"
            />
          </div>
        )}

        {/* Latest Salary Breakdown Card */}
        {myLatest && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              Salary Breakdown — {fullMonthName(myLatest.payroll_month)} {myLatest.payroll_year}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Basic Salary', value: myLatest.basic_salary, color: 'text-slate-800 dark:text-slate-200' },
                { label: 'House Allowance', value: myLatest.house_allowance, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Transport Allow.', value: myLatest.transport_allowance, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Medical Allow.', value: myLatest.medical_allowance, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Bonus', value: myLatest.bonus, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Overtime Pay', value: myLatest.overtime_amount, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Tax Deduction', value: myLatest.tax_deduction, color: 'text-rose-600 dark:text-rose-400' },
                { label: 'Provident Fund', value: myLatest.provident_fund, color: 'text-rose-600 dark:text-rose-400' },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{item.label}</p>
                  <p className={`text-sm font-black font-mono ${item.color}`}>{fmt(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employee Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 pb-px">
          <TabButton key="MyPayroll" label="My Payroll History" active={activeEmpTab === 'MyPayroll'} onClick={() => setActiveEmpTab('MyPayroll')} />
          <TabButton key="MyPayslips" label="My Payslips" active={activeEmpTab === 'MyPayslips'} onClick={() => setActiveEmpTab('MyPayslips')} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700 text-xs font-semibold dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* My Payroll History Table */}
        {activeEmpTab === 'MyPayroll' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Period</th>
                    <th className="px-5 py-3.5">Gross Pay</th>
                    <th className="px-5 py-3.5">Allowances</th>
                    <th className="px-5 py-3.5">Deductions</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/60">
                  {isLoading ? <LoadingTable cols={6} /> :
                    myPayrolls.length === 0
                      ? <EmptyTable cols={6} icon={<FileText className="h-10 w-10" />} title="No payroll records found" sub="Payroll will appear here once HR processes your monthly payroll." />
                      : myPayrolls.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {fullMonthName(p.payroll_month)} {p.payroll_year}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-200">{fmt(p.gross_salary)}</td>
                          <td className="px-5 py-3.5 font-mono text-emerald-600 dark:text-emerald-400">+{fmt(p.total_allowances)}</td>
                          <td className="px-5 py-3.5 font-mono text-rose-600 dark:text-rose-450">
                            -{fmt(Number(p.tax_deduction) + Number(p.provident_fund))}
                          </td>
                          <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                          <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900 dark:text-white">
                            {fmt(p.net_salary)}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* My Payslips Table */}
        {activeEmpTab === 'MyPayslips' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Payslip #</th>
                    <th className="px-5 py-3.5">Period</th>
                    <th className="px-5 py-3.5">Net Salary</th>
                    <th className="px-5 py-3.5">Generated</th>
                    <th className="px-5 py-3.5 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/60">
                  {isLoading ? <LoadingTable cols={5} /> :
                    myPayslips.length === 0
                      ? <EmptyTable cols={5} icon={<FileText className="h-10 w-10" />} title="No payslips available" sub="Payslips are automatically generated when payroll is processed." />
                      : myPayslips.map(slip => (
                        <tr key={slip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-5 py-3.5 font-mono text-blue-600 dark:text-blue-450 font-extrabold">{slip.payslip_number}</td>
                          <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">
                            {fullMonthName(slip.payroll_month)} {slip.payroll_year}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-black text-slate-900 dark:text-white">
                            {fmt(slip.net_salary)}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                            {new Date(slip.generated_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleDownload(slip)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // HR VIEW
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">
            Payroll Management
          </h1>
          <p className="text-xs font-semibold text-slate-505 dark:text-slate-400 mt-0.5">
            Manage salary structures, process payroll cycles, and generate payslips
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetStructureForm();
              setShowStructureModal(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-205 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-blue-500" />
            Salary Structure
          </button>
          <button
            onClick={() => setShowProcessModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5" />
            Run Payroll
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px gap-1 overflow-x-auto">
        {([
          { id: 'Dashboard', label: 'Dashboard' },
          { id: 'Ledger', label: 'Payroll Ledger' },
          { id: 'SalaryStructures', label: 'Salary Structures' },
          { id: 'Payslips', label: 'Payslips' },
          { id: 'Reports', label: 'Analytics' },
        ] as { id: HRTab; label: string }[]).map(t => (
          <TabButton key={t.id} label={t.label} active={activeHRTab === t.id} onClick={() => setActiveHRTab(t.id)} />
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700 text-xs font-semibold dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-450">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB: DASHBOARD                                                      */}
      {/* ----------------------------------------------------------------- */}
      {activeHRTab === 'Dashboard' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Total Payroll Cost"
                  value={fmt(dashboard?.total_payroll_cost || 0)}
                  sub="Current month"
                  icon={<DollarSign className="h-5 w-5" />}
                  color="text-blue-600"
                />
                <MetricCard
                  label="Processed"
                  value={String(dashboard?.processed_count || 0)}
                  sub={`of ${dashboard?.total_employees || 0} employees`}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  color="text-emerald-600"
                />
                <MetricCard
                  label="Pending"
                  value={String(dashboard?.pending_count || 0)}
                  sub="Awaiting payroll"
                  icon={<Clock className="h-5 w-5" />}
                  color="text-amber-600"
                />
                <MetricCard
                  label="Avg. Net Salary"
                  value={fmt(dashboard?.avg_salary || 0)}
                  sub="This month"
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="text-purple-600"
                />
              </div>

              {/* Monthly Trend Chart */}
              {trendChartData.length > 0 && (
                <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    Monthly Payroll Trend ({dashboard?.current_year})
                  </h4>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 700 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Total Payout']}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recent Payrolls */}
              {payrolls.length > 0 && (
                <div className="rounded-2xl border border-slate-205 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Recent Payroll Records</h4>
                    <button onClick={() => setActiveHRTab('Ledger')} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">View All →</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/60">
                        {payrolls.slice(0, 5).map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="px-5 py-3">
                              <p className="font-extrabold text-slate-805 dark:text-slate-100">{p.employee_name} {p.employee_last_name}</p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">{p.employee_id_str}</p>
                            </td>
                            <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{fullMonthName(p.payroll_month)} {p.payroll_year}</td>
                            <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                            <td className="px-5 py-3 text-right font-mono font-black text-slate-900 dark:text-white">{fmt(p.net_salary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB: PAYROLL LEDGER                                                */}
      {/* ----------------------------------------------------------------- */}
      {activeHRTab === 'Ledger' && (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Net Payout" value={fmt(payrolls.reduce((a, r) => a + Number(r.net_salary), 0))} icon={<DollarSign className="h-5 w-5" />} color="text-blue-600" />
            <MetricCard label="Total Allowances" value={fmt(payrolls.reduce((a, r) => a + Number(r.total_allowances), 0))} icon={<TrendingUp className="h-5 w-5" />} color="text-emerald-600" />
            <MetricCard label="Total Deductions" value={fmt(payrolls.reduce((a, r) => a + Number(r.tax_deduction) + Number(r.provident_fund), 0))} icon={<Percent className="h-5 w-5" />} color="text-rose-600" />
            <MetricCard label="Overtime Paid" value={fmt(payrolls.reduce((a, r) => a + Number(r.overtime_amount), 0))} icon={<Clock className="h-5 w-5" />} color="text-purple-600" />
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-202">
                <option value="All">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{fullMonthName(i + 1)}</option>
                ))}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-202">
                <option value="All">All Years</option>
                {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-202">
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Processed">Processed</option>
                <option value="Paid">Paid</option>
              </select>
              <button onClick={() => loadHRData('Ledger')}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Period</th>
                    <th className="px-5 py-3.5">Gross Pay</th>
                    <th className="px-5 py-3.5">Allowances</th>
                    <th className="px-5 py-3.5">Deductions</th>
                    <th className="px-5 py-3.5">Overtime</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/60">
                  {isLoading ? <LoadingTable cols={8} /> :
                    filteredPayrolls.length === 0
                      ? <EmptyTable cols={8} icon={<AlertCircle className="h-10 w-10" />} title="No payroll entries found" sub="Run a payroll cycle or adjust filters to view records." />
                      : filteredPayrolls.slice(startIndex, startIndex + pageSize).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">
                                {(p.employee_name || 'E').charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{p.employee_name} {p.employee_last_name}</p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{p.employee_id_str}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {fullMonthName(p.payroll_month)} {p.payroll_year}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-200">{fmt(p.gross_salary)}</td>
                          <td className="px-5 py-3.5 font-mono text-emerald-600 dark:text-emerald-450">+{fmt(p.total_allowances)}</td>
                          <td className="px-5 py-3.5 font-mono text-rose-600 dark:text-rose-450">
                            -{fmt(Number(p.tax_deduction) + Number(p.provident_fund))}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">{fmt(p.overtime_amount)}</td>
                          <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                          <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900 dark:text-white">{fmt(p.net_salary)}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredPayrolls.length > pageSize && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {startIndex + 1}–{Math.min(startIndex + pageSize, filteredPayrolls.length)} of {filteredPayrolls.length}
                </span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button disabled={page * pageSize >= filteredPayrolls.length} onClick={() => setPage(p => p + 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {activeHRTab === 'SalaryStructures' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by employee name or ID..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <button onClick={() => loadHRData('SalaryStructures')}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-205 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Basic</th>
                    <th className="px-5 py-3.5">HRA</th>
                    <th className="px-5 py-3.5">Transport</th>
                    <th className="px-5 py-3.5">Medical</th>
                    <th className="px-5 py-3.5">Bonus</th>
                    <th className="px-5 py-3.5">Tax %</th>
                    <th className="px-5 py-3.5">PF %</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/60">
                  {isLoading ? <LoadingTable cols={9} /> :
                    filteredStructures.length === 0
                      ? <EmptyTable cols={9} icon={<Users className="h-10 w-10" />} title="No salary structures configured" sub="Create a salary structure to enable payroll processing for employees." />
                      : filteredStructures.slice(startIndex, startIndex + pageSize).map(struct => (
                        <tr key={struct.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">
                                {(struct.employee_name || 'E').charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800 dark:text-slate-100">{struct.employee_name} {struct.employee_last_name}</p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{struct.employee_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-200">{fmt(struct.basic_salary)}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">{fmt(struct.house_allowance)}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">{fmt(struct.transport_allowance)}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">{fmt(struct.medical_allowance)}</td>
                          <td className="px-5 py-3.5 font-mono text-blue-600 dark:text-blue-400">{fmt(struct.bonus)}</td>
                          <td className="px-5 py-3.5 font-mono text-rose-600 dark:text-rose-400">{struct.tax_percentage}%</td>
                          <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">{struct.provident_fund_percentage}%</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleEditStructure(struct)}
                                className="rounded-lg p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                                title="Edit">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeleteStructure(struct.id)}
                                className="rounded-lg p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-slate-800 dark:text-rose-400 transition-colors"
                                title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB: PAYSLIPS                                                       */}
      {/* ----------------------------------------------------------------- */}
      {activeHRTab === 'Payslips' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by employee or payslip number..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <button onClick={() => loadHRData('Payslips')}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-205 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Payslip #</th>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Period</th>
                    <th className="px-5 py-3.5">Net Salary</th>
                    <th className="px-5 py-3.5">Generated</th>
                    <th className="px-5 py-3.5 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/60">
                  {isLoading ? <LoadingTable cols={7} /> :
                    filteredPayslips.length === 0
                      ? <EmptyTable cols={7} icon={<FileText className="h-10 w-10" />} title="No payslips generated yet" sub="Payslips are auto-generated when a payroll cycle completes." />
                      : filteredPayslips.slice(startIndex, startIndex + pageSize).map(slip => (
                        <tr key={slip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-5 py-3.5 font-mono text-blue-600 dark:text-blue-450 font-extrabold text-[11px]">{slip.payslip_number}</td>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{slip.employee_name} {slip.employee_last_name}</p>
                            <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{slip.employee_id_str}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{slip.department_name || '—'}</td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {fullMonthName(slip.payroll_month)} {slip.payroll_year}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-black text-slate-900 dark:text-white">{fmt(slip.net_salary)}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                            {new Date(slip.generated_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => handleDownload(slip)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors">
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
            {filteredPayslips.length > pageSize && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {startIndex + 1}–{Math.min(startIndex + pageSize, filteredPayslips.length)} of {filteredPayslips.length}
                </span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button disabled={page * pageSize >= filteredPayslips.length} onClick={() => setPage(p => p + 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB: REPORTS / ANALYTICS                                           */}
      {/* ----------------------------------------------------------------- */}
      {activeHRTab === 'Reports' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Dept Spending Bar Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  Payroll Cost by Department
                </h4>
                {deptChartData.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 700 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Net Payout']}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="Salary" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                    <div className="text-center">
                      <BarChart2 className="h-8 w-8 mx-auto mb-2 text-slate-350 dark:text-slate-500" />
                      No department data for this period
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-800">
                  Financial Summary
                </h4>
                {[
                  { label: 'Average Net Salary', value: fmt(reportsData.summary?.avg_salary || 0), color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Total Gross Payout', value: fmt(reportsData.summary?.total_gross || 0), color: 'text-slate-800 dark:text-slate-200' },
                  { label: 'Total Net Payout', value: fmt(reportsData.summary?.total_payout || 0), color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Total Tax Collected', value: fmt(reportsData.summary?.total_tax || 0), color: 'text-rose-600 dark:text-rose-400' },
                  { label: 'Total PF Deducted', value: fmt(reportsData.summary?.total_pf || 0), color: 'text-orange-600 dark:text-orange-400' },
                  { label: 'Employees Processed', value: `${reportsData.summary?.processed_count || 0}`, color: 'text-indigo-650 dark:text-indigo-400' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center border-b border-slate-100 pb-2.5 last:border-0 dark:border-slate-800">
                    <span className="text-xs text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className={`text-xs font-extrabold font-mono ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Department Table */}
              {deptChartData.length > 0 && (
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Department Breakdown</h4>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:bg-slate-800/40">
                        <th className="px-5 py-3">Department</th>
                        <th className="px-5 py-3">Employees</th>
                        <th className="px-5 py-3 text-right">Total Net Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs font-semibold">
                      {deptChartData.map((d: any) => (
                        <tr key={d.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{d.name}</td>
                          <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{d.Employees}</td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{fmt(d.Salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Salary Structure                                            */}
      {/* ================================================================= */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingStructure ? 'Update Salary Structure' : 'Create Salary Structure'}
              </h3>
              <button onClick={() => { setShowStructureModal(false); resetStructureForm(); }}
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleStructureSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-1">
                  Assign to Employee
                </label>
                <select
                  disabled={!!editingStructure}
                  value={structEmployeeId}
                  onChange={e => setStructEmployeeId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-550 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60"
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                  ))}
                </select>
                {editingStructure && (
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Employee cannot be changed. Delete and recreate to reassign.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Basic Salary (₹)', value: structBasic, set: setStructBasic, step: '1' },
                  { label: 'House Allowance / HRA (₹)', value: structHouse, set: setStructHouse, step: '1' },
                  { label: 'Transport Allowance (₹)', value: structTransport, set: setStructTransport, step: '1' },
                  { label: 'Medical Allowance (₹)', value: structMedical, set: setStructMedical, step: '1' },
                  { label: 'Special Allowance (₹)', value: structSpecial, set: setStructSpecial, step: '1' },
                  { label: 'Bonus (₹)', value: structBonus, set: setStructBonus, step: '1' },
                  { label: 'Overtime Hourly Rate (₹)', value: structOvertime, set: setStructOvertime, step: '0.01' },
                ].map(({ label, value, set, step }) => (
                  <div key={label}>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-1">{label}</label>
                    <input
                      required type="number" step={step} min="0" value={value}
                      onChange={e => set(Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-550 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-1">Tax Percentage (%)</label>
                  <input required type="number" step="0.1" min="0" max="50" value={structTax}
                    onChange={e => setStructTax(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-550 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-450 mb-1">Provident Fund (%)</label>
                  <input required type="number" step="0.1" min="0" max="30" value={structPF}
                    onChange={e => setStructPF(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-550 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
              </div>

              {/* Live Preview */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-900/60">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2">Salary Preview</p>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  {(() => {
                    const gross = structBasic + structHouse + structTransport + structMedical + structSpecial + structBonus;
                    const tax = gross * (structTax / 100);
                    const pf = structBasic * (structPF / 100);
                    const net = gross - tax - pf;
                    return [
                      { label: 'Gross', value: fmt(gross) },
                      { label: 'Tax + PF', value: `-${fmt(tax + pf)}` },
                      { label: 'Net Take-home', value: fmt(net) },
                    ].map(i => (
                      <div key={i.label} className="text-center">
                        <p className="text-blue-800 dark:text-blue-450 font-bold">{i.label}</p>
                        <p className="font-black text-slate-900 dark:text-slate-100 mt-0.5">{i.value}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button type="button" onClick={() => { setShowStructureModal(false); resetStructureForm(); }}
                  className="flex-1 border border-slate-300 rounded-xl py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-xs font-extrabold hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {isLoading ? 'Saving...' : editingStructure ? 'Update Structure' : 'Create & Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Run Payroll Cycle                                           */}
      {/* ================================================================= */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                Run Payroll Cycle
              </h3>
              <button onClick={() => setShowProcessModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-450 mb-1">Month</label>
                  <select value={processMonth} onChange={e => setProcessMonth(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{fullMonthName(i + 1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-450 mb-1">Year</label>
                  <select value={processYear} onChange={e => setProcessYear(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-450 mb-1">
                  Target Employee (optional — leave blank for all)
                </label>
                <select value={processEmployeeId} onChange={e => setProcessEmployeeId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="">All Active Employees (Batch)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-250 p-3 cursor-pointer dark:bg-amber-950/20 dark:border-amber-900/60">
                <input
                  type="checkbox"
                  checked={processOverride}
                  onChange={e => setProcessOverride(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-amber-500 flex-shrink-0"
                />
                <div>
                  <p className="text-[10px] font-extrabold text-amber-800 dark:text-amber-400">Override existing records</p>
                  <p className="text-[9px] text-amber-700 dark:text-amber-550 mt-0.5">
                    If checked, deletes and recreates payroll for employees who already have records this month.
                  </p>
                </div>
              </label>

              <div className="rounded-xl bg-slate-50 border border-slate-300 p-3 dark:bg-slate-800 dark:border-slate-700">
                <p className="text-[9px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Processing payroll will calculate gross salary, deductions (tax + PF), and net pay for all employees with
                  an active salary structure. A payslip is auto-generated for each processed employee.
                </p>
              </div>

              <div className="flex gap-2.5">
                <button type="button" onClick={() => setShowProcessModal(false)}
                  className="flex-1 border border-slate-300 rounded-xl py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessing}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-xs font-extrabold hover:bg-blue-700 flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors">
                  {isProcessing ? (
                    <><div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</>
                  ) : (
                    <><Play className="h-3.5 w-3.5" />Process Payroll</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
