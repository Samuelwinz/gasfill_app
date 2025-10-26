import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import CartScreen from '../screens/CartScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';

// Import new feature screens
import RefillPlanScreen from '../screens/RefillPlanScreen';
import RewardLoyaltyScreen from '../screens/RewardLoyaltyScreen';

// Import new pickup/refill service screens
import PickupRequestScreen from '../screens/PickupRequestScreen';
import DeliveryTrackingScreen from '../screens/DeliveryTrackingScreen';
import RiderDashboard from '../screens/RiderDashboard';
import RiderJobsScreen from '../screens/RiderJobsScreen';
import RiderEarningsScreen from '../screens/RiderEarningsScreen';
import AdminDashboard from '../screens/AdminDashboard';

// Import services
import { StorageService } from '../utils/storage';
import { User } from '../types';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Customer navigation (main app)
function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Products':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Pickup':
              iconName = focused ? 'car' : 'car-outline';
              break;
            case 'Track':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Orders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0b5ed7',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen 
        name="Pickup" 
        component={PickupRequestScreen}
        options={{ title: 'Request Pickup' }}
      />
      <Tab.Screen 
        name="Track" 
        component={DeliveryTrackingScreen}
        options={{ title: 'Track Orders' }}
      />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Rider navigation
function RiderTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'speedometer' : 'speedometer-outline';
              break;
            case 'Jobs':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Earnings':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={RiderDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Jobs" 
        component={RiderJobsScreen}
        options={{ title: 'Jobs' }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={RiderEarningsScreen}
        options={{ title: 'Earnings' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Admin navigation
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Riders':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Orders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#dc2626',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen 
        name="Riders" 
        component={AdminDashboard} // Admin can switch tabs within
        options={{ title: 'Riders' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={AdminDashboard}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={ProfileScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// Main stack navigator with role-based routing
function AppStack() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
    
    // Set up interval to check for role changes (in case of login/logout)
    const roleCheckInterval = setInterval(loadUserRole, 1000);
    
    return () => clearInterval(roleCheckInterval);
  }, []);

  const loadUserRole = async () => {
    try {
      // Check for explicit userRole first (set during rider/customer login)
      const storedRole = await StorageService.getItem('userRole');
      
      if (storedRole && typeof storedRole === 'string') {
        console.log('📱 User role from storage:', storedRole);
        setUserRole(storedRole);
      } else {
        // Fallback: check user object role
        const user = await StorageService.getUser();
        const role = user?.role || 'customer';
        console.log('📱 User role from user object:', role);
        setUserRole(role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('customer'); // Default fallback
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0b5ed7" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>
          Loading...
        </Text>
      </View>
    );
  }

  // Route to appropriate navigation based on user role
  const getNavigationComponent = () => {
    console.log('🚦 Routing based on role:', userRole);
    switch (userRole) {
      case 'rider':
        console.log('✅ Loading Rider Navigation');
        return RiderTabs;
      case 'admin':
        console.log('✅ Loading Admin Navigation');
        return AdminTabs;
      case 'customer':
      case 'user':
      default:
        console.log('✅ Loading Customer Navigation');
        return CustomerTabs;
    }
  };

  const MainComponent = getNavigationComponent();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainComponent} />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen}
        options={{ 
          headerShown: true,
          title: 'Order Details',
        }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ 
          headerShown: true,
          title: 'Checkout',
        }}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ 
          headerShown: true,
          title: 'Shopping Cart',
        }}
      />
      <Stack.Screen 
        name="RefillPlans" 
        component={RefillPlanScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Rewards" 
        component={RewardLoyaltyScreen}
        options={{ 
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Root Navigator - now just returns the AppStack
export default function MainNavigation() {
  return <AppStack />;
}