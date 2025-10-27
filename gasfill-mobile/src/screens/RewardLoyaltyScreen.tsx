import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const rewards = [
  {
    title: '5% Off Your Next Refill',
    points: 500,
    icon: 'flame',
    color: '#FF6F00',
  },
  {
    title: 'Free Delivery',
    points: 1000,
    icon: 'bicycle',
    color: '#0A2540',
  },
  {
    title: '10KG Cylinder Discount',
    points: 2500,
    icon: 'gift',
    color: '#3B82F6',
  },
  {
    title: 'Free Gas Cooker Service',
    points: 5000,
    icon: 'build',
    color: '#10B981',
  },
];

const RewardLoyaltyScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const userPoints = 750;
  const nextRewardPoints = 1000;
  const progress = (userPoints / nextRewardPoints) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rewards & Loyalty</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.loyaltyCard}>
          <Text style={styles.loyaltyTitle}>Your Loyalty Points</Text>
          <Text style={styles.points}>{userPoints.toLocaleString()}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {nextRewardPoints - userPoints} points to next reward
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Rewards</Text>

        {rewards.map((reward) => (
          <View key={reward.title} style={styles.rewardItem}>
            <View style={[styles.rewardIcon, { backgroundColor: reward.color }]}>
              <Ionicons name={reward.icon as any} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardPoints}>
                {reward.points.toLocaleString()} points
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.redeemButton,
                userPoints < reward.points && styles.disabledButton,
              ]}
              disabled={userPoints < reward.points}
            >
              <Text style={styles.redeemButtonText}>Redeem</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
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
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  content: {
    padding: 20,
  },
  loyaltyCard: {
    backgroundColor: '#0A2540',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  loyaltyTitle: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 8,
  },
  points: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6F00',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A2540',
    marginBottom: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  rewardPoints: {
    fontSize: 14,
    color: '#6B7280',
  },
  redeemButton: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default RewardLoyaltyScreen;
