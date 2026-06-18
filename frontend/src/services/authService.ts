import { api, setTokens, clearTokens } from './api';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
}

export const authService = {
  login: async (username: string, pass: string): Promise<UserSession | null> => {
    try {
      const response = await api.post('/auth/token/', {
        username,
        password: pass,
      });

      const { access, refresh } = response.data;
      setTokens(access, refresh);

      // Fetch user profile info
      const meResponse = await api.get('/auth/me/');
      const userData = meResponse.data;

      const user: UserSession = {
        id: userData.id,
        name: userData.name,
        email: username.includes('@') ? username : `${userData.name}@enterprise.co`,
        role: userData.role,
        permissions: userData.permissions || [],
        avatar: userData.avatar || (userData.role === 'EMPLOYEE' 
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' 
          : 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'),
      };

      localStorage.setItem('hr_session_auth', 'true');
      localStorage.setItem('hr_session_user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    clearTokens();
  },

  getCurrentUser: async (): Promise<UserSession | null> => {
    try {
      const token = localStorage.getItem('hr_access_token');
      if (!token) return null;
      
      const meResponse = await api.get('/auth/me/');
      const userData = meResponse.data;
      
      const cached = localStorage.getItem('hr_session_user');
      const cachedParsed = cached ? JSON.parse(cached) : {};

      const user: UserSession = {
        id: userData.id,
        name: userData.name,
        email: cachedParsed.email || `${userData.name}@enterprise.co`,
        role: userData.role,
        permissions: userData.permissions || [],
        avatar: userData.avatar || (userData.role === 'EMPLOYEE' 
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' 
          : 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'),
      };
      
      localStorage.setItem('hr_session_auth', 'true');
      localStorage.setItem('hr_session_user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Fetch current user error:', error);
      clearTokens();
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem('hr_session_auth') === 'true' && !!localStorage.getItem('hr_access_token');
  },

  getPermissions: async (): Promise<string[]> => {
    try {
      const response = await api.get('/auth/permissions/');
      return response.data;
    } catch (error) {
      console.error('Permissions fetch error:', error);
      return [];
    }
  }
};
