/**
 * Analytics Service
 * Handles calculation and formatting of rider performance metrics
 */

import { 
  RiderAnalytics, 
  EarningsSummary, 
  DeliveryStats, 
  PerformanceMetrics,
  EarningsBreakdown,
  Goal 
} from '../types/analytics';
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  endOfDay, 
  endOfWeek, 
  endOfMonth,
  format,
  parseISO,
  isWithinInterval,
  differenceInMinutes
} from 'date-fns';

class AnalyticsService {
  /**
   * Format currency value
   */
  formatCurrency(amount: number): string {
    return `₵${amount.toFixed(2)}`;
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return `${Math.round(value)}%`;
  }

  /**
   * Calculate completion rate
   */
  calculateCompletionRate(completed: number, total: number): number {
    if (total === 0) return 0;
    return (completed / total) * 100;
  }

  /**
   * Get date range for period
   */
  getDateRange(period: 'day' | 'week' | 'month'): { start: Date; end: Date } {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      default:
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
    }
  }

  /**
   * Filter data by date range
   */
  filterByDateRange<T extends { created_at: string }>(
    data: T[],
    period: 'day' | 'week' | 'month'
  ): T[] {
    const { start, end } = this.getDateRange(period);
    
    return data.filter(item => {
      const itemDate = parseISO(item.created_at);
      return isWithinInterval(itemDate, { start, end });
    });
  }

  /**
   * Calculate earnings summary
   */
  calculateEarningsSummary(orders: any[], earningsPerDelivery: number): EarningsSummary {
    const completedOrders = orders.filter(o => o.status === 'delivered');
    
    const today = this.filterByDateRange(completedOrders, 'day');
    const week = this.filterByDateRange(completedOrders, 'week');
    const month = this.filterByDateRange(completedOrders, 'month');
    
    return {
      today: today.length * earningsPerDelivery,
      week: week.length * earningsPerDelivery,
      month: month.length * earningsPerDelivery,
      total: completedOrders.length * earningsPerDelivery
    };
  }

  /**
   * Generate earnings trend data
   */
  generateEarningsTrend(
    orders: any[], 
    earningsPerDelivery: number, 
    period: 'day' | 'week' | 'month'
  ): EarningsBreakdown[] {
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const filteredOrders = this.filterByDateRange(completedOrders, period);
    
    // Group by date
    const groupedByDate = filteredOrders.reduce((acc, order) => {
      const dateKey = format(parseISO(order.created_at), 'yyyy-MM-dd');
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          amount: 0,
          deliveries: 0
        };
      }
      
      acc[dateKey].deliveries += 1;
      acc[dateKey].amount += earningsPerDelivery;
      
      return acc;
    }, {} as Record<string, EarningsBreakdown>);
    
    // Convert to array and sort
    return (Object.values(groupedByDate) as EarningsBreakdown[]).sort((a, b) => 
      a.date.localeCompare(b.date)
    );
  }

  /**
   * Calculate goal progress
   */
  calculateGoalProgress(goal: Goal): number {
    if (goal.target === 0) return 0;
    return Math.min((goal.current / goal.target) * 100, 100);
  }

  /**
   * Check if goal is achieved
   */
  isGoalAchieved(goal: Goal): boolean {
    return goal.current >= goal.target;
  }

  /**
   * Get achievement badge for goal
   */
  getAchievementBadge(progress: number): string {
    if (progress >= 100) return '🏆';
    if (progress >= 75) return '🥇';
    if (progress >= 50) return '🥈';
    if (progress >= 25) return '🥉';
    return '📊';
  }

  /**
   * Calculate peak hours from orders
   */
  calculatePeakHours(orders: any[], earningsPerDelivery: number) {
    const completedOrders = orders.filter(o => o.status === 'delivered');
    
    // Group by hour
    const hourlyStats = completedOrders.reduce((acc, order) => {
      const hour = parseISO(order.created_at).getHours();
      
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          deliveries: 0,
          earnings: 0
        };
      }
      
      acc[hour].deliveries += 1;
      acc[hour].earnings += earningsPerDelivery;
      
      return acc;
    }, {} as Record<number, any>);
    
    return Object.values(hourlyStats).sort((a: any, b: any) => 
      b.deliveries - a.deliveries
    );
  }

  /**
   * Format hour for display
   */
  formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  }
}

export default new AnalyticsService();
