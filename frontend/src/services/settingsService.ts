import { api } from './api';

export const settingsService = {
  getProfile: async (): Promise<any> => {
    const response = await api.get('/settings/profile/');
    return response.data;
  },

  updateProfile: async (data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    avatar?: string;
  }): Promise<any> => {
    const response = await api.put('/settings/profile/', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<any> => {
    const response = await api.post('/auth/change-password/', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  getPreferences: async (): Promise<any> => {
    const response = await api.get('/settings/preferences/');
    return response.data;
  },

  updatePreferences: async (data: {
    theme?: string;
    language?: string;
    dashboard_preferences?: any;
  }): Promise<any> => {
    const response = await api.put('/settings/preferences/', data);
    return response.data;
  },

  getNotifications: async (): Promise<any> => {
    const response = await api.get('/settings/notifications/');
    return response.data;
  },

  updateNotifications: async (data: {
    email_notifications?: boolean;
    attendance_notifications?: boolean;
    leave_notifications?: boolean;
    payroll_notifications?: boolean;
    recruitment_notifications?: boolean;
  }): Promise<any> => {
    const response = await api.put('/settings/notifications/', data);
    return response.data;
  }
};
