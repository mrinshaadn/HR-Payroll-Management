import { api } from './api';

// -------------------------------------------------------------------------
// Type Definitions
// -------------------------------------------------------------------------

export interface SalaryStructure {
  id: number;
  employee: string;          // employee_id (PK)
  employee_id: string;
  employee_name: string;
  employee_last_name: string;
  department_name: string;
  designation_name: string;
  basic_salary: string;
  house_allowance: string;
  transport_allowance: string;
  medical_allowance: string;
  special_allowance: string;
  bonus: string;
  overtime_rate: string;
  tax_percentage: string;
  provident_fund_percentage: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: number;
  employee: string;         // employee_id (PK)
  employee_id_str: string;
  employee_name: string;
  employee_last_name: string;
  department_name: string;
  designation_name: string;
  payroll_month: number;
  payroll_year: number;
  gross_salary: string;
  total_allowances: string;
  overtime_amount: string;
  tax_deduction: string;
  provident_fund: string;
  other_deductions: string;
  net_salary: string;
  status: string;
  generated_at: string;
  paid_at: string | null;
  // Breakdown
  basic_salary: string;
  house_allowance: string;
  transport_allowance: string;
  medical_allowance: string;
  special_allowance: string;
  bonus: string;
  tax_percentage: string;
  provident_fund_percentage: string;
}

export interface PayslipRecord {
  id: number;
  payroll: number;
  payslip_number: string;
  pdf_file: string | null;
  generated_at: string;
  employee_name: string;
  employee_last_name: string;
  employee_id_str: string;
  department_name: string;
  designation_name: string;
  payroll_month: number;
  payroll_year: number;
  payroll_status: string;
  gross_salary: string;
  net_salary: string;
  total_allowances: string;
  tax_deduction: string;
  provident_fund: string;
  other_deductions: string;
  overtime_amount: string;
  basic_salary: string;
  house_allowance: string;
  transport_allowance: string;
  medical_allowance: string;
  special_allowance: string;
  bonus: string;
  tax_percentage: string;
  provident_fund_percentage: string;
}

export interface PayrollDashboard {
  total_payroll_cost: number;
  processed_count: number;
  pending_count: number;
  avg_salary: number;
  total_employees: number;
  monthly_trend: Array<{
    month: number;
    month_name: string;
    total_salary: number;
    employee_count: number;
  }>;
  current_month: number;
  current_year: number;
}

// -------------------------------------------------------------------------
// Payroll Service
// -------------------------------------------------------------------------

export const payrollService = {

  // HR: Get all payrolls (with optional filters)
  getPayrolls: async (params?: {
    employee_id?: string;
    month?: number;
    year?: number;
    status?: string;
  }): Promise<PayrollRecord[]> => {
    const response = await api.get('/payrolls/', { params });
    return response.data.results || response.data;
  },

  // HR: Get all salary structures
  getSalaryStructures: async (params?: { search?: string }): Promise<SalaryStructure[]> => {
    const response = await api.get('/salary-structures/', { params });
    return response.data.results || response.data;
  },

  // HR: Create salary structure
  createSalaryStructure: async (data: any): Promise<SalaryStructure> => {
    const response = await api.post('/salary-structures/', data);
    return response.data;
  },

  // HR: Update salary structure
  updateSalaryStructure: async (id: number, data: any): Promise<SalaryStructure> => {
    const response = await api.patch(`/salary-structures/${id}/`, data);
    return response.data;
  },

  // HR: Delete salary structure
  deleteSalaryStructure: async (id: number): Promise<boolean> => {
    await api.delete(`/salary-structures/${id}/`);
    return true;
  },

  // HR: Process payroll (batch or individual)
  processPayroll: async (params?: {
    year?: number;
    month?: number;
    employee_id?: string;
    override?: boolean;
  }): Promise<any> => {
    const response = await api.post('/payroll/process/', params || {});
    return response.data;
  },

  // HR: Get all payslips
  getPayslips: async (params?: { employee_id?: string }): Promise<PayslipRecord[]> => {
    const response = await api.get('/payslips/', { params });
    return response.data.results || response.data;
  },

  // HR/Manager: Get payroll reports
  getPayrollReports: async (params?: { year?: number; month?: number }): Promise<any> => {
    const response = await api.get('/payroll/reports/', { params });
    return response.data;
  },

  // HR/Manager: Get payroll dashboard statistics
  getPayrollDashboard: async (): Promise<PayrollDashboard> => {
    const response = await api.get('/payroll/dashboard/');
    return response.data;
  },

  // HR: Get monthly summary (all employees)
  getMonthlySummary: async (params?: {
    employee_id?: string;
    year?: number;
    month?: number;
  }): Promise<PayrollRecord[]> => {
    const response = await api.get('/payroll/monthly-summary/', { params });
    return response.data;
  },

  // Employee: Get own payroll records
  getMyPayroll: async (params?: { year?: number; month?: number }): Promise<PayrollRecord[]> => {
    const response = await api.get('/payroll/my-payroll/', { params });
    return response.data;
  },

  // Employee: Get own payslips
  getMyPayslips: async (): Promise<PayslipRecord[]> => {
    const response = await api.get('/payroll/my-payslips/');
    return response.data;
  },

  // Download payslip as a rich HTML page (print-to-PDF friendly)
  downloadPayslip: async (payslipId: number, filename?: string): Promise<void> => {
    const response = await api.get(`/payslips/${payslipId}/`);
    const slip: PayslipRecord = response.data;
    generatePayslipHTML(slip);
  },

  // Download payslip from local data (no extra API call)
  downloadPayslipFromData: (slip: PayslipRecord): void => {
    generatePayslipHTML(slip);
  },
};

// -------------------------------------------------------------------------
// Payslip HTML Generator (Print-to-PDF)
// -------------------------------------------------------------------------

function fmt(value: string | number, currency = true): string {
  const num = Number(value) || 0;
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `₹${formatted}` : formatted;
}

function getMonthName(month: number): string {
  return ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][month - 1] || '';
}

function generatePayslipHTML(slip: PayslipRecord): void {
  const fullName = `${slip.employee_name} ${slip.employee_last_name}`.trim();
  const period = `${getMonthName(slip.payroll_month)} ${slip.payroll_year}`;
  const generatedDate = new Date(slip.generated_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const basicSalary = Number(slip.basic_salary) || 0;
  const hra = Number(slip.house_allowance) || 0;
  const transport = Number(slip.transport_allowance) || 0;
  const medical = Number(slip.medical_allowance) || 0;
  const special = Number(slip.special_allowance) || 0;
  const bonus = Number(slip.bonus) || 0;
  const overtime = Number(slip.overtime_amount) || 0;
  const grossSalary = Number(slip.gross_salary) || 0;
  const taxDeduction = Number(slip.tax_deduction) || 0;
  const pf = Number(slip.provident_fund) || 0;
  const otherDed = Number(slip.other_deductions) || 0;
  const totalDeductions = taxDeduction + pf + otherDed;
  const netSalary = Number(slip.net_salary) || 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip – ${slip.payslip_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #f8fafc;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .payslip {
      max-width: 800px;
      margin: 40px auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    /* Header */
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .company-sub { font-size: 12px; opacity: 0.8; margin-top: 4px; }
    .payslip-title { text-align: right; }
    .payslip-title h2 { font-size: 18px; font-weight: 700; }
    .payslip-title p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    .slip-number {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 8px;
      font-family: monospace;
    }
    /* Employee Info */
    .emp-section {
      background: #f1f5f9;
      padding: 24px 40px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .emp-field label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .emp-field span {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    /* Earnings/Deductions */
    .content { padding: 32px 40px; }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .table-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 24px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .item-row:last-child { border-bottom: none; }
    .item-label { color: #475569; font-weight: 500; }
    .item-value { font-weight: 700; font-family: monospace; color: #1e293b; }
    .item-value.deduction { color: #ef4444; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 13px;
      font-weight: 700;
    }
    .total-earnings { background: #dcfce7; color: #15803d; }
    .total-deductions { background: #fee2e2; color: #b91c1c; }
    /* Net Salary Banner */
    .net-banner {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 12px;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
      margin-top: 24px;
    }
    .net-label { font-size: 14px; font-weight: 600; opacity: 0.9; }
    .net-amount { font-size: 32px; font-weight: 800; letter-spacing: -1px; font-family: monospace; }
    .net-period { font-size: 11px; opacity: 0.75; margin-top: 2px; }
    /* Footer */
    .footer {
      padding: 20px 40px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer-note { font-weight: 500; }
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e40af;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(30,64,175,0.3);
      font-family: 'Inter', sans-serif;
    }
    @media print {
      body { background: white; }
      .payslip { box-shadow: none; margin: 0; border-radius: 0; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <div>
        <div class="company-name">HR Flow</div>
        <div class="company-sub">Human Resources Management</div>
      </div>
      <div class="payslip-title">
        <h2>Pay Slip</h2>
        <p>${period}</p>
        <div class="slip-number">${slip.payslip_number}</div>
      </div>
    </div>

    <div class="emp-section">
      <div class="emp-field">
        <label>Employee Name</label>
        <span>${fullName}</span>
      </div>
      <div class="emp-field">
        <label>Employee ID</label>
        <span>${slip.employee_id_str}</span>
      </div>
      <div class="emp-field">
        <label>Department</label>
        <span>${slip.department_name || '—'}</span>
      </div>
      <div class="emp-field">
        <label>Designation</label>
        <span>${slip.designation_name || '—'}</span>
      </div>
      <div class="emp-field">
        <label>Pay Period</label>
        <span>${period}</span>
      </div>
      <div class="emp-field">
        <label>Generated On</label>
        <span>${generatedDate}</span>
      </div>
    </div>

    <div class="content">
      <div class="table-grid">
        <!-- Earnings -->
        <div>
          <div class="section-title">Earnings</div>
          <div class="item-row">
            <span class="item-label">Basic Salary</span>
            <span class="item-value">${fmt(basicSalary)}</span>
          </div>
          <div class="item-row">
            <span class="item-label">House Allowance (HRA)</span>
            <span class="item-value">${fmt(hra)}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Transport Allowance</span>
            <span class="item-value">${fmt(transport)}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Medical Allowance</span>
            <span class="item-value">${fmt(medical)}</span>
          </div>
          ${special > 0 ? `<div class="item-row">
            <span class="item-label">Special Allowance</span>
            <span class="item-value">${fmt(special)}</span>
          </div>` : ''}
          ${bonus > 0 ? `<div class="item-row">
            <span class="item-label">Bonus</span>
            <span class="item-value">${fmt(bonus)}</span>
          </div>` : ''}
          ${overtime > 0 ? `<div class="item-row">
            <span class="item-label">Overtime Pay</span>
            <span class="item-value">${fmt(overtime)}</span>
          </div>` : ''}
          <div class="total-row total-earnings">
            <span>Total Earnings</span>
            <span>${fmt(grossSalary)}</span>
          </div>
        </div>

        <!-- Deductions -->
        <div>
          <div class="section-title">Deductions</div>
          <div class="item-row">
            <span class="item-label">Income Tax (${slip.tax_percentage}%)</span>
            <span class="item-value deduction">${fmt(taxDeduction)}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Provident Fund (${slip.provident_fund_percentage}%)</span>
            <span class="item-value deduction">${fmt(pf)}</span>
          </div>
          ${otherDed > 0 ? `<div class="item-row">
            <span class="item-label">Other Deductions</span>
            <span class="item-value deduction">${fmt(otherDed)}</span>
          </div>` : ''}
          <div class="total-row total-deductions">
            <span>Total Deductions</span>
            <span>${fmt(totalDeductions)}</span>
          </div>
        </div>
      </div>

      <div class="net-banner">
        <div>
          <div class="net-label">Net Take-Home Salary</div>
          <div class="net-period">${period} · ${slip.payslip_number}</div>
        </div>
        <div class="net-amount">${fmt(netSalary)}</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-note">This is a computer-generated payslip and requires no signature.</div>
      <div>Generated: ${generatedDate}</div>
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
