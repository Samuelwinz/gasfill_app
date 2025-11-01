import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Order } from '../types';

// Keys for AsyncStorage (matching the original localStorage keys)
const CART_KEY = 'gasfill_cart_v1';
const ORDERS_KEY = 'gasfill_orders_v1';
const USER_KEY = 'gasfill_user_v1';
const TOKEN_KEY = 'gasfill_token_v1';

export class StorageService {
  // Cart operations
  static async loadCart(): Promise<CartItem[]> {
    try {
      const cartData = await AsyncStorage.getItem(CART_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  }

  static async saveCart(cart: CartItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  static async clearCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CART_KEY);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }

  // Orders operations  
  static async loadOrders(): Promise<Order[]> {
    try {
      const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
      return ordersData ? JSON.parse(ordersData) : [];
    } catch (error) {
      console.error('Error loading orders:', error);
      return [];
    }
  }

  static async saveOrders(orders: Order[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error('Error saving orders:', error);
    }
  }

  static async addOrder(order: Order): Promise<void> {
    try {
      const orders = await this.loadOrders();
      orders.unshift(order); // Add to beginning
      await this.saveOrders(orders);
    } catch (error) {
      console.error('Error adding order:', error);
    }
  }

  // Authentication operations
  static async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  static async saveUser(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  static async getUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  // Generic storage operations
  static async setItem(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      
      // Try to parse as JSON, but if it fails, return the raw string
      try {
        return JSON.parse(value);
      } catch (parseError) {
        // If JSON parse fails, it's likely a plain string value
        // Return it as-is (cast to T for TypeScript)
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}