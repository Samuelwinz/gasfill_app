import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import { apiService } from '../services/api';
import analyticsService from '../services/analytics';
import { RiderAnalytics, Goal } from '../types/analytics';
import { useGoals } from '../hooks/useGoals';

const { width } = Dimensions.get('window');

interface RiderAnalyticsScreenProps {
  navigation: any;
}

const RiderAnalyticsScreen: React.FC<RiderAnalyticsScreenProps> = ({ navigation }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [analytics, setAnalytics] = useState<RiderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'performance' | 'goals'>('overview');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: 'daily' as 'daily' | 'weekly' | 'monthly',
    category: 'earnings' as 'earnings' | 'deliveries' | 'rating',
    target: '',
  });

  const { goals, addGoal, deleteGoal, updateGoalProgress } = useGoals();

  const loadAnalytics = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      
      const data = await apiService.getRiderAnalytics(period);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics(true);
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['day', 'week', 'month'] as const).map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.periodButton, period === p && styles.periodButtonActive]}
          onPress={() => setPeriod(p)}
        >
          <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
            {p === 'day' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      {([
        { key: 'overview', label: 'Overview', icon: 'stats-chart' },
        { key: 'earnings', label: 'Earnings', icon: 'cash' },
        { key: 'performance', label: 'Performance', icon: 'trophy' },
        { key: 'goals', label: 'Goals', icon: 'flag' },
      ] as const).map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons
            name={tab.icon as any}
            size={18}
            color={activeTab === tab.key ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatCard = (
    icon: string,
    label: string,
    value: string,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderOverviewTab = () => {
    if (!analytics) return null;

    return (
      <View>
        {/* Earnings Summary */}
        <Text style={styles.sectionTitle}>Earnings Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'cash',
            'Total Earnings',
            analyticsService.formatCurrency(analytics.earnings_summary.total),
            '#10b981'
          )}
          {renderStatCard(
            'calendar',
            period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'This Month',
            analyticsService.formatCurrency(
              period === 'day'
                ? analytics.earnings_summary.today
                : period === 'week'
                ? analytics.earnings_summary.week
                : analytics.earnings_summary.month
            ),
            '#3b82f6'
          )}
        </View>

        {/* Delivery Stats */}
        <Text style={styles.sectionTitle}>Delivery Statistics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'checkmark-circle',
            'Total Deliveries',
            analytics.delivery_stats.total_deliveries.toString(),
            '#8b5cf6',
            `${analyticsService.formatPercentage(analytics.delivery_stats.completion_rate)} completion`
          )}
          {renderStatCard(
            'bicycle',
            'In Progress',
            analytics.delivery_stats.in_progress.toString(),
            '#f59e0b'
          )}
        </View>

        {/* Earnings Trend Chart */}
        {analytics.earnings_trend.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Earnings Trend</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={{
                  labels: analytics.earnings_trend.slice(-7).map(d => 
                    format(new Date(d.date), 'dd MMM')
                  ),
                  datasets: [{
                    data: analytics.earnings_trend.slice(-7).map(d => d.amount)
                  }]
                }}
                width={width - 48}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#3b82f6'
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </>
        )}
      </View>
    );
  };

  const renderEarningsTab = () => {
    if (!analytics) return null;

    return (
      <View>
        {/* Earnings Breakdown */}
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Today</Text>
            <Text style={styles.earningsValue}>
              {analyticsService.formatCurrency(analytics.earnings_summary.today)}
            </Text>
          </View>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>This Week</Text>
            <Text style={styles.earningsValue}>
              {analyticsService.formatCurrency(analytics.earnings_summary.week)}
            </Text>
          </View>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>This Month</Text>
            <Text style={styles.earningsValue}>
              {analyticsService.formatCurrency(analytics.earnings_summary.month)}
            </Text>
          </View>
          <View style={[styles.earningsRow, styles.earningsTotalRow]}>
            <Text style={styles.earningsTotalLabel}>Total Earnings</Text>
            <Text style={styles.earningsTotalValue}>
              {analyticsService.formatCurrency(analytics.earnings_summary.total)}
            </Text>
          </View>
        </View>

        {/* Daily Earnings Bar Chart */}
        {analytics.earnings_trend.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Daily Earnings</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={{
                  labels: analytics.earnings_trend.slice(-7).map(d => 
                    format(new Date(d.date), 'EEE')
                  ),
                  datasets: [{
                    data: analytics.earnings_trend.slice(-7).map(d => d.amount)
                  }]
                }}
                width={width - 48}
                height={220}
                yAxisLabel="₵"
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: {
                    borderRadius: 16
                  }
                }}
                style={styles.chart}
              />
            </View>
          </>
        )}

        {/* Peak Hours */}
        {analytics.peak_hours.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Peak Earning Hours</Text>
            <View style={styles.peakHoursCard}>
              {analytics.peak_hours.slice(0, 5).map((hour, index) => (
                <View key={hour.hour} style={styles.peakHourRow}>
                  <View style={styles.peakHourRank}>
                    <Text style={styles.peakHourRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.peakHourInfo}>
                    <Text style={styles.peakHourTime}>
                      {analyticsService.formatHour(hour.hour)}
                    </Text>
                    <Text style={styles.peakHourStats}>
                      {hour.deliveries} deliveries • {analyticsService.formatCurrency(hour.earnings)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderPerformanceTab = () => {
    if (!analytics) return null;

    const { performance_metrics, rating_distribution } = analytics;

    // Prepare pie chart data for ratings
    const ratingData = [
      {
        name: '5★',
        population: rating_distribution.five_star,
        color: '#10b981',
        legendFontColor: '#6b7280',
        legendFontSize: 12,
      },
      {
        name: '4★',
        population: rating_distribution.four_star,
        color: '#3b82f6',
        legendFontColor: '#6b7280',
        legendFontSize: 12,
      },
      {
        name: '3★',
        population: rating_distribution.three_star,
        color: '#f59e0b',
        legendFontColor: '#6b7280',
        legendFontSize: 12,
      },
      {
        name: '2★',
        population: rating_distribution.two_star,
        color: '#ef4444',
        legendFontColor: '#6b7280',
        legendFontSize: 12,
      },
      {
        name: '1★',
        population: rating_distribution.one_star,
        color: '#dc2626',
        legendFontColor: '#6b7280',
        legendFontSize: 12,
      },
    ].filter(item => item.population > 0);

    return (
      <View>
        {/* Performance Metrics */}
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'star',
            'Average Rating',
            performance_metrics.average_rating.toFixed(1),
            '#f59e0b',
            `${performance_metrics.total_ratings} ratings`
          )}
          {renderStatCard(
            'time',
            'On-Time Delivery',
            analyticsService.formatPercentage(performance_metrics.on_time_percentage),
            '#10b981'
          )}
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard(
            'happy',
            'Customer Satisfaction',
            analyticsService.formatPercentage(performance_metrics.customer_satisfaction),
            '#8b5cf6'
          )}
          {renderStatCard(
            'speedometer',
            'Avg. Delivery Time',
            `${performance_metrics.average_delivery_time} min`,
            '#3b82f6'
          )}
        </View>

        {/* Rating Distribution */}
        {ratingData.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Rating Distribution</Text>
            <View style={styles.chartCard}>
              <PieChart
                data={ratingData}
                width={width - 48}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          </>
        )}

        {/* Performance Summary */}
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            You've maintained an average rating of{' '}
            <Text style={styles.summaryHighlight}>
              {performance_metrics.average_rating.toFixed(1)} stars
            </Text>{' '}
            with{' '}
            <Text style={styles.summaryHighlight}>
              {analyticsService.formatPercentage(performance_metrics.on_time_percentage)}
            </Text>{' '}
            on-time deliveries. Keep up the excellent work! 🎉
          </Text>
        </View>
      </View>
    );
  };

  const renderGoalsTab = () => {
    // Calculate current values from analytics
    const getCurrentValue = (goal: Goal) => {
      if (!analytics) return 0;
      
      switch (goal.category) {
        case 'earnings':
          if (goal.type === 'daily') return analytics.earnings_summary.today;
          if (goal.type === 'weekly') return analytics.earnings_summary.week;
          return analytics.earnings_summary.month;
        case 'deliveries':
          if (goal.type === 'daily') return analytics.delivery_stats.completed_today;
          if (goal.type === 'weekly') return analytics.delivery_stats.completed_week;
          return analytics.delivery_stats.completed_month;
        case 'rating':
          return analytics.performance_metrics.average_rating;
        default:
          return 0;
      }
    };

    const handleCreateGoal = async () => {
      if (!newGoal.target) {
        Alert.alert('Error', 'Please enter a target value');
        return;
      }

      const now = new Date();
      const startDate = now.toISOString();
      let endDate = new Date();
      
      if (newGoal.type === 'daily') {
        endDate.setHours(23, 59, 59);
      } else if (newGoal.type === 'weekly') {
        endDate.setDate(endDate.getDate() + 7);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      await addGoal({
        type: newGoal.type,
        category: newGoal.category,
        target: parseFloat(newGoal.target),
        current: 0,
        start_date: startDate,
        end_date: endDate.toISOString(),
        achieved: false,
      });

      setShowGoalModal(false);
      setNewGoal({ type: 'daily', category: 'earnings', target: '' });
    };

    return (
      <View>
        <View style={styles.goalsHeader}>
          <Text style={styles.sectionTitle}>My Goals</Text>
          <TouchableOpacity
            style={styles.addGoalButton}
            onPress={() => setShowGoalModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#3b82f6" />
            <Text style={styles.addGoalText}>New Goal</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyGoals}>
            <Ionicons name="flag-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyGoalsText}>No goals set yet</Text>
            <Text style={styles.emptyGoalsSubtext}>
              Tap "New Goal" to create your first goal
            </Text>
          </View>
        ) : (
          goals.map((goal) => {
            const currentValue = getCurrentValue(goal);
            const progress = analyticsService.calculateGoalProgress({
              ...goal,
              current: currentValue,
            });
            const badge = analyticsService.getAchievementBadge(progress);

            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalBadge}>
                    <Text style={styles.goalBadgeText}>{badge}</Text>
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle}>
                      {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}{' '}
                      {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                    </Text>
                    <Text style={styles.goalTarget}>
                      Target: {goal.category === 'earnings' ? '₵' : ''}
                      {goal.target}
                      {goal.category === 'rating' ? ' stars' : goal.category === 'deliveries' ? ' orders' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                </View>

                <View style={styles.goalStats}>
                  <View style={styles.goalStat}>
                    <Text style={styles.goalStatLabel}>Current</Text>
                    <Text style={styles.goalStatValue}>
                      {goal.category === 'earnings' ? '₵' : ''}
                      {currentValue.toFixed(goal.category === 'rating' ? 1 : 0)}
                    </Text>
                  </View>
                  <View style={styles.goalStat}>
                    <Text style={styles.goalStatLabel}>Remaining</Text>
                    <Text style={styles.goalStatValue}>
                      {goal.category === 'earnings' ? '₵' : ''}
                      {Math.max(0, goal.target - currentValue).toFixed(goal.category === 'rating' ? 1 : 0)}
                    </Text>
                  </View>
                </View>

                {progress >= 100 && (
                  <View style={styles.achievedBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.achievedText}>Goal Achieved! 🎉</Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Create Goal Modal */}
        <Modal
          visible={showGoalModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGoalModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Goal</Text>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Goal Type</Text>
              <View style={styles.segmentedControl}>
                {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segmentButton,
                      newGoal.type === type && styles.segmentButtonActive,
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, type })}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        newGoal.type === type && styles.segmentTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.segmentedControl}>
                {(['earnings', 'deliveries', 'rating'] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.segmentButton,
                      newGoal.category === category && styles.segmentButtonActive,
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, category })}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        newGoal.category === category && styles.segmentTextActive,
                      ]}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Target Value</Text>
              <TextInput
                style={styles.input}
                placeholder={
                  newGoal.category === 'earnings'
                    ? 'e.g., 500'
                    : newGoal.category === 'deliveries'
                    ? 'e.g., 20'
                    : 'e.g., 4.5'
                }
                keyboardType="numeric"
                value={newGoal.target}
                onChangeText={(text) => setNewGoal({ ...newGoal, target: text })}
              />

              <TouchableOpacity style={styles.createButton} onPress={handleCreateGoal}>
                <Text style={styles.createButtonText}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0A2540" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#0A2540" />
        </TouchableOpacity>
      </View>

      {renderPeriodSelector()}
      {renderTabSelector()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'goals' && renderGoalsTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A2540',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  tabSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  tabButtonActive: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    gap: 10,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  earningsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  earningsLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  earningsTotalRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  earningsTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  earningsTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  peakHoursCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  peakHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  peakHourRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peakHourRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  peakHourInfo: {
    flex: 1,
  },
  peakHourTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  peakHourStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1e40af',
  },
  summaryHighlight: {
    fontWeight: '700',
    color: '#1e3a8a',
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
  },
  addGoalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  emptyGoals: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyGoalsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyGoalsSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  goalBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalBadgeText: {
    fontSize: 24,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    minWidth: 40,
    textAlign: 'right',
  },
  goalStats: {
    flexDirection: 'row',
    gap: 16,
  },
  goalStat: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  goalStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  goalStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  achievedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
  },
  achievedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  segmentTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default RiderAnalyticsScreen;
