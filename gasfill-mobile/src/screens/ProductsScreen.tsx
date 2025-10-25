import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import { Product, CartItem } from '../types';

// Products data based on the original g8.html
const PRODUCTS: Product[] = [
  {
    id: '6kg',
    name: '6kg Cylinder',
    description: 'Portable & safe for small households',
    price: 120,
    category: 'Cylinders',
  },
  {
    id: '12.5kg',
    name: '12.5kg Cylinder',
    description: 'Standard household size',
    price: 220,
    category: 'Cylinders',
  },
  {
    id: '37kg',
    name: '37kg Cylinder',
    description: 'Commercial use for restaurants',
    price: 680,
    category: 'Cylinders',
  },
  {
    id: 'regulator',
    name: 'Gas Regulator',
    description: 'High-quality pressure regulator',
    price: 45,
    category: 'Accessories',
  },
  {
    id: 'hose',
    name: 'Gas Hose',
    description: 'Flexible connection hose - 1.5m',
    price: 25,
    category: 'Accessories',
  },
  {
    id: 'detector',
    name: 'Gas Leak Detector',
    description: 'Digital gas leak detection device',
    price: 75,
    category: 'Safety',
  },
];

const CATEGORIES = ['All', 'Cylinders', 'Accessories', 'Safety'];

const ProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadCartCount();
    filterProducts();
  }, [selectedCategory, searchQuery]);

  const loadCartCount = async () => {
    try {
      const cart = await StorageService.loadCart();
      setCartCount(cart.reduce((sum, item) => sum + item.qty, 0));
    } catch (error) {
      console.error('Error loading cart count:', error);
    }
  };

  const filterProducts = () => {
    let filtered = PRODUCTS;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      );
    }

    setProducts(filtered);
  };

  const addToCart = async (product: Product) => {
    try {
      const cart = await StorageService.loadCart();
      const existingItem = cart.find(item => item.id === product.id);

      if (existingItem) {
        existingItem.qty += 1;
      } else {
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
        };
        cart.push(newItem);
      }

      await StorageService.saveCart(cart);
      setCartCount(cart.reduce((sum, item) => sum + item.qty, 0));
      Alert.alert('Success', `${product.name} added to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Cylinders': return 'cellular-outline';
      case 'Accessories': return 'construct-outline';
      case 'Safety': return 'shield-checkmark-outline';
      default: return 'grid-outline';
    }
  };

  const getProductIcon = (productId: string) => {
    if (productId.includes('kg')) return 'cellular-outline';
    if (productId === 'regulator') return 'settings-outline';
    if (productId === 'hose') return 'git-branch-outline';
    if (productId === 'detector') return 'warning-outline';
    return 'cube-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <View style={styles.cartIcon}>
          <Ionicons name="basket-outline" size={24} color="#0b5ed7" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Ionicons
              name={getCategoryIcon(category)}
              size={16}
              color={selectedCategory === category ? '#ffffff' : '#6b7280'}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.productsGrid}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productIcon}>
                <Ionicons
                  name={getProductIcon(product.id)}
                  size={40}
                  color="#0b5ed7"
                />
              </View>
              
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>{product.description}</Text>
              <Text style={styles.productPrice}>₵{product.price}</Text>
              
              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={() => addToCart(product)}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No products found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search or category filter
            </Text>
          </View>
        )}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  cartIcon: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
  },
  categoryContainer: {
    backgroundColor: '#ffffff',
    paddingBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  categoryChipActive: {
    backgroundColor: '#0b5ed7',
    borderColor: '#0b5ed7',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  productCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b5ed7',
    marginBottom: 12,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ProductsScreen;