import { api } from './api';
import { AttendanceRecord } from '../types';

export const mapBackendAttendanceToFrontend = (data: any): AttendanceRecord => {
  const formatTime = (isoString: string | null) => {
    if (!isoString || isoString === '-') return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const getShiftType = (status: string) => {
    if (status === 'ABSENT' || status === 'Absent') return 'Absent';
    return 'Morning'; // default shift
  };

  const getStatus = (status: string): AttendanceRecord['status'] => {
    if (!status) return 'Present';
    const s = status.toUpperCase();
    switch (s) {
      case 'PRESENT': return 'Present';
      case 'LATE': return 'Late';
      case 'HALF DAY':
      case 'HALF_DAY':
        return 'Half Day';
      case 'LEAVE': return 'Leave';
      case 'WFH': return 'WFH';
      case 'ABSENT': return 'Absent';
      default: return 'Present';
    }
  };

  const hasClockedOut = !!data.check_out && data.check_out !== '-';

  const formatHoursMinutes = (hVal: any, mVal: any) => {
    if (!data.check_in) return '-';
    if (!hasClockedOut) return '-';
    const h = parseInt(String(hVal)) || 0;
    const m = parseInt(String(mVal)) || 0;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const formatOvertime = (hVal: any, mVal: any) => {
    if (!data.check_in) return '0h 00m';
    if (!hasClockedOut) return '0h 00m';
    const h = parseInt(String(hVal)) || 0;
    const m = parseInt(String(mVal)) || 0;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  return {
    id: String(data.id),
    employeeId: data.employee_code || data.employee || '',
    name: `${data.employee_name || ''} ${data.employee_last_name || ''}`.trim() || 'Eleanor Vance',
    avatar: data.employee_avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    shiftType: getShiftType(data.status),
    clockIn: formatTime(data.check_in),
    clockOut: formatTime(data.check_out),
    workHours: formatHoursMinutes(data.total_hours, data.total_minutes),
    overtime: formatOvertime(data.overtime_hours, data.overtime_minutes),
    status: getStatus(data.status),
  };
};

export const attendanceService = {
  // Required by instructions
  getAttendance: async (params?: { employee_id?: string; ordering?: string }): Promise<AttendanceRecord[]> => {
    try {
      const response = await api.get('/attendance/', { params });
      const results = response.data.results || response.data;
      return results.map(mapBackendAttendanceToFrontend);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  },

  // Required: getTodayAttendance()
  getTodayAttendance: async (): Promise<AttendanceRecord | null> => {
    try {
      const response = await api.get('/attendance/today/');
      return mapBackendAttendanceToFrontend(response.data);
    } catch (error) {
      // 404 is expected if not clocked in today
      return null;
    }
  },

  // Required: clockIn()
  clockIn: async (): Promise<AttendanceRecord | null> => {
    try {
      const response = await api.post('/attendance/clock-in/');
      return mapBackendAttendanceToFrontend(response.data);
    } catch (error) {
      console.error('Error clocking in:', error);
      return null;
    }
  },

  // Required: clockOut()
  clockOut: async (): Promise<AttendanceRecord | null> => {
    try {
      const response = await api.post('/attendance/clock-out/');
      return mapBackendAttendanceToFrontend(response.data);
    } catch (error) {
      console.error('Error clocking out:', error);
      return null;
    }
  },

  // Required: getAttendanceHistory()
  getAttendanceHistory: async (params?: { employee_id?: string; status?: string; start_date?: string; end_date?: string; department?: string; synth?: boolean }): Promise<AttendanceRecord[]> => {
    try {
      const { synth, ...rest } = params || {};
      const queryParams: any = { ...rest };
      if (synth) {
        queryParams.synth = 'true';
      }
      const response = await api.get('/attendance/', { params: queryParams });
      const results = response.data.results || response.data;
      return results.map(mapBackendAttendanceToFrontend);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      return [];
    }
  },

  // Required: getMonthlySummary()
  getMonthlySummary: async (params?: { employee_id?: string; year?: number; month?: number }): Promise<any> => {
    try {
      const response = await api.get('/attendance/monthly-summary/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance monthly summary:', error);
      return null;
    }
  },

  // Aliases for compatibility with other files (e.g. HRContext)
  getTodayStatus: async (): Promise<AttendanceRecord | null> => {
    return attendanceService.getTodayAttendance();
  },

  getHistory: async (params?: { employee_id?: string; status?: string; start_date?: string; end_date?: string }): Promise<AttendanceRecord[]> => {
    return attendanceService.getAttendanceHistory(params);
  }
};
