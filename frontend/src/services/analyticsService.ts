import { api } from './api';

export const analyticsService = {
  getDashboardAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/dashboard/');
    return response.data.success ? response.data.data : response.data;
  },

  getEmployeeAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/employees/');
    return response.data.success ? response.data.data : response.data;
  },

  getAttendanceAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/attendance/');
    return response.data.success ? response.data.data : response.data;
  },

  getLeaveAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/leave/');
    return response.data.success ? response.data.data : response.data;
  },

  getPayrollAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/payroll/');
    return response.data.success ? response.data.data : response.data;
  },

  getRecruitmentAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/recruitment/');
    return response.data.success ? response.data.data : response.data;
  },

  getDocumentAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/documents/');
    return response.data.success ? response.data.data : response.data;
  },

  getOverviewAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/overview/');
    return response.data.success ? response.data.data : response.data;
  },

  getChartData: async (): Promise<any> => {
    const response = await api.get('/analytics/charts/');
    return response.data.success ? response.data.data : response.data;
  }
};
