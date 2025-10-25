import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import { CartItem, Order } from '../types';
import NativeIntegrations from '../utils/nativeIntegrations';

interface QuickOrderItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

const QUICK_ORDER_ITEMS: QuickOrderItem[] = [
  { id: '6kg', name: '6kg Cylinder', price: 120, description: 'Portable & safe' },
  { id: '12.5kg', name: '12.5kg Cylinder', price: 220, description: 'Standard household' },
  { id: '37kg', name: '37kg Cylinder', price: 680, description: 'Commercial use' },
];

const HomeScreen: React.FC = () => {
  const [cartCount, setCartCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadCartCount();
    loadRecentOrders();
  }, []);

  const loadCartCount = async () => {
    try {
      const cart = await StorageService.loadCart();
      setCartCount(cart.reduce((sum, item) => sum + item.qty, 0));
    } catch (error) {
      console.error('Error loading cart count:', error);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const orders = await StorageService.loadOrders();
      setRecentOrders(orders.slice(0, 3)); // Show last 3 orders
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  const addToCart = async (item: QuickOrderItem) => {
    try {
      const cart = await StorageService.loadCart();
      const existingItem = cart.find(cartItem => cartItem.id === item.id);

      if (existingItem) {
        existingItem.qty += 1;
      } else {
        cart.push({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
        });
      }

      await StorageService.saveCart(cart);
      setCartCount(cart.reduce((sum, cartItem) => sum + cartItem.qty, 0));
      Alert.alert('Success', `${item.name} added to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const oneClickOrder = (item: QuickOrderItem) => {
    Alert.alert(
      'Quick Order',
      `Order ${item.name} for ₵${item.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Order via WhatsApp', 
          onPress: () => NativeIntegrations.sendOrderViaWhatsApp({
            name: 'Quick Order',
            phone: '',
            product: item.name,
            qty: 1,
            address: 'To be provided',
          })
        },
        { text: 'Add to Cart', onPress: () => addToCart(item) },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#0b5ed7';
      case 'assigned': return '#f59e0b';
      case 'in_transit': return '#8b5cf6';
      case 'delivered': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fbff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>GF</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>GasFill</Text>
            <Text style={styles.brandSubtitle}>Fast • Safe • Premium</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => {/* Navigate to cart */}}
        >
          <Ionicons name="basket-outline" size={24} color="#0b5ed7" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Premium LPG Delivery</Text>
            <Text style={styles.heroSubtitle}>
              Safe, fast cylinder delivery and refill service across Ghana
            </Text>
            <View style={styles.heroActions}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => {/* Navigate to products */}}
              >
                <Text style={styles.primaryButtonText}>Order Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => NativeIntegrations.openWhatsApp()}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#10b981" />
                <Text style={styles.secondaryButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Order Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Order</Text>
          <Text style={styles.sectionSubtitle}>Tap to order instantly</Text>
          
          <View style={styles.quickOrderGrid}>
            {QUICK_ORDER_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickOrderCard}
                onPress={() => oneClickOrder(item)}
              >
                <View style={styles.cylinderIcon}>
                  <Ionicons name="cellular-outline" size={32} color="#0b5ed7" />
                </View>
                <Text style={styles.quickOrderName}>{item.name}</Text>
                <Text style={styles.quickOrderDescription}>{item.description}</Text>
                <Text style={styles.quickOrderPrice}>₵{item.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {recentOrders.map((order: any) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>#{order.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>
                <Text style={styles.orderTotal}>₵{order.total}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt || order.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <View style={styles.contactGrid}>
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => NativeIntegrations.makePhoneCall()}
            >
              <Ionicons name="call-outline" size={24} color="#0b5ed7" />
              <Text style={styles.contactCardTitle}>Call Us</Text>
              <Text style={styles.contactCardSubtitle}>+233 201 022 153</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => NativeIntegrations.openWhatsApp()}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#10b981" />
              <Text style={styles.contactCardTitle}>WhatsApp</Text>
              <Text style={styles.contactCardSubtitle}>Fastest response</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0b5ed7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  hero: {
    margin: 20,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  quickOrderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickOrderCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cylinderIcon: {
    marginBottom: 8,
  },
  quickOrderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickOrderDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  quickOrderPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b5ed7',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b5ed7',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },
  contactCardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default HomeScreen;