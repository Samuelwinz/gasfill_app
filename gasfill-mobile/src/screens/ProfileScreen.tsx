import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, rider, isAuthenticated, userRole, logout } = useAuth();
  const [loyalty, setLoyalty] = useState({
    level: 'Gold Member',
    points: 42,
    nextLevelPoints: 50,
  });

  // Determine display data based on user role
  const displayName = rider?.username || user?.username || 'User';
  const displayEmail = rider?.email || user?.email || '';
  const displayPhone = rider?.phone || '';
  const isRider = userRole === 'rider';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Navigation will be handled automatically by AuthNavigation
            // No need to manually navigate after logout
          },
        },
      ]
    );
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const menuItems = [
    // Commented out screens that aren't implemented yet
    // { icon: 'person-outline', name: 'Account Settings', screen: 'AccountSettings' },
    // { icon: 'location-outline', name: 'Address Management', screen: 'AddressManagement' },
    // { icon: 'notifications-outline', name: 'Notifications', screen: 'Notifications' },
    // { icon: 'card-outline', name: 'Payment Methods', screen: 'PaymentMethods' },
    // { icon: 'help-buoy-outline', name: 'Help & Support', screen: 'Support' },
    // { icon: 'call-outline', name: 'Contact Us', screen: 'Contact' },
    { icon: 'receipt-outline', name: 'Order History', screen: 'Orders' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FA" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {isAuthenticated ? (
          <>
            <View style={styles.profileCard}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?u=' + displayEmail }}
                style={styles.avatar}
              />
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{displayEmail}</Text>
              {displayPhone && <Text style={styles.userPhone}>{displayPhone}</Text>}
              
              {isRider ? (
                <View style={styles.riderBadgeContainer}>
                  <View style={[
                    styles.riderBadge,
                    { backgroundColor: rider?.status === 'available' ? '#d1fae5' : rider?.status === 'busy' ? '#fef3c7' : '#f3f4f6' }
                  ]}>
                    <Ionicons 
                      name="bicycle" 
                      size={16} 
                      color={rider?.status === 'available' ? '#065f46' : rider?.status === 'busy' ? '#92400e' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.riderBadgeText,
                      { color: rider?.status === 'available' ? '#065f46' : rider?.status === 'busy' ? '#92400e' : '#6b7280' }
                    ]}>
                      {rider?.status?.toUpperCase() || 'OFFLINE'} RIDER
                    </Text>
                  </View>
                  {rider?.is_verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.userLevel}>{loyalty.level}</Text>
              )}
              
              {isRider && rider && (
                <View style={styles.riderStatsContainer}>
                  <View style={styles.riderStat}>
                    <Ionicons name="star" size={20} color="#FFC107" />
                    <Text style={styles.riderStatValue}>{(rider.rating ?? 0).toFixed(1)}</Text>
                    <Text style={styles.riderStatLabel}>Rating</Text>
                  </View>
                  <View style={styles.riderStatDivider} />
                  <View style={styles.riderStat}>
                    <Ionicons name="checkmark-done" size={20} color="#10b981" />
                    <Text style={styles.riderStatValue}>{rider.total_deliveries ?? 0}</Text>
                    <Text style={styles.riderStatLabel}>Deliveries</Text>
                  </View>
                  <View style={styles.riderStatDivider} />
                  <View style={styles.riderStat}>
                    <Ionicons name="wallet" size={20} color="#3b82f6" />
                    <Text style={styles.riderStatValue}>₵{(rider.earnings ?? 0).toFixed(0)}</Text>
                    <Text style={styles.riderStatLabel}>Earnings</Text>
                  </View>
                </View>
              )}
              
              {!isRider && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progress, { width: `${(loyalty.points / loyalty.nextLevelPoints) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{loyalty.points}</Text>
                </View>
              )}
            </View>

            {isRider && rider && (
              <View style={styles.riderInfoCard}>
                <Text style={styles.riderInfoTitle}>Rider Information</Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="car-outline" size={20} color="#6b7280" />
                  <Text style={styles.infoLabel}>Vehicle:</Text>
                  <Text style={styles.infoValue}>{rider.vehicle_type} - {rider.vehicle_number}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="card-outline" size={20} color="#6b7280" />
                  <Text style={styles.infoLabel}>License:</Text>
                  <Text style={styles.infoValue}>{rider.license_number}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={20} color="#6b7280" />
                  <Text style={styles.infoLabel}>Coverage:</Text>
                  <Text style={styles.infoValue}>{rider.area_coverage}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color="#6b7280" />
                  <Text style={styles.infoLabel}>Emergency:</Text>
                  <Text style={styles.infoValue}>{rider.emergency_contact}</Text>
                </View>
              </View>
            )}

            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => navigation.navigate(item.screen)}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon as any} size={24} color="#0A2540" />
                  </View>
                  <Text style={styles.menuText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B2C7DD" />
                </TouchableOpacity>
              ))}

              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutButton]}
                onPress={handleLogout}
              >
                <View style={[styles.menuIcon, styles.logoutIcon]}>
                  <Ionicons name="log-out-outline" size={24} color="#DC2626" />
                </View>
                <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
                <Ionicons name="chevron-forward" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.notLoggedInContainer}>
            <View style={styles.notLoggedInIcon}>
              <Ionicons name="person-outline" size={60} color="#B2C7DD" />
            </View>
            <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
            <Text style={styles.notLoggedInText}>
              Please login to access your profile and settings
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  profileCard: {
    backgroundColor: '#0A2540',
    borderRadius: 20,
    marginHorizontal: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#B2C7DD',
    marginBottom: 8,
  },
  userPhone: {
    fontSize: 13,
    color: '#B2C7DD',
    marginBottom: 12,
  },
  userLevel: {
    fontSize: 16,
    color: '#FFC107',
    marginBottom: 16,
  },
  riderBadgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  riderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  riderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  riderStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  riderStat: {
    alignItems: 'center',
    flex: 1,
  },
  riderStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  riderStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  riderStatLabel: {
    fontSize: 11,
    color: '#B2C7DD',
    marginTop: 2,
  },
  riderInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  riderInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 12,
    width: 90,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    marginRight: 12,
  },
  progress: {
    height: 10,
    backgroundColor: '#FFC107',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  menuContainer: {
    paddingHorizontal: 24,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2540',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  logoutIcon: {
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    color: '#DC2626',
  },
  notLoggedInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  notLoggedInIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F4F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A2540',
    marginBottom: 12,
  },
  notLoggedInText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#0A2540',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderWidth: 2,
    borderColor: '#0A2540',
    width: '100%',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#0A2540',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;