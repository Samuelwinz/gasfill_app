import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import CartScreen from '../screens/CartScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';

// Import new pickup/refill service screens
import PickupRequestScreen from '../screens/PickupRequestScreen';
import PickupTrackingScreen from '../screens/PickupTrackingScreen';
import RiderDashboard from '../screens/RiderDashboard';
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
        component={PickupTrackingScreen}
        options={{ title: 'Track Orders' }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} />
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
        component={RiderDashboard} // Could be a separate RiderJobsScreen
        options={{ title: 'Jobs' }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={RiderDashboard} // Could be a separate RiderEarningsScreen
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
  }, []);

  const loadUserRole = async () => {
    try {
      const user = await StorageService.getUser();
      setUserRole(user?.role || 'user'); // Default to 'user' role
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('user'); // Default fallback
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
    switch (userRole) {
      case 'rider':
        return RiderTabs;
      case 'admin':
        return AdminTabs;
      case 'user':
      default:
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
    </Stack.Navigator>
  );
}

// Root Navigator
export default function Navigation() {
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}