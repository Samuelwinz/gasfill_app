import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  Order, 
  OrderCreateRequest, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  ApiResponse,
  User,
  PickupRequest,
  Rider,
  RefillOutlet,
  Commission,
  Payout
} from '../types';
import { StorageService } from '../utils/storage';

// Backend configuration - adjust these based on your setup
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development - Python FastAPI server
  : 'https://your-production-api.com'; // Production URL

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await StorageService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - logout user
          await StorageService.logout();
          // You might want to navigate to login screen here
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await this.api.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user failed:', error);
      throw error;
    }
  }

  // Orders
  async createOrder(orderData: OrderCreateRequest): Promise<Order> {
    try {
      const response = await this.api.post('/api/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Create order failed:', error);
      throw error;
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      const response = await this.api.get('/api/orders');
      return response.data;
    } catch (error) {
      console.error('Get orders failed:', error);
      throw error;
    }
  }

  async getCustomerOrders(): Promise<Order[]> {
    try {
      const response = await this.api.get('/api/customer/orders');
      return response.data;
    } catch (error) {
      console.error('Get customer orders failed:', error);
      throw error;
    }
  }

  async getOrderById(orderId: string): Promise<Order> {
    try {
      const response = await this.api.get(`/api/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Get order by ID failed:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    try {
      const response = await this.api.patch(`/api/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update order status failed:', error);
      throw error;
    }
  }

  // Stats (for admin dashboard)
  async getStats(): Promise<any> {
    try {
      const response = await this.api.get('/api/stats');
      return response.data;
    } catch (error) {
      console.error('Get stats failed:', error);
      throw error;
    }
  }

  // Helper method to check if backend is reachable
  async checkConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Pickup/Refill Service Methods
  async createPickupRequest(pickupData: Partial<PickupRequest>): Promise<PickupRequest> {
    try {
      const response = await this.api.post('/api/pickup-requests', pickupData);
      return response.data;
    } catch (error) {
      console.error('Create pickup request failed:', error);
      throw error;
    }
  }

  async getPickupRequests(status?: string): Promise<PickupRequest[]> {
    try {
      const params = status ? { status } : {};
      const response = await this.api.get('/api/pickup-requests', { params });
      return response.data;
    } catch (error) {
      console.error('Get pickup requests failed:', error);
      throw error;
    }
  }

  async getPickupRequest(requestId: string): Promise<PickupRequest> {
    try {
      const response = await this.api.get(`/api/pickup-requests/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('Get pickup request failed:', error);
      throw error;
    }
  }

  async acceptPickupJob(requestId: string, riderId: number): Promise<PickupRequest> {
    try {
      const response = await this.api.post(`/api/pickup-requests/${requestId}/accept`, { rider_id: riderId });
      return response.data;
    } catch (error) {
      console.error('Accept pickup job failed:', error);
      throw error;
    }
  }

  async updatePickupStatus(requestId: string, status: string, data?: any): Promise<PickupRequest> {
    try {
      const response = await this.api.patch(`/api/pickup-requests/${requestId}/status`, { status, ...data });
      return response.data;
    } catch (error) {
      console.error('Update pickup status failed:', error);
      throw error;
    }
  }

  async confirmPickup(requestId: string, photoUri: string): Promise<PickupRequest> {
    try {
      const formData = new FormData();
      formData.append('pickup_photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'pickup.jpg',
      } as any);

      const response = await this.api.post(`/api/pickup-requests/${requestId}/confirm-pickup`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Confirm pickup failed:', error);
      throw error;
    }
  }

  async confirmRefill(requestId: string, photoUri: string, qrCode?: string): Promise<PickupRequest> {
    try {
      const formData = new FormData();
      formData.append('refill_photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'refill.jpg',
      } as any);
      if (qrCode) {
        formData.append('qr_code', qrCode);
      }

      const response = await this.api.post(`/api/pickup-requests/${requestId}/confirm-refill`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Confirm refill failed:', error);
      throw error;
    }
  }

  // Rider Management
  async getRiders(): Promise<Rider[]> {
    try {
      const response = await this.api.get('/api/riders');
      return response.data;
    } catch (error) {
      console.error('Get riders failed:', error);
      throw error;
    }
  }

  async getRider(riderId: number): Promise<Rider> {
    try {
      const response = await this.api.get(`/api/riders/${riderId}`);
      return response.data;
    } catch (error) {
      console.error('Get rider failed:', error);
      throw error;
    }
  }

  async updateRiderStatus(riderId: number, status: string): Promise<Rider> {
    try {
      const response = await this.api.patch(`/api/riders/${riderId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update rider status failed:', error);
      throw error;
    }
  }

  async updateRiderAvailability(riderId: number, isAvailable: boolean): Promise<Rider> {
    try {
      const response = await this.api.patch(`/api/riders/${riderId}/availability`, { is_available: isAvailable });
      return response.data;
    } catch (error) {
      console.error('Update rider availability failed:', error);
      throw error;
    }
  }

  async getRiderJobs(riderId: number, status?: string): Promise<PickupRequest[]> {
    try {
      const params = status ? { status } : {};
      const response = await this.api.get(`/api/riders/${riderId}/jobs`, { params });
      return response.data;
    } catch (error) {
      console.error('Get rider jobs failed:', error);
      throw error;
    }
  }

  async getRiderEarnings(riderId: number, period?: 'today' | 'week' | 'month'): Promise<{
    total: number;
    period_total: number;
    commissions: Commission[];
  }> {
    try {
      const params = period ? { period } : {};
      const response = await this.api.get(`/api/riders/${riderId}/earnings`, { params });
      return response.data;
    } catch (error) {
      console.error('Get rider earnings failed:', error);
      throw error;
    }
  }

  // Refill Outlets
  async getRefillOutlets(): Promise<RefillOutlet[]> {
    try {
      const response = await this.api.get('/api/refill-outlets');
      return response.data;
    } catch (error) {
      console.error('Get refill outlets failed:', error);
      throw error;
    }
  }

  async createRefillOutlet(outletData: Partial<RefillOutlet>): Promise<RefillOutlet> {
    try {
      const response = await this.api.post('/api/refill-outlets', outletData);
      return response.data;
    } catch (error) {
      console.error('Create refill outlet failed:', error);
      throw error;
    }
  }

  async updateRefillOutlet(outletId: number, outletData: Partial<RefillOutlet>): Promise<RefillOutlet> {
    try {
      const response = await this.api.patch(`/api/refill-outlets/${outletId}`, outletData);
      return response.data;
    } catch (error) {
      console.error('Update refill outlet failed:', error);
      throw error;
    }
  }

  // Commission Management
  async getCommissions(riderId?: number): Promise<Commission[]> {
    try {
      const params = riderId ? { rider_id: riderId } : {};
      const response = await this.api.get('/api/commissions', { params });
      return response.data;
    } catch (error) {
      console.error('Get commissions failed:', error);
      throw error;
    }
  }

  async processCommissionPayment(commissionId: number): Promise<Commission> {
    try {
      const response = await this.api.post(`/api/commissions/${commissionId}/pay`);
      return response.data;
    } catch (error) {
      console.error('Process commission payment failed:', error);
      throw error;
    }
  }

  // Payout Management
  async getPayouts(riderId?: number): Promise<Payout[]> {
    try {
      const params = riderId ? { rider_id: riderId } : {};
      const response = await this.api.get('/api/payouts', { params });
      return response.data;
    } catch (error) {
      console.error('Get payouts failed:', error);
      throw error;
    }
  }

  async createPayout(payoutData: Partial<Payout>): Promise<Payout> {
    try {
      const response = await this.api.post('/api/payouts', payoutData);
      return response.data;
    } catch (error) {
      console.error('Create payout failed:', error);
      throw error;
    }
  }

  async processPayout(payoutId: number): Promise<Payout> {
    try {
      const response = await this.api.post(`/api/payouts/${payoutId}/process`);
      return response.data;
    } catch (error) {
      console.error('Process payout failed:', error);
      throw error;
    }
  }

  // Admin Dashboard
  async getAdminStats(): Promise<any> {
    try {
      const response = await this.api.get('/api/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Get admin stats failed:', error);
      throw error;
    }
  }

  // Payment Verification
  async verifyPayment(reference: string): Promise<{
    success: boolean;
    amount: number;
    status: string;
    reference: string;
  }> {
    try {
      const response = await this.api.post('/api/payments/verify', { reference });
      return response.data;
    } catch (error) {
      console.error('Verify payment failed:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;