import { api } from './api';
import { Employee, EmployeeStatus } from '../types';

// Helper to map backend Employee serializer response to frontend Employee type
export const mapBackendEmployeeToFrontend = (data: any): Employee => {
  return {
    id: data.employee_id,
    name: `${data.first_name} ${data.last_name}`.trim(),
    email: data.email || '',
    phone: data.phone || '',
    status: data.employment_status as EmployeeStatus,
    department: data.department_name || 'Engineering',
    role: data.designation_name || 'Software Developer',
    manager: 'Sarah Jenkins', // Fallback or retrieve from backend if added
    joinDate: data.joining_date ? new Date(data.joining_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Just Hired',
    location: data.address || 'New York Office',
    avatar: data.profile_image || data.profile_picture || '',
    salary: Number(data.salary) || 0,
    is_deleted: data.is_deleted || false,
    termination_date: data.termination_date || null,
    termination_reason: data.termination_reason || null,
    termination_notes: data.termination_notes || null,
    assigned_hr: data.assigned_hr || null,
    assigned_hr_name: data.assigned_hr_name || '',
    assigned_hr_email: data.assigned_hr_email || '',
    assigned_hr_department: data.assigned_hr_department || '',
    personalInfo: {
      fullName: `${data.first_name} ${data.last_name}`.trim(),
      emailAddress: data.email || '',
      phoneNumber: data.phone || '',
      statusLabel: 'Active ' + (data.employment_status || 'ACTIVE'),
      emergencyContact: data.emergency_contact?.name ? `${data.emergency_contact.name} - ${data.emergency_contact.phone}` : 'John Doe - 555-0100',
      healthBenefits: 'Dental, Physical & Eye Plus',
      office: data.address || 'New York Office',
      productStatus: (data.designation_name || 'Software Developer') + ' Position',
    },
    metrics: {
      attendanceRate: 98.0,
      leaveBalance: 15,
      hireDateTrend: 'Hired recently',
      attendanceTrend: [98, 98, 98],
    },
    journey: [
      {
        id: '1',
        date: data.joining_date || 'Recent',
        title: 'Joined Company',
        description: `Started as ${data.designation_name || 'Software Developer'} in ${data.department_name || 'Engineering'}`,
        type: 'HIRED',
      }
    ],
  };
};

export const employeeService = {
  getEmployees: async (params?: { department?: number; designation?: number; status?: string; search?: string; show_deleted?: boolean }): Promise<Employee[]> => {
    try {
      const response = await api.get('/employees/', { params });
      const results = response.data.results || response.data;
      return results.map(mapBackendEmployeeToFrontend);
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  },

  getEmployeeById: async (id: string): Promise<Employee | null> => {
    try {
      const response = await api.get(`/employees/${id}/`);
      return mapBackendEmployeeToFrontend(response.data);
    } catch (error) {
      console.error(`Error fetching employee with ID ${id}:`, error);
      return null;
    }
  },

  createEmployee: async (data: Omit<Employee, 'id' | 'avatar' | 'metrics' | 'journey'> & { password?: string; confirm_password?: string }, profileImageFile?: File | null): Promise<Employee | null> => {
    try {
      const names = data.name.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || 'Employee';

      // Fetch departments/designations to map matching IDs
      const depts = await employeeService.getDepartments();
      const desigs = await employeeService.getDesignations();

      const matchedDept = depts.find(d => d.name.toLowerCase() === data.department.toLowerCase()) || depts[0];
      const matchedDesig = desigs.find(d => d.name.toLowerCase() === data.role.toLowerCase()) || desigs[0];

      // Form request payload for backend serializer
      const payload: any = {
        employee_id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        first_name: firstName,
        last_name: lastName,
        email: data.email,
        phone: data.phone,
        address: data.location,
        joining_date: new Date().toISOString().split('T')[0],
        department: matchedDept ? matchedDept.id : 1,
        designation: matchedDesig ? matchedDesig.id : 1,
        salary: String(data.salary || 50000.0),
        employment_status: data.status || 'ACTIVE',
        emergency_contact: JSON.stringify({ name: 'Emergency Ref', phone: '555-0100' }),
      };

      if (data.assigned_hr) payload.assigned_hr = data.assigned_hr;
      if (data.password) payload.password = data.password;
      if (data.confirm_password) payload.confirm_password = data.confirm_password;

      let response;
      if (profileImageFile) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          formData.append(key, payload[key]);
        });
        formData.append('profile_image', profileImageFile);
        response = await api.post('/employees/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await api.post('/employees/', payload);
      }
      return mapBackendEmployeeToFrontend(response.data);
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  },

  updateEmployee: async (id: string, data: Partial<Employee> & { password?: string; confirm_password?: string }, profileImageFile?: File | null): Promise<Employee | null> => {
    try {
      const patchData: any = {};
      
      if (data.name) {
        const names = data.name.split(' ');
        patchData.first_name = names[0];
        patchData.last_name = names.slice(1).join(' ');
      }
      if (data.email) patchData.email = data.email;
      if (data.phone) patchData.phone = data.phone;
      if (data.location) patchData.address = data.location;
      if (data.status) patchData.employment_status = data.status;
      if (data.salary !== undefined) patchData.salary = String(data.salary);
      if (data.assigned_hr !== undefined) patchData.assigned_hr = data.assigned_hr;
      if (data.password) patchData.password = data.password;
      if (data.confirm_password) patchData.confirm_password = data.confirm_password;

      if (data.department) {
        const depts = await employeeService.getDepartments();
        const dept = depts.find(d => d.name.toLowerCase() === data.department?.toLowerCase());
        if (dept) patchData.department = dept.id;
      }
      
      if (data.role) {
        const desigs = await employeeService.getDesignations();
        const desig = desigs.find(d => d.name.toLowerCase() === data.role?.toLowerCase());
        if (desig) patchData.designation = desig.id;
      }

      let response;
      if (profileImageFile) {
        const formData = new FormData();
        Object.keys(patchData).forEach(key => {
          formData.append(key, patchData[key]);
        });
        formData.append('profile_image', profileImageFile);
        response = await api.patch(`/employees/${id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await api.patch(`/employees/${id}/`, patchData);
      }
      return mapBackendEmployeeToFrontend(response.data);
    } catch (error) {
      console.error(`Error updating employee ${id}:`, error);
      return null;
    }
  },

  deleteEmployee: async (id: string, permanent: boolean = false): Promise<boolean> => {
    try {
      await api.delete(`/employees/${id}/`, {
        params: { permanent }
      });
      return true;
    } catch (error) {
      console.error(`Error deleting employee ${id}:`, error);
      return false;
    }
  },

  terminateEmployee: async (id: string, data: { termination_date: string; termination_reason: string; notes: string; status: string }): Promise<Employee | null> => {
    try {
      const response = await api.post(`/employees/${id}/terminate/`, data);
      return mapBackendEmployeeToFrontend(response.data);
    } catch (error) {
      console.error(`Error terminating employee ${id}:`, error);
      return null;
    }
  },

  restoreEmployee: async (id: string, updateData?: any): Promise<Employee | null> => {
    try {
      const response = await api.post(`/employees/${id}/restore/`, updateData);
      return mapBackendEmployeeToFrontend(response.data);
    } catch (error) {
      console.error(`Error restoring employee ${id}:`, error);
      return null;
    }
  },

  uploadPhoto: async (id: string, file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/employees/${id}/upload-photo/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.profile_picture;
    } catch (error) {
      console.error(`Error uploading photo for employee ${id}:`, error);
      return null;
    }
  },

  exportCSV: async (params?: any, selectedIds?: string[]): Promise<Blob | null> => {
    try {
      const exportParams = { ...params };
      if (selectedIds && selectedIds.length > 0) {
        exportParams.selected_ids = selectedIds.join(',');
      }
      const response = await api.get('/employees/export-csv/', {
        params: exportParams,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return null;
    }
  },

  importCSV: async (file: File, commit: boolean = false): Promise<any | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/employees/import-csv/', formData, {
        params: { commit },
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error importing CSV:', error);
      return null;
    }
  },

  getAuditLogs: async (id: string): Promise<any[]> => {
    try {
      const response = await api.get(`/employees/${id}/audit-logs/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching audit logs for employee ${id}:`, error);
      return [];
    }
  },

  getDepartments: async (): Promise<Array<{ id: number; name: string; description: string; employee_count: number }>> => {
    try {
      const response = await api.get('/departments/');
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  },

  getDesignations: async (): Promise<Array<{ id: number; name: string; department: number; department_name: string; description: string }>> => {
    try {
      const response = await api.get('/designations/');
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching designations:', error);
      return [];
    }
  },

  getHRStaff: async (): Promise<Array<{ id: number; username: string; full_name: string; is_active: boolean }>> => {
    try {
      const response = await api.get('/hr/');
      return response.data;
    } catch (error) {
      console.error('Error fetching HR staff:', error);
      return [];
    }
  }
};
