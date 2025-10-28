import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import RatingStars from '../components/RatingStars';
import ReviewCard from '../components/ReviewCard';
import DisputeModal from '../components/DisputeModal';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';
import { Rating } from '../types/rating';

interface RatingStats {
  user_id: number;
  user_type: string;
  average_rating: number;
  total_ratings: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  recent_ratings: Rating[];
  top_tags: Array<{ tag: string; count: number }>;
}

interface RatingsScreenProps {
  navigation: any;
}

const RatingsScreen: React.FC<RatingsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [allRatings, setAllRatings] = useState<Rating[]>([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeRatingId, setDisputeRatingId] = useState<string | null>(null);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);

      // Load rating stats
      const statsData = await ApiService.getMyRatingStats();
      setStats(statsData);

      // Load all ratings if user exists
      if (user) {
        const userType = user.role === 'rider' ? 'rider' : 'customer';
        const ratingsData = await ApiService.getUserRatings(user.id, userType);
        setAllRatings(ratingsData.ratings || []);
      }
    } catch (err: any) {
      console.error('Failed to load ratings:', err);
      setError(err.message || 'Failed to load ratings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRatings(true);
  };

  const handleDisputeRating = async (reason: string) => {
    if (!disputeRatingId) return;

    try {
      await ApiService.disputeRating(disputeRatingId, reason);
      alert('Your dispute has been submitted for review.');
      loadRatings();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to submit dispute');
    }
  };

  const getStarPercentage = (count: number): number => {
    if (!stats || stats.total_ratings === 0) return 0;
    return (count / stats.total_ratings) * 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading ratings..." />
      </SafeAreaView>
    );
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorDisplay
          title="Unable to load ratings"
          message={error}
          onRetry={loadRatings}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Ratings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Rating Card */}
        {stats && (
          <View style={styles.overallCard}>
            <Text style={styles.cardTitle}>Overall Rating</Text>
            <View style={styles.overallRatingContainer}>
              <Text style={styles.ratingNumber}>
                {stats.average_rating.toFixed(1)}
              </Text>
              <View style={styles.starsAndCount}>
                <RatingStars rating={Math.round(stats.average_rating)} size={28} />
                <Text style={styles.totalRatings}>
                  Based on {stats.total_ratings} review{stats.total_ratings !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Star Distribution */}
            <View style={styles.distributionContainer}>
              {[
                { stars: 5, count: stats.five_star },
                { stars: 4, count: stats.four_star },
                { stars: 3, count: stats.three_star },
                { stars: 2, count: stats.two_star },
                { stars: 1, count: stats.one_star },
              ].map(({ stars, count }) => (
                <View key={stars} style={styles.distributionRow}>
                  <Text style={styles.starLabel}>{stars}★</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${getStarPercentage(count)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.countLabel}>{count}</Text>
                </View>
              ))}
            </View>

            {/* Top Tags */}
            {stats.top_tags && stats.top_tags.length > 0 && (
              <View style={styles.tagsSection}>
                <Text style={styles.sectionTitle}>Most Common Feedback</Text>
                <View style={styles.tagsContainer}>
                  {stats.top_tags.slice(0, 5).map((tagData, index) => (
                    <View key={index} style={styles.topTag}>
                      <Text style={styles.topTagText}>{tagData.tag}</Text>
                      <View style={styles.topTagCount}>
                        <Text style={styles.topTagCountText}>{tagData.count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent Reviews */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            Recent Reviews ({allRatings.length})
          </Text>
          {allRatings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No ratings yet</Text>
              <Text style={styles.emptyStateText}>
                Ratings from your {user?.role === 'rider' ? 'deliveries' : 'orders'} will appear here
              </Text>
            </View>
          ) : (
            allRatings.map((rating) => (
              <ReviewCard
                key={rating.id}
                rating={rating}
                currentUserId={user?.id || 0}
                currentUserType={user?.role === 'rider' ? 'rider' : 'customer'}
                onDispute={(ratingId) => {
                  setDisputeRatingId(ratingId);
                  setShowDisputeModal(true);
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Dispute Modal */}
      <DisputeModal
        visible={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        onSubmit={handleDisputeRating}
        ratingId={disputeRatingId || ''}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  overallCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  overallRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 20,
  },
  ratingNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: '#2196F3',
  },
  starsAndCount: {
    flex: 1,
  },
  totalRatings: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
  },
  distributionContainer: {
    marginBottom: 20,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  starLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    width: 30,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  countLabel: {
    fontSize: 13,
    color: '#757575',
    width: 30,
    textAlign: 'right',
  },
  tagsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  topTagText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  topTagCount: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTagCountText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  reviewsSection: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default RatingsScreen;
