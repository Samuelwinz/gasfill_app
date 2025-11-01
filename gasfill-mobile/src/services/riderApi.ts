import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend configuration
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.8.100:8000'  // Your local machine IP address
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
  pickup_location?: {
    lat: number;
    lng: number;
  };
  pickup_address?: string;
  distance?: number; // in km
}

export interface ActiveOrder extends AvailableOrder {
  rider_id: number;
  accepted_at: string;
  pickup_time?: string;
  delivery_time?: string;
  assignment_expires_at?: string;
  distance_km?: number;
  estimated_time_minutes?: number;
  customer_location?: {
    lat: number;
    lng: number;
  };
  delivery_location?: {
    lat: number;
    lng: number;
  };
}

export interface DashboardData {
  status: string;
  total_earnings: number;
  today_earnings: number;
  total_deliveries: number;
  active_orders: number;
  completed_today: number;
  rating: number;
  is_verified?: boolean;
  document_status?: 'pending' | 'approved' | 'rejected';
  verification_notes?: string;
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
  earnings_by_type?: {
    [key: string]: {
      total: number;
      count: number;
    };
  };
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

export const rejectOrder = async (
  orderId: number | string
): Promise<{ success: boolean; message: string }> => {
  const response = await riderApiClient.post(`/api/rider/orders/${orderId}/reject`);
  return response.data;
};

export const confirmOrderAssignment = async (
  orderId: number | string
): Promise<{ success: boolean; message: string; order: ActiveOrder }> => {
  const response = await riderApiClient.post(`/api/rider/orders/${orderId}/confirm-assignment`);
  return response.data;
};

export const getPendingAssignments = async (): Promise<ActiveOrder[]> => {
  const response = await riderApiClient.get<ActiveOrder[]>('/api/rider/orders/pending');
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

// Get single order details for rider
export const getRiderOrderDetails = async (
  orderId: number | string
): Promise<ActiveOrder> => {
  // Backend doesn't have a single order endpoint, so fetch all and filter
  const response = await riderApiClient.get<ActiveOrder[]>('/api/rider/orders');
  
  // Handle both numeric IDs and string IDs like "ORD-5"
  const order = response.data.find(o => {
    // Try matching by ID directly
    if (o.id === orderId) return true;
    // Try matching string ID with number
    if (String(o.id) === String(orderId)) return true;
    // Try matching number with string ID (remove "ORD-" prefix)
    const numericPart = String(orderId).replace(/[^\d]/g, '');
    if (numericPart && String(o.id) === numericPart) return true;
    return false;
  });
  
  if (!order) {
    console.error('[getRiderOrderDetails] Order not found. Looking for:', orderId);
    console.error('[getRiderOrderDetails] Available orders:', response.data.map(o => ({ id: o.id, status: o.status })));
    throw new Error(`Order ${orderId} not found in active orders`);
  }
  
  return order;
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

export const getPaymentRequests = async (statusFilter?: string): Promise<{
  requests: Array<{
    id: number;
    rider_id: number;
    amount: number;
    status: string;
    requested_at: string;
    payment_method: string;
    recipient_details?: any;
  }>;
  total: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}> => {
  const params = statusFilter ? { status_filter: statusFilter } : {};
  const response = await riderApiClient.get('/api/rider/payment-requests', { params });
  return response.data;
};

export const getPayoutHistory = async (): Promise<{
  history: Array<{
    id: number;
    amount: number;
    payment_method: string;
    payment_reference: string;
    requested_date: string;
    processed_date: string;
    status: string;
    source: string;
  }>;
  total_paid: number;
  count: number;
}> => {
  const response = await riderApiClient.get('/api/rider/payout-history');
  return response.data;
};

export const updatePaymentRequest = async (
  requestId: number, 
  amount: number,
  paymentMethod: string = 'mobile_money'
): Promise<{
  message: string;
  request: any;
}> => {
  const response = await riderApiClient.put(`/api/rider/payment-request/${requestId}`, {
    amount,
    payment_method: paymentMethod,
  });
  return response.data;
};

export const cancelPaymentRequest = async (requestId: number): Promise<{
  message: string;
  request_id: number;
}> => {
  const response = await riderApiClient.delete(`/api/rider/payment-request/${requestId}`);
  return response.data;
};

// Profile & Settings APIs
export const updateRiderProfile = async (profileData: {
  phone?: string;
  emergency_contact?: string;
  vehicle_number?: string;
  area?: string;
}): Promise<{
  message: string;
  rider: any;
}> => {
  const response = await riderApiClient.put('/api/rider/profile', profileData);
  return response.data;
};

export const changeRiderPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{
  message: string;
}> => {
  const response = await riderApiClient.post('/api/rider/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};

// Help & Support APIs
export const getFAQ = async (): Promise<{
  faqs: Array<{
    id: string;
    category: string;
    question: string;
    answer: string;
  }>;
}> => {
  const response = await riderApiClient.get('/api/help/faq');
  return response.data;
};

export const createSupportTicket = async (ticketData: {
  subject?: string;
  message: string;
  priority?: string;
}): Promise<{
  message: string;
  ticket_id: number;
  estimated_response: string;
}> => {
  const response = await riderApiClient.post('/api/support/ticket', ticketData);
  return response.data;
};

// Document Upload API
export const uploadRiderDocuments = async (licensePhoto?: any, vehiclePhoto?: any): Promise<{
  message: string;
  uploaded_files: {
    license_photo?: string;
    vehicle_photo?: string;
  };
  document_status: string;
}> => {
  const formData = new FormData();
  
  if (licensePhoto) {
    const licenseUri = licensePhoto.uri;
    const licenseFilename = licenseUri.split('/').pop() || 'license.jpg';
    const licenseMatch = /\.(\w+)$/.exec(licenseFilename);
    const licenseType = licenseMatch ? `image/${licenseMatch[1]}` : 'image/jpeg';
    
    formData.append('license_photo', {
      uri: licenseUri,
      name: licenseFilename,
      type: licenseType,
    } as any);
  }
  
  if (vehiclePhoto) {
    const vehicleUri = vehiclePhoto.uri;
    const vehicleFilename = vehicleUri.split('/').pop() || 'vehicle.jpg';
    const vehicleMatch = /\.(\w+)$/.exec(vehicleFilename);
    const vehicleType = vehicleMatch ? `image/${vehicleMatch[1]}` : 'image/jpeg';
    
    formData.append('vehicle_photo', {
      uri: vehicleUri,
      name: vehicleFilename,
      type: vehicleType,
    } as any);
  }
  
  const response = await riderApiClient.post('/api/rider/upload-documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
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
  rejectOrder,
  confirmOrderAssignment,
  getPendingAssignments,
  updateOrderStatus,
  getRiderOrderDetails,
  getRiderEarnings,
  getRiderEarningsDetailed,
  requestPayment,
  getPaymentRequests,
  getPayoutHistory,
  updatePaymentRequest,
  cancelPaymentRequest,
};
