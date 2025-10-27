import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface SubscriptionManagementScreenProps {
  navigation: any;
}

const SubscriptionManagementScreen: React.FC<SubscriptionManagementScreenProps> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Subscription plan details
  const plans = {
    basic: {
      name: 'Basic Plan',
      price: 35,
      interval: 'month',
      refills: 1,
      cylinderSize: '6kg',
      features: ['1 refill per month', '6kg cylinder', 'Standard delivery', 'Customer support'],
      color: '#059669',
      icon: 'flame-outline' as const,
    },
    pro: {
      name: 'Pro Plan',
      price: 65,
      interval: 'month',
      refills: 2,
      cylinderSize: '13kg',
      features: ['2 refills per month', '13kg cylinder', 'Priority delivery', 'Save 15%', '24/7 support'],
      color: '#3b82f6',
      icon: 'flame' as const,
      savings: 15,
    },
    family: {
      name: 'Family Plan',
      price: 120,
      interval: 'month',
      refills: 4,
      cylinderSize: '14.5kg',
      features: ['4 refills per month', '14.5kg cylinder', 'Premium delivery', 'Save 25%', 'Dedicated support', 'Family account'],
      color: '#9333ea',
      icon: 'rocket' as const,
      savings: 25,
    },
  };

  const currentPlan = user?.subscription_tier && user.subscription_tier in plans
    ? plans[user.subscription_tier as keyof typeof plans]
    : null;

  // Calculate next billing date (mock - 30 days from now)
  const getNextBillingDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Mock billing history
  const billingHistory = [
    { id: 1, date: '2024-09-26', amount: currentPlan?.price || 0, status: 'paid', reference: 'INV-2024-001' },
    { id: 2, date: '2024-08-26', amount: currentPlan?.price || 0, status: 'paid', reference: 'INV-2024-002' },
    { id: 3, date: '2024-07-26', amount: currentPlan?.price || 0, status: 'paid', reference: 'INV-2024-003' },
  ];

  const handleUpgrade = () => {
    navigation.navigate('RefillPlans');
  };

  const handlePauseSubscription = () => {
    Alert.alert(
      'Pause Subscription',
      'Are you sure you want to pause your subscription? You can resume it anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            // TODO: Call API to pause subscription
            setTimeout(() => {
              updateUser({ subscription_status: 'paused' });
              setIsLoading(false);
              Alert.alert('Success', 'Your subscription has been paused.');
            }, 1000);
          },
        },
      ]
    );
  };

  const handleResumeSubscription = () => {
    Alert.alert(
      'Resume Subscription',
      'Resume your subscription and continue enjoying the benefits.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: async () => {
            setIsLoading(true);
            // TODO: Call API to resume subscription
            setTimeout(() => {
              updateUser({ subscription_status: 'active' });
              setIsLoading(false);
              Alert.alert('Success', 'Your subscription has been resumed.');
            }, 1000);
          },
        },
      ]
    );
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to all benefits.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Cancellation',
              'This action cannot be undone. Your subscription will end at the end of the current billing period.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Yes, Cancel',
                  style: 'destructive',
                  onPress: async () => {
                    setIsLoading(true);
                    // TODO: Call API to cancel subscription
                    setTimeout(() => {
                      updateUser({ subscription_status: 'cancelled', subscription_tier: null });
                      setIsLoading(false);
                      Alert.alert('Cancelled', 'Your subscription has been cancelled.');
                      navigation.goBack();
                    }, 1000);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!currentPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="flame-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>No Active Subscription</Text>
          <Text style={styles.emptyStateText}>
            Choose a refill plan to enjoy regular gas deliveries and exclusive savings.
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => navigation.navigate('RefillPlans')}>
            <Text style={styles.emptyStateButtonText}>Browse Plans</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Plan Card */}
        <View style={[styles.currentPlanCard, { borderColor: currentPlan.color }]}>
          <View style={styles.currentPlanHeader}>
            <View style={[styles.planIcon, { backgroundColor: `${currentPlan.color}20` }]}>
              <Ionicons name={currentPlan.icon} size={32} color={currentPlan.color} />
            </View>
            <View style={styles.currentPlanInfo}>
              <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
              <Text style={styles.currentPlanPrice}>
                ₵{currentPlan.price}/{currentPlan.interval}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              user?.subscription_status === 'active' && styles.statusActive,
              user?.subscription_status === 'paused' && styles.statusPaused,
            ]}>
              <Text style={[
                styles.statusText,
                user?.subscription_status === 'active' && styles.statusTextActive,
                user?.subscription_status === 'paused' && styles.statusTextPaused,
              ]}>
                {user?.subscription_status?.toUpperCase()}
              </Text>
            </View>
          </View>

          {('savings' in currentPlan && currentPlan.savings) && (
            <View style={styles.savingsBadge}>
              <Ionicons name="pricetag" size={16} color="#059669" />
              <Text style={styles.savingsText}>You're saving {currentPlan.savings}% every month!</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.planDetailsSection}>
            <Text style={styles.sectionTitle}>Plan Features</Text>
            {currentPlan.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={currentPlan.color} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.billingSection}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Next billing date</Text>
              <Text style={styles.billingValue}>{getNextBillingDate()}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Amount</Text>
              <Text style={styles.billingValueBold}>₵{currentPlan.price}.00</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {user?.subscription_tier !== 'family' && (
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Ionicons name="arrow-up-circle" size={20} color="#fff" />
              <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
            </TouchableOpacity>
          )}

          {user?.subscription_status === 'active' ? (
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={handlePauseSubscription}
              disabled={isLoading}
            >
              <Ionicons name="pause-circle-outline" size={20} color="#f59e0b" />
              <Text style={styles.pauseButtonText}>Pause Subscription</Text>
            </TouchableOpacity>
          ) : user?.subscription_status === 'paused' ? (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResumeSubscription}
              disabled={isLoading}
            >
              <Ionicons name="play-circle-outline" size={20} color="#10b981" />
              <Text style={styles.resumeButtonText}>Resume Subscription</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
            disabled={isLoading}
          >
            <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Billing History */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Billing History</Text>
          {billingHistory.map((bill) => (
            <View key={bill.id} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <Ionicons name="receipt-outline" size={24} color="#6b7280" />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>{bill.date}</Text>
                  <Text style={styles.historyReference}>{bill.reference}</Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyAmount}>₵{bill.amount}.00</Text>
                <View style={styles.historyStatusBadge}>
                  <Text style={styles.historyStatusText}>PAID</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            Have questions about your subscription? Contact our support team.
          </Text>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#3b82f6" />
            <Text style={styles.helpButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  currentPlanCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanInfo: {
    flex: 1,
    marginLeft: 16,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  currentPlanPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusPaused: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#065f46',
  },
  statusTextPaused: {
    color: '#92400e',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  planDetailsSection: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#4b5563',
  },
  billingSection: {
    marginTop: 0,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billingLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  billingValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  billingValueBold: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  historySection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyInfo: {
    gap: 4,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyReference: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  historyStatusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  helpSection: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});

export default SubscriptionManagementScreen;
