import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { StorageService } from '../utils/storage';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { 
  riderLogin as riderLoginApi, 
  riderRegister as riderRegisterApi,
  RiderLoginData,
  RiderRegisterData,
  RiderProfile 
} from '../services/riderApi';
// import notificationService from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  rider: RiderProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: 'customer' | 'rider' | 'admin' | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  riderLogin: (credentials: RiderLoginData) => Promise<boolean>;
  riderRegister: (riderData: RiderRegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'rider' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const savedToken = await StorageService.getToken();
      const savedUser = await StorageService.getUser();
      const savedRole = await StorageService.getItem<string>('userRole');

      if (savedToken) {
        setToken(savedToken);
        
        if (savedRole === 'rider') {
          const savedRider = await StorageService.getItem<RiderProfile>('rider');
          if (savedRider) {
            setRider(savedRider);
            setUserRole('rider');
          }
        } else if (savedUser) {
          setUser(savedUser);
          setUserRole('customer');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting login with:', credentials.email);
      
      const response: AuthResponse = await apiService.login(credentials);
      console.log('✅ Login response received:', response);

      // Save token and user data
      await StorageService.saveToken(response.token);
      await StorageService.saveUser(response.user);

      // Determine user role from response
      let role: 'customer' | 'rider' | 'admin' = 'customer';
      if (response.user.role === 'admin') {
        role = 'admin';
      } else if (response.user.role === 'rider') {
        role = 'rider';
      }

      setToken(response.token);
      setUser(response.user);
      setUserRole(role);
      await StorageService.setItem('userRole', role);

      // TEMPORARILY DISABLED: Push notifications
      // Register push token after successful login
      /*
      try {
        const pushToken = notificationService.getPushToken();
        if (pushToken) {
          await notificationService.savePushToken(pushToken);
          console.log('✅ Push token registered with backend');
        }
      } catch (error) {
        console.error('⚠️  Failed to register push token:', error);
      }
      */

      console.log('✅ Login successful for:', response.user.email, 'Role:', role);
      return true;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      // Fallback to demo mode if backend is unavailable
      if (error.message?.includes('Network') || 
          error.message?.includes('connect') ||
          error.message?.includes('timeout') ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED') {
        console.log('🔄 Backend unavailable, using demo mode');
        const demoUser: User = {
          id: 1,
          email: credentials.email,
          username: credentials.email.split('@')[0],
          role: 'user',
          phone: '+233241234567',
          address: 'Demo Address, Accra',
          subscription_tier: 'pro',
          subscription_status: 'active',
        };
        
        const demoToken = 'demo_token_' + Date.now();
        await StorageService.saveToken(demoToken);
        await StorageService.saveUser(demoUser);
        
        setToken(demoToken);
        setUser(demoUser);
        setUserRole('customer');
        await StorageService.setItem('userRole', 'customer');
        
        console.log('✅ Demo login successful');
        return true;
      }
      
      // Check for authentication errors from backend
      if (error.response?.status === 401 || error.response?.status === 400) {
        console.error('❌ Invalid credentials');
        throw new Error('Invalid email or password');
      }
      
      console.error('❌ Unknown error during login');
      throw new Error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('📝 Attempting registration for:', userData.email);
      
      const response: AuthResponse = await apiService.register(userData);
      console.log('✅ Registration response received:', response);

      // Save token and user data
      await StorageService.saveToken(response.token);
      await StorageService.saveUser(response.user);

      setToken(response.token);
      setUser(response.user);
      setUserRole('customer');
      await StorageService.setItem('userRole', 'customer');

      console.log('✅ Registration successful for:', response.user.email);
      return true;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      // Fallback to demo mode if backend is unavailable
      if (error.message?.includes('Network') || 
          error.message?.includes('connect') ||
          error.message?.includes('timeout') ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED') {
        console.log('🔄 Backend unavailable, using demo mode for registration');
        const demoUser: User = {
          id: Date.now(),
          email: userData.email,
          username: userData.username,
          role: 'user',
          phone: userData.phone || '+233241234567',
          address: userData.address || 'Demo Address, Accra',
          subscription_tier: 'basic',
          subscription_status: 'active',
        };
        
        const demoToken = 'demo_token_' + Date.now();
        await StorageService.saveToken(demoToken);
        await StorageService.saveUser(demoUser);
        
        setToken(demoToken);
        setUser(demoUser);
        setUserRole('customer');
        await StorageService.setItem('userRole', 'customer');
        
        console.log('✅ Demo registration successful');
        return true;
      }
      
      // Check for specific backend errors
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.detail || 'Invalid registration data';
        console.error('❌ Bad request:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (error.response?.status === 409) {
        console.error('❌ User already exists');
        throw new Error('An account with this email already exists');
      }
      
      console.error('❌ Unknown error during registration');
      throw new Error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const riderLogin = async (credentials: RiderLoginData): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting rider login with:', credentials.email);
      
      const response = await riderLoginApi(credentials);
      console.log('✅ Rider login response received:', response);

      // Save token and rider data
      await StorageService.saveToken(response.token);
      await StorageService.setItem('rider', response.rider);
      await StorageService.setItem('userRole', 'rider');

      setToken(response.token);
      setRider(response.rider);
      setUserRole('rider');

      console.log('✅ Rider login successful for:', response.rider.email);
      return true;
    } catch (error: any) {
      console.error('❌ Rider login error:', error);
      throw new Error(error.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const riderRegister = async (riderData: RiderRegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('📝 Attempting rider registration for:', riderData.email);
      
      const response = await riderRegisterApi(riderData);
      console.log('✅ Rider registration response received:', response);

      // Save token and rider data
      await StorageService.saveToken(response.token);
      await StorageService.setItem('rider', response.rider);
      await StorageService.setItem('userRole', 'rider');

      setToken(response.token);
      setRider(response.rider);
      setUserRole('rider');

      console.log('✅ Rider registration successful for:', response.rider.email);
      return true;
    } catch (error: any) {
      console.error('❌ Rider registration error:', error);
      throw new Error(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await StorageService.logout();
      await StorageService.removeItem('userRole');
      await StorageService.removeItem('rider');
      setToken(null);
      setUser(null);
      setRider(null);
      setUserRole(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      StorageService.saveUser(updatedUser);
    }
  };

  const refreshUser = async () => {
    try {
      if (!token) return;
      
      const currentUser = await apiService.getCurrentUser();
      setUser(currentUser);
      await StorageService.saveUser(currentUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    rider,
    token,
    isLoading,
    isAuthenticated: !!token && (!!user || !!rider),
    userRole,
    login,
    register,
    riderLogin,
    riderRegister,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
