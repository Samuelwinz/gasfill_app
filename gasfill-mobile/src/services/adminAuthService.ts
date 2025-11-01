import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.8.100:8000';
const ADMIN_TOKEN_KEY = 'gasfill_admin_token';
const ADMIN_KEY = 'gasfill_admin_master_key_2025'; // Admin access key

interface AdminLoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    phone: string;
    address: string;
    role: string;
  };
}

interface AdminUser {
  id: number;
  email: string;
  username: string;
  phone: string;
  address: string;
  role: string;
}

class AdminAuthService {
  /**
   * Login admin user and store admin-specific token
   */
  async adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
    try {
      console.log('🔐 Attempting admin login to:', `${API_URL}/api/auth/admin-login`);
      
      const response = await axios.post<AdminLoginResponse>(`${API_URL}/api/auth/admin-login`, {
        email,
        password,
        admin_key: ADMIN_KEY, // Include admin key for authentication
      });

      if (response.data.token) {
        // Store admin token separately from user token
        await AsyncStorage.setItem(ADMIN_TOKEN_KEY, response.data.token);
        
        // Store admin user data
        await AsyncStorage.setItem('admin_user', JSON.stringify(response.data.user));
        
        // Store admin role for navigation (as JSON for consistency)
        await AsyncStorage.setItem('userRole', JSON.stringify('admin'));
        
        console.log('✅ Admin token and role stored successfully');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Admin login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      });
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.detail || 
                           error.response.data?.message || 
                           `Server error: ${error.response.status}`;
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request made but no response received
        throw new Error('Cannot connect to server. Please check your network connection and ensure the server is running.');
      } else {
        // Something else happened
        throw new Error(error.message || 'An unexpected error occurred during login');
      }
    }
  }

  /**
   * Get stored admin token
   */
  async getAdminToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting admin token:', error);
      return null;
    }
  }

  /**
   * Get stored admin user data
   */
  async getAdminUser(): Promise<AdminUser | null> {
    try {
      const userData = await AsyncStorage.getItem('admin_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting admin user:', error);
      return null;
    }
  }

  /**
   * Check if user is logged in as admin
   */
  async isAdminLoggedIn(): Promise<boolean> {
    const token = await this.getAdminToken();
    return token !== null;
  }

  /**
   * Logout admin user
   */
  async adminLogout(): Promise<void> {
    try {
      console.log('🚪 Logging out admin...');
      await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
      await AsyncStorage.removeItem('admin_user');
      await AsyncStorage.removeItem('userRole');
      console.log('✅ Admin logout complete');
    } catch (error) {
      console.error('Error logging out admin:', error);
    }
  }

  /**
   * Make authenticated admin API request
   */
  async makeAdminRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      params?: any;
    } = {}
  ): Promise<T> {
    const token = await this.getAdminToken();
    
    if (!token) {
      throw new Error('Admin authentication required');
    }

    const { method = 'GET', data, params } = options;

    try {
      const response = await axios({
        url: `${API_URL}${endpoint}`,
        method,
        data,
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        // Admin token is invalid or expired
        await this.adminLogout();
        throw new Error('Admin session expired. Please login again.');
      }
      throw error;
    }
  }
}

export default new AdminAuthService();
