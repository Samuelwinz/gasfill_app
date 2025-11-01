/**
 * Analytics and Performance Tracking Types
 */

export interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
}

export interface DeliveryStats {
  total_deliveries: number;
  completed_today: number;
  completed_week: number;
  completed_month: number;
  pending: number;
  in_progress: number;
  cancelled: number;
  completion_rate: number;
}

export interface PerformanceMetrics {
  average_rating: number;
  total_ratings: number;
  on_time_percentage: number;
  average_delivery_time: number; // in minutes
  customer_satisfaction: number;
}

export interface EarningsBreakdown {
  date: string;
  amount: number;
  deliveries: number;
}

export interface RatingDistribution {
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface PeakHours {
  hour: number;
  deliveries: number;
  earnings: number;
}

export interface Goal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  category: 'earnings' | 'deliveries' | 'rating';
  target: number;
  current: number;
  start_date: string;
  end_date: string;
  achieved: boolean;
}

export interface RiderAnalytics {
  earnings_summary: EarningsSummary;
  delivery_stats: DeliveryStats;
  performance_metrics: PerformanceMetrics;
  earnings_trend: EarningsBreakdown[];
  rating_distribution: RatingDistribution;
  peak_hours: PeakHours[];
  period: 'day' | 'week' | 'month';
}
