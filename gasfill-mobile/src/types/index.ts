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
  customer_location?: {
    lat: number;
    lng: number;
  };
  pickup_location?: {
    lat: number;
    lng: number;
  };
  pickup_address?: string;
  total: number;
  delivery_fee?: number;
  delivery_type?: string;
  status: OrderStatus;
  payment_status?: PaymentStatus;
  created_at: string;
  updated_at: string;
  rider_id?: number;
  rider_name?: string;
  rider_phone?: string;
  rider_rating?: number;
  rider_location?: {
    lat: number;
    lng: number;
  };
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
  subscription_tier?: 'basic' | 'pro' | 'family' | null;
  subscription_status?: 'active' | 'paused' | 'cancelled' | 'expired' | null;
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
  delivery_location?: {
    lat: number;
    lng: number;
  };
  customer_location?: {
    lat: number;
    lng: number;
  };
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

export interface Notification {
  id: string;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  icon?: string;
}

export type NotificationType = 
  | 'order_placed'
  | 'order_assigned'
  | 'order_picked_up'
  | 'order_in_transit'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'rider_assigned'
  | 'rider_arrived'
  | 'promotion'
  | 'system'
  | 'earnings'
  | 'new_job';

export interface NotificationPreferences {
  order_updates: boolean;
  payment_updates: boolean;
  promotional: boolean;
  rider_updates: boolean;
  earnings_updates: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export interface RefillPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'quarterly' | 'yearly';
  refills_per_month: number;
  cylinder_size: string;
  features: string[];
  savings_percentage?: number;
  is_popular?: boolean;
  is_active: boolean;
}

export interface RefillSubscription {
  id: string;
  user_id: number;
  plan_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  start_date: string;
  next_refill_date: string;
  refills_remaining: number;
  total_refills: number;
  delivery_address: string;
  preferred_delivery_time?: string;
  auto_renew: boolean;
  payment_method: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
}

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'pending';

export interface RefillBooking {
  subscription_id?: string;
  plan_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string;
  cylinder_size: string;
  cylinder_count: number;
  preferred_date: string;
  preferred_time_slot: string;
  special_instructions?: string;
  payment_method: string;
  total_amount: number;
}
// Chat Types
export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: number;
  sender_type: 'customer' | 'rider';
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'location';
  image_url?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  location_data?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  read_at?: string;
}

export interface ChatRoom {
  id: string;
  order_id: number;
  customer_id: number;
  customer_name: string;
  customer_avatar?: string;
  rider_id?: number;
  rider_name?: string;
  rider_avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  status: 'active' | 'closed';
  created_at: string;
  updated_at?: string;
  participants?: ChatParticipant[];
}

export interface ChatParticipant {
  id: number;
  name: string;
  avatar?: string;
  user_type: 'customer' | 'rider' | 'support';
  type: 'customer' | 'rider' | 'support'; // Alias for user_type
  is_online: boolean;
  is_typing?: boolean;
  last_seen?: string;
}

export interface TypingIndicator {
  chat_room_id: string;
  user_id: number;
  user_type: 'customer' | 'rider';
  is_typing: boolean;
}

export interface ChatWebSocketMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'delivery_receipt' | 'user_status';
  data: ChatMessage | TypingIndicator | { message_ids: string[] } | { is_online: boolean };
  timestamp: string;
}
