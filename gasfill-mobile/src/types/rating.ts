/**
 * Rating and Review Types
 * Handles customer->rider and rider->customer ratings
 */

export type RatingType = 'customer_to_rider' | 'rider_to_customer';

export type DisputeStatus = 'none' | 'pending' | 'reviewed' | 'resolved' | 'rejected';

export interface Rating {
  id: string;
  order_id: string;
  rating_type: RatingType;
  
  // Who gave the rating
  reviewer_id: number;
  reviewer_name: string;
  reviewer_type: 'customer' | 'rider';
  
  // Who received the rating
  reviewee_id: number;
  reviewee_name: string;
  reviewee_type: 'customer' | 'rider';
  
  // Rating details
  rating: number; // 1-5 stars
  comment?: string;
  tags?: string[]; // e.g., ['friendly', 'fast', 'professional']
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  
  // Dispute handling
  disputed: boolean;
  dispute_status: DisputeStatus;
  dispute_reason?: string;
  dispute_date?: string;
  admin_response?: string;
  admin_resolved_date?: string;
}

export interface RatingStats {
  user_id: number;
  user_type: 'customer' | 'rider';
  
  // Overall stats
  average_rating: number;
  total_ratings: number;
  
  // Star distribution
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  
  // Recent ratings
  recent_ratings: Rating[];
  
  // Tag analysis
  top_tags: Array<{ tag: string; count: number }>;
}

export interface RatingFormData {
  order_id: string;
  rating: number;
  comment: string;
  tags: string[];
}

export interface DisputeFormData {
  rating_id: string;
  reason: string;
}

// Predefined rating tags
export const RIDER_RATING_TAGS = [
  'Professional',
  'Friendly',
  'Fast Delivery',
  'Careful Handling',
  'Good Communication',
  'On Time',
  'Clean Vehicle',
  'Polite',
] as const;

export const CUSTOMER_RATING_TAGS = [
  'Clear Instructions',
  'Responsive',
  'Polite',
  'Available',
  'Patient',
  'Generous Tip',
  'Easy Location',
  'Friendly',
] as const;

export type RiderRatingTag = typeof RIDER_RATING_TAGS[number];
export type CustomerRatingTag = typeof CUSTOMER_RATING_TAGS[number];
