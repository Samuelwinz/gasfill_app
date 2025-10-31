import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import authentication screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';

// Import main navigation
import MainNavigation from './Navigation';

// Import services
import { StorageService } from '../utils/storage';

const Stack = createStackNavigator();

const TOKEN_KEY = 'gasfill_token_v1';
const ADMIN_TOKEN_KEY = 'gasfill_admin_token';
const USER_KEY = 'gasfill_user_v1';
const RIDER_KEY = 'rider';

export default function AuthNavigation() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const token = await StorageService.getToken();
      const adminToken = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
      const user = await StorageService.getUser();
      const rider = await StorageService.getItem(RIDER_KEY);
      
      // User is authenticated if they have a token (user or admin) and user/rider data
      // OR if they have an admin token (admin can be authenticated without regular user token)
      const newAuthState = (!!token && (!!user || !!rider)) || !!adminToken;
      
      // Log auth check details in development
      if (__DEV__) {
        console.log('🔍 Auth check:', {
          token: !!token,
          adminToken: !!adminToken,
          user: !!user,
          rider: !!rider,
          authenticated: newAuthState,
        });
      }
      
      return newAuthState;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const authState = await checkAuthStatus();
      setIsAuthenticated(authState);
      setLoading(false);
    };
    
    initAuth();
    
    // Set up a polling mechanism to check auth status periodically
    // Use longer interval to reduce overhead
    const authCheckInterval = setInterval(async () => {
      const authState = await checkAuthStatus();
      setIsAuthenticated(prevState => {
        // Only update if actually changed
        if (prevState !== authState) {
          console.log('🔄 Auth state changed:', authState);
          return authState;
        }
        return prevState;
      });
    }, 2000); // Increased to 2 seconds
    
    return () => clearInterval(authCheckInterval);
  }, []); // Empty dependency array - only run once

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>
            Loading...
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            // User is authenticated - show main app
            <Stack.Screen name="MainApp" component={MainNavigation} />
          ) : (
            // User is not authenticated - show auth screens
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}