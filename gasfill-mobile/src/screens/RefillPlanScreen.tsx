import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 35,
    interval: 'monthly',
    refills_per_month: 1,
    cylinder_size: '6kg',
    features: ['1 Refill per month', 'Standard delivery', 'Email support', '6kg Cylinder'],
    icon: 'flame',
    color: '#6B7280',
    savings_percentage: 0,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 65,
    interval: 'monthly',
    refills_per_month: 2,
    cylinder_size: '13kg',
    features: ['2 Refills per month', 'Priority delivery', '24/7 support', '13kg Cylinder', 'Save 15%'],
    icon: 'rocket',
    color: '#3b82f6',
    recommended: true,
    savings_percentage: 15,
  },
  {
    id: 'family',
    name: 'Family',
    price: 120,
    interval: 'monthly',
    refills_per_month: 4,
    cylinder_size: '14.5kg',
    features: ['4 Refills per month', 'Instant delivery', 'Dedicated agent', '14.5kg Cylinder', 'Save 25%'],
    icon: 'people',
    color: '#10b981',
    savings_percentage: 25,
  },
];

const RefillPlanScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const handleContinue = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    navigation.navigate('RefillPlanBooking', { plan });
  };

  const handleOneTimeBooking = () => {
    navigation.navigate('RefillPlanBooking', { plan: null });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Refill Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Save with Subscription</Text>
          <Text style={styles.subHeader}>
            Subscribe and save up to 25% on regular refills
          </Text>
        </View>

        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan === plan.id && {
                borderColor: plan.color,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            {plan.recommended && (
              <View style={[styles.recommendedBadge, { backgroundColor: plan.color }]}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.recommendedText}>Most Popular</Text>
              </View>
            )}
            {plan.savings_percentage > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save {plan.savings_percentage}%</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <View style={[styles.planIconContainer, { backgroundColor: `${plan.color}15` }]}>
                <Ionicons name={plan.icon as any} size={28} color={plan.color} />
              </View>
              <Text style={[styles.planName, { color: plan.color }]}>
                {plan.name}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₵{plan.price}</Text>
              <Text style={styles.pricePer}>/month</Text>
            </View>
            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={plan.color}
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            {selectedPlan === plan.id && (
              <View style={[styles.selectedIndicator, { backgroundColor: plan.color }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.selectedText}>Selected</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.oneTimeSection}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.oneTimeCard}
            onPress={handleOneTimeBooking}
          >
            <View style={styles.oneTimeIcon}>
              <Ionicons name="flame-outline" size={24} color="#6B7280" />
            </View>
            <View style={styles.oneTimeContent}>
              <Text style={styles.oneTimeTitle}>One-Time Refill</Text>
              <Text style={styles.oneTimeDescription}>
                Book a single refill without subscription
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            Subscribe to {plans.find(p => p.id === selectedPlan)?.name} Plan
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  savingsBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1F2937',
  },
  pricePer: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  featuresList: {
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 10,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  oneTimeSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginHorizontal: 12,
  },
  oneTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  oneTimeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  oneTimeContent: {
    flex: 1,
  },
  oneTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  oneTimeDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomPadding: {
    height: 24,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RefillPlanScreen;
