import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';

// Import authentication screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

// Import main navigation
import MainNavigation from './Navigation';

// Import services
import { StorageService } from '../utils/storage';

const Stack = createStackNavigator();

export default function AuthNavigation() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    
    // Set up a polling mechanism to check auth status periodically
    const authCheckInterval = setInterval(checkAuthStatus, 1000);
    
    return () => clearInterval(authCheckInterval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await StorageService.getToken();
      const user = await StorageService.getUser();
      const newAuthState = !!token && !!user;
      
      // Only update state if it has changed to prevent unnecessary re-renders
      if (newAuthState !== isAuthenticated) {
        setIsAuthenticated(newAuthState);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      if (isAuthenticated !== false) {
        setIsAuthenticated(false);
      }
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

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
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}