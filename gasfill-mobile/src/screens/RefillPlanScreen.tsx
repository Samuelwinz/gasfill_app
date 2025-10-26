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
    name: 'Basic',
    price: '35',
    features: ['1 Refill per month', 'Standard delivery', 'Email support'],
    icon: 'flame',
    color: '#0A2540',
  },
  {
    name: 'Pro',
    price: '65',
    features: ['2 Refills per month', 'Priority delivery', '24/7 support'],
    icon: 'rocket',
    color: '#FF6F00',
    recommended: true,
  },
  {
    name: 'Family',
    price: '120',
    features: ['4 Refills per month', 'Instant delivery', 'Dedicated agent'],
    icon: 'people',
    color: '#3B82F6',
  },
];

const RefillPlanScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('Pro');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Refill Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subHeader}>
          Save more with our monthly subscription plans.
        </Text>

        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.name}
            style={[
              styles.planCard,
              selectedPlan === plan.name && {
                borderColor: plan.color,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedPlan(plan.name)}
          >
            {plan.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <Ionicons name={plan.icon as any} size={24} color={plan.color} />
              <Text style={[styles.planName, { color: plan.color }]}>
                {plan.name}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₵{plan.price}</Text>
              <Text style={styles.pricePer}>/month</Text>
            </View>
            <View style={styles.featuresList}>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#FF6F00"
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton}>
          <Text style={styles.continueButtonText}>
            Continue with {selectedPlan}
          </Text>
        </TouchableOpacity>
      </View>
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
  subHeader: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: '#FF6F00',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0A2540',
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
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  continueButton: {
    backgroundColor: '#0A2540',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RefillPlanScreen;
