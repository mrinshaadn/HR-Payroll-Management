import { api } from './api';

export interface PayslipRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_status: string;
  payment_date: string | null;
  period_start: string;
  period_end: string;
}

export const payrollService = {
  // Required: getPayrolls()
  getPayrolls: async (params?: { employee_id?: string; month?: number; year?: number; status?: string }): Promise<any[]> => {
    try {
      const response = await api.get('/payrolls/', { params });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      return [];
    }
  },

  // Required: getSalaryStructures()
  getSalaryStructures: async (params?: { search?: string }): Promise<any[]> => {
    try {
      const response = await api.get('/salary-structures/', { params });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching salary structures:', error);
      return [];
    }
  },

  // Required: createSalaryStructure()
  createSalaryStructure: async (data: any): Promise<any | null> => {
    try {
      const response = await api.post('/salary-structures/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating salary structure:', error);
      return null;
    }
  },

  // Required: updateSalaryStructure()
  updateSalaryStructure: async (id: number, data: any): Promise<any | null> => {
    try {
      const response = await api.patch(`/salary-structures/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating salary structure ${id}:`, error);
      return null;
    }
  },

  // Required: deleteSalaryStructure()
  deleteSalaryStructure: async (id: number): Promise<boolean> => {
    try {
      await api.delete(`/salary-structures/${id}/`);
      return true;
    } catch (error) {
      console.error(`Error deleting salary structure ${id}:`, error);
      return false;
    }
  },

  // Required: processPayroll()
  processPayroll: async (params?: { year?: number; month?: number; employee_id?: string }): Promise<any> => {
    try {
      const response = await api.post('/payroll/process/', params || {});
      return response.data;
    } catch (error) {
      console.error('Error processing payroll:', error);
      return null;
    }
  },

  // Required: getPayslips()
  getPayslips: async (params?: { employee_id?: string }): Promise<any[]> => {
    try {
      const response = await api.get('/payslips/', { params });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching payslips:', error);
      return [];
    }
  },

  // Required: downloadPayslip()
  downloadPayslip: async (payslipId: number, title?: string): Promise<void> => {
    try {
      // Trigger a client-side generated text/csv statement download as payslip fallback representation
      const response = await api.get(`/payslips/${payslipId}/`);
      const data = response.data;
      
      const headers = ['Payslip Number', 'Employee', 'Month/Year', 'Net Payout', 'Generated Date'];
      const row = [
        data.payslip_number,
        `${data.employee_name} ${data.employee_last_name}`,
        `${data.payroll_month}/${data.payroll_year}`,
        `$${data.net_salary}`,
        data.generated_at
      ];

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), row.join(',')].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", title || `Payslip_${data.payslip_number}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Error downloading payslip ${payslipId}:`, error);
    }
  },

  // Required: getPayrollReports()
  getPayrollReports: async (params?: { year?: number; month?: number }): Promise<any> => {
    try {
      const response = await api.get('/payroll/reports/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payroll reports:', error);
      return null;
    }
  },

  // Required: getMonthlySummary()
  getMonthlySummary: async (params?: { employee_id?: string; year?: number; month?: number }): Promise<any> => {
    try {
      const response = await api.get('/payroll/monthly-summary/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payroll monthly summary:', error);
      return null;
    }
  }
};
