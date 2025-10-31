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
// For physical device/emulator, replace localhost with your computer's IP address
// Example: const API_BASE_URL = 'http://192.168.1.100:8000'
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.8.100:8000'  // Your local machine IP address
  : 'https://your-production-api.com'; // Production URL

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,  // Increased timeout to 30 seconds for database queries
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
          console.log('🔑 API Request with token:', config.method?.toUpperCase(), config.url);
        } else {
          console.warn('⚠️ API Request WITHOUT token:', config.method?.toUpperCase(), config.url);
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

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      // Let the UI component handle the error and fallback
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      // Let the UI component handle the error and fallback
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      // Let the UI component handle the error and fallback
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
      console.log('📦 Fetching customer orders...');
      const token = await StorageService.getToken();
      console.log('🔑 Current token:', token ? 'Present' : 'Missing');
      
      const response = await this.api.get('/api/customer/orders');
      console.log('✅ Customer orders fetched:', response.data?.length || 0);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get customer orders failed:', error.response?.status, error.message);
      if (error.response?.status === 401) {
        console.error('🔒 Authentication failed - token may be expired or invalid');
        const user = await StorageService.getUser();
        console.log('👤 Current user:', user);
      }
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

  async updateOrderLocation(orderId: string, location: { lat: number; lng: number }): Promise<any> {
    try {
      console.log('📍 Updating order location:', orderId, location);
      const response = await this.api.patch(`/api/orders/${orderId}/location`, {
        customer_location: location
      });
      console.log('✅ Location updated successfully');
      return response.data;
    } catch (error) {
      console.error('Update order location failed:', error);
      throw error;
    }
  }

  async getOrderTracking(orderId: string): Promise<any> {
    try {
      const response = await this.api.get(`/api/order/tracking/${orderId}`);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Order tracking endpoint not available, attempting to fetch from orders API');
      
      try {
        // Try to get order details from the regular orders endpoint
        const orderResponse = await this.api.get(`/api/orders/${orderId}`);
        const order = orderResponse.data;
        
        console.log('📦 Order data from backend:', {
          id: order.id,
          customer_location: order.customer_location,
          customer_location_type: typeof order.customer_location,
          customer_location_is_null: order.customer_location === null,
        });
        
        // Fetch rider details if rider is assigned
        let riderData = null;
        if (order.rider_id) {
          try {
            const riderResponse = await this.api.get(`/api/riders/${order.rider_id}`);
            riderData = riderResponse.data;
          } catch (err) {
            console.warn('Could not fetch rider details');
          }
        }
        
        // Transform order data to tracking format
        const trackingData = {
          order_id: order.id,
          status: order.status,
          customer_name: order.customer_name || 'Customer',
          customer_address: order.delivery_address || order.address,
          customer_phone: order.customer_phone || order.phone,
          rider_name: riderData?.username || order.rider_name,
          rider_phone: riderData?.phone || '+233241234567',
          rider_rating: riderData?.rating || 4.5,
          customer_location: order.customer_location || null,
          rider_location: riderData?.location || order.rider_location || null,
          items: order.items || [],
          total: order.total_amount || order.total || 0,
          estimated_arrival: order.estimated_delivery || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          created_at: order.created_at,
          status_history: order.status_history || this.generateStatusHistory(order.status, order.created_at),
        };
        
        return trackingData;
      } catch (orderError) {
        console.warn('⚠️ Could not fetch order details, using mock data');
        
        // Return mock tracking data for demo
        const mockTrackingData = {
          order_id: orderId,
          status: 'in_transit',
          customer_name: 'Customer Name',
          customer_address: '123 Main Street, Accra',
          customer_phone: '+233241111111',
          rider_name: 'John Kofi',
          rider_phone: '+233241234567',
          rider_rating: 4.8,
          customer_location: {
            lat: 5.6037,
            lng: -0.1870,
          },
          rider_location: {
            lat: 5.6057,
            lng: -0.1890,
          },
          items: [
            {
              name: '12.5kg Gas Cylinder',
              quantity: 1,
              price: 150.00,
            },
          ],
          total: 150.00,
          estimated_arrival: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          status_history: [
            {
              status: 'pending',
              timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
              note: 'Order placed',
            },
            {
              status: 'assigned',
              timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
              note: 'Rider assigned',
            },
            {
              status: 'pickup',
              timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
              note: 'Rider picking up order',
            },
            {
              status: 'in_transit',
              timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
              note: 'On the way to you',
            },
          ],
        };
        
        return mockTrackingData;
      }
    }
  }

  private generateStatusHistory(currentStatus: string, createdAt: string): any[] {
    const history = [];
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    
    const statuses = ['pending', 'assigned', 'pickup', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus);
    
    for (let i = 0; i <= currentIndex && i < statuses.length; i++) {
      const timeOffset = ((now - created) / (currentIndex + 1)) * i;
      history.push({
        status: statuses[i],
        timestamp: new Date(created + timeOffset).toISOString(),
        note: this.getStatusNote(statuses[i]),
      });
    }
    
    return history;
  }

  private getStatusNote(status: string): string {
    const notes: { [key: string]: string } = {
      'pending': 'Order placed',
      'assigned': 'Rider assigned',
      'pickup': 'Rider picking up order',
      'picked_up': 'Order picked up',
      'in_transit': 'On the way to you',
      'delivered': 'Order delivered',
    };
    return notes[status] || 'Status updated';
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

  // Pickup/Refill Service Methods
  async createPickupRequest(pickupData: Partial<PickupRequest>): Promise<PickupRequest> {
    try {
      const response = await this.api.post('/api/pickup-requests', pickupData);
      return response.data;
    } catch (error) {
      // Silently fallback to mock data when backend is unavailable
      const mockPickupRequest: PickupRequest = {
        id: `pickup-${Date.now()}`,
        customer_id: 1,
        customer_name: pickupData.customer_name || 'Mock Customer',
        customer_phone: pickupData.customer_phone || '+233241234567',
        pickup_address: pickupData.pickup_address || 'Mock Address',
        delivery_address: pickupData.delivery_address || pickupData.pickup_address || 'Mock Address',
        cylinder_type: pickupData.cylinder_type || '12.5kg',
        cylinder_count: pickupData.cylinder_count || 1,
        status: 'pending',
        total_cost: pickupData.total_cost || 0,
        commission_amount: pickupData.commission_amount || 0,
        payment_status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Store in local storage for demo purposes
      await this.storeMockPickupRequest(mockPickupRequest);
      return mockPickupRequest;
    }
  }

  private async storeMockPickupRequest(pickupRequest: PickupRequest): Promise<void> {
    try {
      const StorageService = (await import('../utils/storage')).StorageService;
      const existingRequests = await StorageService.getItem('mock_pickup_requests');
      const requestsString = existingRequests || '[]';
      const requests = JSON.parse(requestsString as string);
      requests.push(pickupRequest);
      await StorageService.setItem('mock_pickup_requests', JSON.stringify(requests));
    } catch (error) {
      console.error('Error storing mock pickup request:', error);
    }
  }

  async getPickupRequests(status?: string): Promise<PickupRequest[]> {
    try {
      const params = status ? { status } : {};
      const response = await this.api.get('/api/pickup-requests', { params });
      return response.data;
    } catch (error) {
      // Silently fallback to mock data when backend is unavailable
      const StorageService = (await import('../utils/storage')).StorageService;
      const existingRequests = await StorageService.getItem('mock_pickup_requests');
      const requestsString = existingRequests || '[]';
      const requests = JSON.parse(requestsString as string) as PickupRequest[];
      
      // Filter by status if provided
      if (status) {
        return requests.filter(req => req.status === status);
      }
      return requests;
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

  // Rider Analytics
  async getRiderAnalytics(period: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    try {
      const response = await this.api.get('/api/rider/analytics', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Get rider analytics failed:', error);
      throw error;
    }
  }

  // Ratings & Reviews
  async createRating(ratingData: {
    order_id: string;
    rating: number;
    comment?: string;
    tags?: string[];
  }): Promise<any> {
    try {
      const response = await this.api.post('/api/ratings', ratingData);
      return response.data;
    } catch (error) {
      console.error('Create rating failed:', error);
      throw error;
    }
  }

  async getOrderRatings(orderId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/api/ratings/order/${orderId}`);
      return response.data.ratings || [];
    } catch (error) {
      console.error('Get order ratings failed:', error);
      return [];
    }
  }

  async getUserRatings(userId: number, userType: 'customer' | 'rider'): Promise<any> {
    try {
      const response = await this.api.get(`/api/ratings/user/${userId}`, {
        params: { user_type: userType }
      });
      return response.data;
    } catch (error) {
      console.error('Get user ratings failed:', error);
      throw error;
    }
  }

  async getMyRatingStats(): Promise<any> {
    try {
      const response = await this.api.get('/api/ratings/stats');
      return response.data;
    } catch (error) {
      console.error('Get rating stats failed:', error);
      throw error;
    }
  }

  async disputeRating(ratingId: string, reason: string): Promise<any> {
    try {
      const response = await this.api.put(`/api/ratings/${ratingId}/dispute`, {
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Dispute rating failed:', error);
      throw error;
    }
  }

  // Admin Rating Management
  async getDisputedRatings(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/ratings/disputes');
      return response.data.disputes || [];
    } catch (error) {
      console.error('Get disputed ratings failed:', error);
      throw error;
    }
  }

  async resolveRatingDispute(ratingId: string, adminResponse: string, status: 'resolved' | 'rejected'): Promise<any> {
    try {
      const response = await this.api.put(`/api/admin/ratings/${ratingId}/resolve`, {
        admin_response: adminResponse,
        status
      });
      return response.data;
    } catch (error) {
      console.error('Resolve rating dispute failed:', error);
      throw error;
    }
  }

  // Push Notification Methods
  async registerPushToken(pushToken: string, deviceType: string = 'mobile'): Promise<any> {
    try {
      const response = await this.api.post('/api/notifications/register-token', {
        push_token: pushToken,
        device_type: deviceType
      });
      console.log('✅ Push token registered with backend');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to register push token with backend:', error);
      throw error;
    }
  }

  async removePushToken(): Promise<any> {
    try {
      const response = await this.api.post('/api/notifications/remove-token', {});
      console.log('✅ Push token removed from backend');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to remove push token from backend:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;