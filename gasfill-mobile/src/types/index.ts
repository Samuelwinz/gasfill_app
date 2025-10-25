// GasFill App Types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  total: number;
  delivery_type?: string;
  status: OrderStatus;
  payment_status?: PaymentStatus;
  created_at: string;
  updated_at: string;
  rider_id?: number;
  tracking_info?: TrackingInfo;
}

export type OrderStatus = 
  | 'pending' 
  | 'assigned' 
  | 'pickup' 
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface TrackingInfo {
  rider_id: number;
  rider_name: string;
  rider_phone?: string;
  assigned_at?: string;
  status_history: StatusHistoryEntry[];
  current_location?: string;
  notes: string[];
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  location?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  role?: 'user' | 'admin' | 'rider';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OrderCreateRequest {
  items: OrderItem[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  total: number;
  delivery_type?: string;
}

// Pickup/Refill Service Types
export interface PickupRequest {
  id: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  delivery_address?: string;
  cylinder_type: string;
  cylinder_count: number;
  scheduled_pickup_time?: string;
  status: PickupStatus;
  rider_id?: number;
  refill_outlet_id?: number;
  total_cost: number;
  commission_amount: number;
  payment_status: PaymentStatus;
  payment_method?: string;
  pickup_photo?: string;
  refill_confirmation_photo?: string;
  qr_code?: string;
  created_at: string;
  updated_at: string;
  pickup_confirmed_at?: string;
  refill_confirmed_at?: string;
  delivered_at?: string;
  notes?: string;
}

export type PickupStatus = 
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'at_refill_center'
  | 'refilled'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Rider {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  status: RiderStatus;
  rating: number;
  total_pickups: number;
  total_earnings: number;
  wallet_balance: number;
  commission_rate: number;
  created_at: string;
  is_available: boolean;
  current_location?: Location;
}

export type RiderStatus = 'active' | 'inactive' | 'suspended' | 'pending_approval';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RefillOutlet {
  id: number;
  name: string;
  address: string;
  phone: string;
  location: Location;
  operating_hours: string;
  commission_rate: number;
  cylinder_types: string[];
  is_active: boolean;
}

export interface Commission {
  id: number;
  rider_id: number;
  pickup_request_id: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  paid_at?: string;
}

export interface Payout {
  id: number;
  rider_id: number;
  amount: number;
  method: PayoutMethod;
  account_details: string;
  status: PayoutStatus;
  transaction_id?: string;
  created_at: string;
  processed_at?: string;
}

export type PayoutMethod = 'bank_transfer' | 'mobile_money' | 'wallet';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PaystackPayment {
  reference: string;
  amount: number;
  email: string;
  currency: string;
  channels: string[];
  callback_url?: string;
  metadata?: any;
}

export interface PaystackResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface WalletTransaction {
  id: number;
  rider_id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference?: string;
  balance_after: number;
  created_at: string;
}

export interface AdminStats {
  total_pickups: number;
  active_riders: number;
  total_revenue: number;
  pending_payouts: number;
  pickups_today: number;
  average_rating: number;
}