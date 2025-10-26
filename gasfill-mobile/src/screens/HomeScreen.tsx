import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('Akon');
  const [points, setPoints] = useState(1200);
  const [ordersCompleted, setOrdersCompleted] = useState(42);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await StorageService.getUser();
      if (user) {
        setUserName(user.username || 'Akon');
      }
      // Mock data for points and orders
      // In a real app, this would come from an API
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FA" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi, {userName}!</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/150?u=akon' }} // Placeholder image
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyHeader}>
            <Text style={styles.levelText}>Level</Text>
            <Text style={styles.pointsText}>→ Points</Text>
          </View>
          <View style={styles.loyaltyBody}>
            <View style={styles.loyaltyProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progress, { width: `${(ordersCompleted / 50) * 100}%` }]} />
              </View>
            </View>
            <Text style={styles.ordersCompleted}>{ordersCompleted} Orders Completed</Text>
          </View>
        </View>

        <View style={styles.quickAccessGrid}>
          <TouchableOpacity style={styles.quickAccessCard} onPress={() => navigation.navigate('Products')}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="flame" size={40} color="#FF6F00" />
            </View>
            <Text style={styles.cardTitle}>Order Gas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAccessCard} onPress={() => navigation.navigate('Orders')}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="car" size={40} color="#0A2540" />
            </View>
            <Text style={styles.cardTitle}>Track Delivery</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('RefillPlans')}>
            <Ionicons name="flame" size={24} color="#FF6F00" />
            <Text style={styles.quickActionText}>Refill Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Support')}>
            <Ionicons name="help-buoy" size={24} color="#0A2540" />
            <Text style={styles.quickActionText}>Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  loyaltyCard: {
    backgroundColor: '#0A2540',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsText: {
    fontSize: 16,
    color: '#B2C7DD',
  },
  loyaltyBody: {
    alignItems: 'flex-end',
  },
  loyaltyProgress: {
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  progress: {
    height: 10,
    backgroundColor: '#FFC107',
    borderRadius: 5,
  },
  ordersCompleted: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAccessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2540',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0A2540',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2540',
    marginLeft: 12,
  },
});

export default HomeScreen;