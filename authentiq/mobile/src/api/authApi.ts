import { apiRequest } from './client';

export interface AuthResponseData {
  token: string;
  tokenType: string;
  id: number;
  name: string;
  email: string;
  organizationCode: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponseData> {
    const res = await apiRequest<AuthResponseData>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.success && res.data) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('@authentiq_jwt_token', res.data.token);
        localStorage.setItem('@authentiq_user_email', res.data.email);
        localStorage.setItem('@authentiq_user_org', res.data.organizationCode);
      }
      return res.data;
    }

    throw new Error(res.message || 'Login failed');
  },

  async register(name: string, email: string, password: string, organizationCode: string): Promise<AuthResponseData> {
    const res = await apiRequest<AuthResponseData>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, organizationCode }),
    });

    if (res.success && res.data) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('@authentiq_jwt_token', res.data.token);
        localStorage.setItem('@authentiq_user_email', res.data.email);
        localStorage.setItem('@authentiq_user_org', res.data.organizationCode);
      }
      return res.data;
    }

    throw new Error(res.message || 'Registration failed');
  },

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('@authentiq_jwt_token');
      localStorage.removeItem('@authentiq_user_email');
      localStorage.removeItem('@authentiq_user_org');
    }
  },

  isAuthenticated(): boolean {
    if (typeof localStorage !== 'undefined') {
      return !!localStorage.getItem('@authentiq_jwt_token');
    }
    return false;
  },
};
