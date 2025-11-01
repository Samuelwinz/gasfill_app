import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'gasfill_token_v1';

// Admin API Service
class AdminApiService {
  private api: AxiosInstance;
  private baseURL = 'http://192.168.8.100:8000';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,  // Increased to 30 seconds
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
    try {
      const response = await this.api.get('/api/admin/dashboard');
      return response.data;
    } catch (error: any) {
      console.warn('⚠️ Admin dashboard endpoint not available, using mock data');
      // Return mock data when backend is not available
      return {
        orders: {
          total: 45,
          pending: 8,
          in_progress: 5,
          completed: 32,
        },
        users: {
          total: 127,
          active: 89,
          new_this_month: 12,
        },
        revenue: {
          total: 12500.00,
          monthly: 3200.00,
          daily: 450.00,
        },
        services: {
          total: 45,
          pending: 8,
          completed: 37,
        },
        recent_activity: {
          recent_orders: [],
        },
      };
    }
  }

  // Get all users
  async getUsers() {
    try {
      const response = await this.api.get('/api/admin/users');
      return response.data;
    } catch (error) {
      console.warn('⚠️ Users endpoint not available, using mock data');
      return [];
    }
  }

  // Get all riders
  async getRiders() {
    try {
      const response = await this.api.get('/api/admin/riders');
      return response.data;
    } catch (error: any) {
      console.warn('⚠️ Riders endpoint not available, using mock data');
      // Return mock riders data
      return [
        {
          id: 1,
          username: 'John Rider',
          email: 'john.rider@gasfill.com',
          phone: '+233241234567',
          status: 'available',
          vehicle_type: 'Motorcycle',
          vehicle_number: 'GH-1234-20',
          total_deliveries: 145,
          rating: 4.8,
          created_at: '2024-01-15T08:00:00Z',
        },
        {
          id: 2,
          username: 'Sarah Transport',
          email: 'sarah.t@gasfill.com',
          phone: '+233247654321',
          status: 'busy',
          vehicle_type: 'Van',
          vehicle_number: 'GH-5678-20',
          total_deliveries: 98,
          rating: 4.6,
          created_at: '2024-02-20T10:30:00Z',
        },
        {
          id: 3,
          username: 'Mike Delivery',
          email: 'mike.d@gasfill.com',
          phone: '+233243456789',
          status: 'offline',
          vehicle_type: 'Motorcycle',
          vehicle_number: 'GH-9012-20',
          total_deliveries: 67,
          rating: 4.5,
          created_at: '2024-03-10T14:15:00Z',
        },
      ];
    }
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
    try {
      const response = await this.api.get('/api/admin/earnings/overview');
      return response.data;
    } catch (error) {
      console.warn('⚠️ Earnings overview endpoint not available, using mock data');
      return {
        total_earnings: 8500.00,
        pending_payouts: 1200.00,
        paid_out: 7300.00,
        commission_rate: 0.15,
        riders_count: 12,
        active_riders: 8,
      };
    }
  }

  // Get payment requests (payouts)
  async getPaymentRequests() {
    try {
      const response = await this.api.get('/api/admin/payment-requests');
      return response.data;
    } catch (error) {
      console.warn('⚠️ Payment requests endpoint not available, using mock data');
      return {
        requests: [
          {
            id: 1,
            rider_id: 1,
            rider_name: 'John Rider',
            amount: 450.00,
            status: 'pending',
            created_at: '2025-10-25T10:00:00Z',
            delivery_count: 15,
          },
          {
            id: 2,
            rider_id: 2,
            rider_name: 'Sarah Transport',
            amount: 380.00,
            status: 'pending',
            created_at: '2025-10-24T14:30:00Z',
            delivery_count: 12,
          },
        ],
      };
    }
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
