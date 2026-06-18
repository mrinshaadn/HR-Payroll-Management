import { api } from './api';
import { LeaveRequest } from '../types';

export const mapBackendLeaveToFrontend = (data: any): LeaveRequest => {
  const formatDateRange = (start: string, end: string) => {
    try {
      const sDate = new Date(start);
      const eDate = new Date(end);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
      return `${sDate.toLocaleDateString('en-US', options)} - ${eDate.toLocaleDateString('en-US', options)}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  return {
    id: String(data.id),
    employeeName: data.employee_name || 'Employee',
    employeeAvatar: data.employee_avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    leaveType: data.leave_type_name || 'Annual Leave',
    reason: data.reason || '',
    dates: formatDateRange(data.start_date, data.end_date),
    duration: `${data.total_days || 1} Days`,
    status: data.status as LeaveRequest['status'],
  };
};

export const leaveService = {
  // Required: getLeaveTypes()
  getLeaveTypes: async (): Promise<Array<{ id: number; name: string; max_days: number }>> => {
    try {
      const response = await api.get('/leave-types/');
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching leave types:', error);
      return [];
    }
  },

  // Required: getLeaveBalances()
  getLeaveBalances: async (params?: { employee_id?: string; year?: number }): Promise<Array<{ id: number; leave_type_name: string; allocated_days: number; remaining_days: number }>> => {
    try {
      const response = await api.get('/leave-balances/', { params });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      return [];
    }
  },

  // Required: getLeaveRequests()
  getLeaveRequests: async (params?: { employee_id?: string; status?: string }): Promise<LeaveRequest[]> => {
    try {
      const response = await api.get('/leave-requests/', { params });
      const results = response.data.results || response.data;
      return results.map(mapBackendLeaveToFrontend);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      return [];
    }
  },

  // Required: applyLeave()
  applyLeave: async (data: { leaveType: string; startDate: string; endDate: string; reason: string }): Promise<LeaveRequest | null> => {
    try {
      // Resolve leave type ID by name
      const types = await leaveService.getLeaveTypes();
      let matchedType = types.find(t => t.name.toLowerCase() === data.leaveType.toLowerCase());
      
      // Fallback: If not found, use first type or try partial match
      if (!matchedType) {
        matchedType = types.find(t => t.name.toLowerCase().includes(data.leaveType.toLowerCase())) || types[0];
      }

      const payload = {
        leave_type: matchedType ? matchedType.id : 1,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason,
      };

      const response = await api.post('/leave-requests/apply/', payload);
      return mapBackendLeaveToFrontend(response.data);
    } catch (error) {
      console.error('Error applying for leave:', error);
      return null;
    }
  },

  // Required: approveLeave()
  approveLeave: async (requestId: string): Promise<LeaveRequest | null> => {
    try {
      const response = await api.post('/leave-requests/approve/', {
        request_id: Number(requestId),
      });
      return mapBackendLeaveToFrontend(response.data);
    } catch (error) {
      console.error('Error approving leave:', error);
      return null;
    }
  },

  // Required: rejectLeave()
  rejectLeave: async (requestId: string, reason: string): Promise<LeaveRequest | null> => {
    try {
      const response = await api.post('/leave-requests/reject/', {
        request_id: Number(requestId),
        rejection_reason: reason,
      });
      return mapBackendLeaveToFrontend(response.data);
    } catch (error) {
      console.error('Error rejecting leave:', error);
      return null;
    }
  },

  // Required: getLeaveHistory()
  getLeaveHistory: async (params?: { employee_id?: string; status?: string }): Promise<LeaveRequest[]> => {
    try {
      const response = await api.get('/leave-requests/history/', { params });
      const results = response.data.results || response.data;
      return results.map(mapBackendLeaveToFrontend);
    } catch (error) {
      console.error('Error fetching leave history:', error);
      return [];
    }
  },

  // Required: getLeaveReports()
  getLeaveReports: async (params?: { year?: number }): Promise<any> => {
    try {
      const response = await api.get('/leave-reports/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching leave reports:', error);
      return null;
    }
  },

  cancelLeaveRequest: async (requestId: string): Promise<boolean> => {
    try {
      await api.delete(`/leave-requests/${requestId}/`);
      return true;
    } catch (error) {
      console.error('Error canceling leave request:', error);
      return false;
    }
  },

  // Aliases for compatibility
  getBalances: async (): Promise<Array<{ id: number; leave_type_name: string; allocated_days: number; remaining_days: number }>> => {
    return leaveService.getLeaveBalances();
  },

  getHistory: async (params?: { employee_id?: string; status?: string }): Promise<LeaveRequest[]> => {
    return leaveService.getLeaveHistory(params);
  }
};
