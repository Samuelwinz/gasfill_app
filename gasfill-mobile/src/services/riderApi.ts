import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend configuration
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.25:8000'  // Your local machine IP address
  : 'https://your-production-api.com';

// Storage key - must match what AuthContext uses
const TOKEN_KEY = 'gasfill_token_v1';

// Create axios instance for rider APIs
const riderApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
riderApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('🔑 Rider API Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'Present' : 'Missing');
    } catch (error) {
      console.error('Error getting token for request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Rider Registration Types
export interface RiderRegisterData {
  username: string;
  email: string;
  password: string;
  phone: string;
  license_number: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  vehicle_number: string;
  emergency_contact: string;
  area_coverage: string;
}

export interface RiderLoginData {
  email: string;
  password: string;
}

export interface RiderProfile {
  id: number;
  username: string;
  email: string;
  phone: string;
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
  emergency_contact: string;
  area_coverage: string;
  status: 'available' | 'busy' | 'offline';
  location: {
    lat: number;
    lng: number;
  } | null;
  rating: number;
  total_deliveries: number;
  successful_deliveries: number;
  earnings: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiderAuthResponse {
  token: string;
  rider: RiderProfile;
  message?: string;
}

export interface AvailableOrder {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total_amount: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  pickup_location?: string;
  distance?: number; // in km
}

export interface ActiveOrder extends AvailableOrder {
  rider_id: number;
  accepted_at: string;
  pickup_time?: string;
  delivery_time?: string;
}

export interface DashboardData {
  status: string;
  total_earnings: number;
  today_earnings: number;
  total_deliveries: number;
  active_orders: number;
  completed_today: number;
  rating: number;
}

export interface EarningsData {
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  earnings_breakdown: Array<{
    id?: number;
    order_id: number;
    amount: number;
    date: string;
    status: string;
    earning_type?: string;
    description?: string;
    gross_amount?: number;
    commission_rate?: number;
  }>;
}

export interface OrderStatusUpdate {
  status: 'pickup' | 'in_transit' | 'delivered';
  location?: string;
  notes?: string;
  delivery_photo?: string;
}

// Rider Authentication APIs
export const riderRegister = async (
  data: RiderRegisterData
): Promise<RiderAuthResponse> => {
  const response = await riderApiClient.post<RiderAuthResponse>(
    '/api/auth/rider-register',
    data
  );
  return response.data;
};

export const riderLogin = async (
  data: RiderLoginData
): Promise<RiderAuthResponse> => {
  const response = await riderApiClient.post<RiderAuthResponse>(
    '/api/auth/rider-login',
    data
  );
  return response.data;
};

// Rider Profile APIs
export const getRiderProfile = async (): Promise<RiderProfile> => {
  const response = await riderApiClient.get<RiderProfile>('/api/rider/profile');
  return response.data;
};

export const updateRiderStatus = async (
  status: 'available' | 'busy' | 'offline',
  location?: { lat: number; lng: number }
): Promise<{ message: string; status: string }> => {
  const response = await riderApiClient.put('/api/rider/status', {
    status,
    location,
  });
  return response.data;
};

// Rider Dashboard API
export const getRiderDashboard = async (): Promise<DashboardData> => {
  const response = await riderApiClient.get<DashboardData>('/api/rider/dashboard');
  return response.data;
};

// Order Management APIs
export const getAvailableOrders = async (): Promise<AvailableOrder[]> => {
  const response = await riderApiClient.get<AvailableOrder[]>(
    '/api/rider/orders/available'
  );
  return response.data;
};

export const getActiveOrders = async (): Promise<ActiveOrder[]> => {
  const response = await riderApiClient.get<ActiveOrder[]>('/api/rider/orders');
  return response.data;
};

export const acceptOrder = async (
  orderId: number
): Promise<{ message: string; order: ActiveOrder }> => {
  const response = await riderApiClient.post(`/api/rider/orders/${orderId}/accept`);
  return response.data;
};

export const updateOrderStatus = async (
  orderId: number,
  data: OrderStatusUpdate
): Promise<{ message: string; order: ActiveOrder }> => {
  const response = await riderApiClient.put(
    `/api/rider/orders/${orderId}/status`,
    data
  );
  return response.data;
};

// Earnings APIs
export const getRiderEarnings = async (): Promise<EarningsData> => {
  const response = await riderApiClient.get<EarningsData>('/api/rider/earnings');
  return response.data;
};

export const getRiderEarningsDetailed = async (): Promise<any> => {
  const response = await riderApiClient.get('/api/rider/earnings/detailed');
  return response.data;
};

export const requestPayment = async (amount: number): Promise<{
  message: string;
  request_id: number;
}> => {
  const response = await riderApiClient.post('/api/rider/payment-request', {
    amount,
  });
  return response.data;
};

export default {
  riderRegister,
  riderLogin,
  getRiderProfile,
  updateRiderStatus,
  getRiderDashboard,
  getAvailableOrders,
  getActiveOrders,
  acceptOrder,
  updateOrderStatus,
  getRiderEarnings,
  getRiderEarningsDetailed,
  requestPayment,
};
