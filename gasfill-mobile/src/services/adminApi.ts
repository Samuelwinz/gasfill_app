import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'gasfill_token_v1';

// Admin API Service
class AdminApiService {
  private api: AxiosInstance;
  private baseURL = 'http://192.168.1.25:8000';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('🔑 Admin API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('❌ Admin API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  // Get admin dashboard stats
  async getDashboard() {
    const response = await this.api.get('/api/admin/dashboard');
    return response.data;
  }

  // Get all users
  async getUsers() {
    const response = await this.api.get('/api/admin/users');
    return response.data;
  }

  // Get all riders
  async getRiders() {
    const response = await this.api.get('/api/admin/riders');
    return response.data;
  }

  // Get all orders
  async getOrders() {
    const response = await this.api.get('/api/admin/orders');
    return response.data;
  }

  // Get all services
  async getServices() {
    const response = await this.api.get('/api/admin/services');
    return response.data;
  }

  // Update user status
  async updateUserStatus(userId: number, status: 'active' | 'inactive') {
    const response = await this.api.patch(`/api/admin/users/${userId}/status`, { status });
    return response.data;
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: string) {
    const response = await this.api.patch(`/api/admin/orders/${orderId}/status`, { status });
    return response.data;
  }

  // Update service status
  async updateServiceStatus(serviceId: string, status: string) {
    const response = await this.api.patch(`/api/admin/services/${serviceId}/status`, { status });
    return response.data;
  }

  // Delete user
  async deleteUser(userId: number) {
    const response = await this.api.delete(`/api/admin/users/${userId}`);
    return response.data;
  }

  // Get earnings overview
  async getEarningsOverview() {
    const response = await this.api.get('/api/admin/earnings/overview');
    return response.data;
  }

  // Get payment requests (payouts)
  async getPaymentRequests() {
    const response = await this.api.get('/api/admin/payment-requests');
    return response.data;
  }

  // Process payment request
  async processPaymentRequest(requestId: number, action: 'approve' | 'reject') {
    const response = await this.api.post(`/api/admin/payment-requests/${requestId}/process`, { action });
    return response.data;
  }

  // Get earnings statistics
  async getEarningsStatistics() {
    const response = await this.api.get('/api/admin/earnings/statistics');
    return response.data;
  }
}

export const adminApi = new AdminApiService();
export default adminApi;
