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
  const [orderStats, setOrderStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
  });

  // Determine display data based on user role
  const displayName = rider?.username || user?.username || 'User';
  const displayEmail = rider?.email || user?.email || '';
  const displayPhone = rider?.phone || user?.phone || '';
  const isRider = userRole === 'rider';
  const isCustomer = userRole === 'customer';
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (isCustomer && isAuthenticated) {
      loadCustomerStats();
    }
  }, [isCustomer, isAuthenticated]);

  const loadCustomerStats = async () => {
    try {
      // TODO: Replace with actual API call when backend endpoint is ready
      // const stats = await apiService.getCustomerStats();
      // For now, using mock data
      setOrderStats({
        total_orders: 0,
        pending_orders: 0,
        completed_orders: 0,
      });
    } catch (error) {
      console.error('Error loading customer stats:', error);
    }
  };

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
    // Don't navigate manually - just logout to clear tokens
    // AuthNavigation will automatically show login screen
    logout();
  };

  const customerMenuItems = [
    { icon: 'receipt-outline', name: 'Order History', screen: 'Orders', description: 'View all your orders' },
    { icon: 'flame-outline', name: 'Subscription Plans', screen: 'SubscriptionManagement', description: 'Manage your refill plan' },
    { icon: 'location-outline', name: 'Delivery Addresses', screen: null, description: 'Manage saved addresses' },
    { icon: 'card-outline', name: 'Payment Methods', screen: null, description: 'Manage payment options' },
    { icon: 'notifications-outline', name: 'Notifications', screen: 'Notifications', description: 'Notification preferences' },
    { icon: 'help-circle-outline', name: 'Help & Support', screen: 'CustomerHelpSupport', description: 'Get help and contact us' },
    { icon: 'information-circle-outline', name: 'About', screen: 'About', description: 'App version and info' },
  ];

  const riderMenuItems = [
    { icon: 'settings-outline', name: 'Account Settings', screen: 'RiderAccountSettings', description: 'Update your information' },
    { icon: 'notifications-outline', name: 'Notifications', screen: 'Notifications', description: 'Notification preferences' },
    { icon: 'help-circle-outline', name: 'Help & Support', screen: 'RiderHelpSupport', description: 'Get help and contact us' },
    { icon: 'information-circle-outline', name: 'About', screen: 'About', description: 'App version and info' },
  ];

  const adminMenuItems = [
    { icon: 'people-outline', name: 'User Management', screen: null, description: 'Manage users and riders' },
    { icon: 'analytics-outline', name: 'Analytics & Reports', screen: null, description: 'View detailed analytics' },
    { icon: 'settings-outline', name: 'System Settings', screen: null, description: 'Configure app settings' },
    { icon: 'shield-outline', name: 'Security', screen: null, description: 'Security and permissions' },
    { icon: 'notifications-outline', name: 'Notifications', screen: 'Notifications', description: 'Notification preferences' },
    { icon: 'document-text-outline', name: 'Activity Logs', screen: null, description: 'View system activity' },
    { icon: 'help-circle-outline', name: 'Help & Support', screen: 'RiderHelpSupport', description: 'Get help and resources' },
    { icon: 'information-circle-outline', name: 'About', screen: 'About', description: 'App version and info' },
  ];

  const menuItems = isRider ? riderMenuItems : isAdmin ? adminMenuItems : customerMenuItems;

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
              ) : isCustomer ? (
                <>
                  <View style={styles.customerBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
                    <Text style={styles.customerBadgeText}>VERIFIED CUSTOMER</Text>
                  </View>
                  
                  {/* Subscription Badge */}
                  {user?.subscription_tier && user?.subscription_status === 'active' && (
                    <View style={[
                      styles.subscriptionBadge,
                      user.subscription_tier === 'basic' && styles.subscriptionBasic,
                      user.subscription_tier === 'pro' && styles.subscriptionPro,
                      user.subscription_tier === 'family' && styles.subscriptionFamily,
                    ]}>
                      <Ionicons 
                        name={
                          user.subscription_tier === 'basic' ? 'flame-outline' :
                          user.subscription_tier === 'pro' ? 'flame' :
                          'rocket'
                        } 
                        size={14} 
                        color={
                          user.subscription_tier === 'basic' ? '#059669' :
                          user.subscription_tier === 'pro' ? '#3b82f6' :
                          '#9333ea'
                        }
                      />
                      <Text style={[
                        styles.subscriptionBadgeText,
                        user.subscription_tier === 'basic' && styles.subscriptionBasicText,
                        user.subscription_tier === 'pro' && styles.subscriptionProText,
                        user.subscription_tier === 'family' && styles.subscriptionFamilyText,
                      ]}>
                        {user.subscription_tier.toUpperCase()} PLAN
                      </Text>
                    </View>
                  )}
                </>
              ) : isAdmin ? (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-half" size={16} color="#ffffff" />
                  <Text style={styles.adminBadgeText}>ADMINISTRATOR</Text>
                </View>
              ) : null}
              
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
              
              {isCustomer && (
                <View style={styles.customerStatsContainer}>
                  <View style={styles.customerStat}>
                    <Ionicons name="receipt" size={18} color="#3b82f6" />
                    <Text style={styles.customerStatValue}>{orderStats.total_orders}</Text>
                    <Text style={styles.customerStatLabel}>Orders</Text>
                  </View>
                  <View style={styles.customerStatDivider} />
                  <View style={styles.customerStat}>
                    <Ionicons name="time" size={18} color="#f59e0b" />
                    <Text style={styles.customerStatValue}>{orderStats.pending_orders}</Text>
                    <Text style={styles.customerStatLabel}>Pending</Text>
                  </View>
                  <View style={styles.customerStatDivider} />
                  <View style={styles.customerStat}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.customerStatValue}>{orderStats.completed_orders}</Text>
                    <Text style={styles.customerStatLabel}>Completed</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Upgrade Banner for Basic Subscription */}
            {isCustomer && user?.subscription_tier === 'basic' && user?.subscription_status === 'active' && (
              <View style={styles.upgradeBanner}>
                <View style={styles.upgradeBannerContent}>
                  <View style={styles.upgradeBannerIcon}>
                    <Ionicons name="rocket" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.upgradeBannerText}>
                    <Text style={styles.upgradeBannerTitle}>Upgrade to Pro or Family</Text>
                    <Text style={styles.upgradeBannerDescription}>
                      Save up to 25% with more refills per month
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.upgradeBannerButton}
                  onPress={() => navigation.navigate('RefillPlans')}
                >
                  <Text style={styles.upgradeBannerButtonText}>View Plans</Text>
                  <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            )}

            {isCustomer && (
              <View style={styles.customerInfoCard}>
                <Text style={styles.customerInfoTitle}>Account Information</Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={20} color="#6b7280" />
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color="#6b7280" />
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{user?.phone || 'Not set'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={20} color="#6b7280" />
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{user?.address || 'Not set'}</Text>
                </View>
                
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={18} color="#3b82f6" />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            )}
            
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

            {isAdmin && (
              <View style={styles.adminStatsCard}>
                <Text style={styles.adminStatsTitle}>System Overview</Text>
                
                <View style={styles.adminStatsGrid}>
                  <View style={styles.adminStatItem}>
                    <View style={[styles.adminStatIcon, { backgroundColor: '#dbeafe' }]}>
                      <Ionicons name="people" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.adminStatValue}>127</Text>
                    <Text style={styles.adminStatLabel}>Total Users</Text>
                  </View>
                  
                  <View style={styles.adminStatItem}>
                    <View style={[styles.adminStatIcon, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="bicycle" size={24} color="#f59e0b" />
                    </View>
                    <Text style={styles.adminStatValue}>12</Text>
                    <Text style={styles.adminStatLabel}>Active Riders</Text>
                  </View>
                  
                  <View style={styles.adminStatItem}>
                    <View style={[styles.adminStatIcon, { backgroundColor: '#d1fae5' }]}>
                      <Ionicons name="receipt" size={24} color="#10b981" />
                    </View>
                    <Text style={styles.adminStatValue}>45</Text>
                    <Text style={styles.adminStatLabel}>Today's Orders</Text>
                  </View>
                  
                  <View style={styles.adminStatItem}>
                    <View style={[styles.adminStatIcon, { backgroundColor: '#e0e7ff' }]}>
                      <Ionicons name="cash" size={24} color="#6366f1" />
                    </View>
                    <Text style={styles.adminStatValue}>₵3.2K</Text>
                    <Text style={styles.adminStatLabel}>Revenue</Text>
                  </View>
                </View>

                <View style={styles.adminQuickActions}>
                  <TouchableOpacity style={styles.adminQuickAction}>
                    <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
                    <Text style={styles.adminQuickActionText}>8 Pending</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.adminQuickAction}>
                    <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
                    <Text style={styles.adminQuickActionText}>3 Issues</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.adminQuickAction}>
                    <Ionicons name="checkmark-done-outline" size={20} color="#10b981" />
                    <Text style={styles.adminQuickActionText}>View All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    if (item.screen) {
                      navigation.navigate(item.screen);
                    } else {
                      Alert.alert('Coming Soon', `${item.name} feature will be available soon!`);
                    }
                  }}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon as any} size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuText}>{item.name}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
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
                <View style={styles.menuContent}>
                  <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
                  <Text style={styles.logoutDescription}>Sign out of your account</Text>
                </View>
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
              onPress={() => {
                // Clear any existing data and trigger auth state change
                logout();
              }}
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
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  customerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
    letterSpacing: 0.5,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
    marginTop: 8,
  },
  subscriptionBasic: {
    backgroundColor: '#d1fae5',
  },
  subscriptionPro: {
    backgroundColor: '#dbeafe',
  },
  subscriptionFamily: {
    backgroundColor: '#f3e8ff',
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subscriptionBasicText: {
    color: '#059669',
  },
  subscriptionProText: {
    color: '#3b82f6',
  },
  subscriptionFamilyText: {
    color: '#9333ea',
  },
  upgradeBanner: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#dbeafe',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  upgradeBannerDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  upgradeBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  upgradeBannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  customerStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  customerStat: {
    alignItems: 'center',
    flex: 1,
  },
  customerStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  customerStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  customerStatLabel: {
    fontSize: 11,
    color: '#B2C7DD',
    marginTop: 2,
  },
  customerInfoCard: {
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
  customerInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
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
  menuContent: {
    flex: 1,
  },
  menuDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
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
  logoutDescription: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 2,
  },
  // Admin Styles
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  adminStatsCard: {
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
  adminStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  adminStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  adminStatItem: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  adminStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  adminStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  adminQuickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  adminQuickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  adminQuickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
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