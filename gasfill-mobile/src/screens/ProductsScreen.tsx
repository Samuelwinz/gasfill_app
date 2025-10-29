import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import Toast from '../components/Toast';

// Product definitions
const products = [
  { 
    id: '6kg', 
    name: '6kg Gas Cylinder', 
    description: 'Perfect for small households',
    price: 80, 
    category: 'gas-cylinder',
    image: require('../../assets/images/6kg.png')
  },
  { 
    id: '12kg', 
    name: '12.5kg Gas Cylinder', 
    description: 'Most popular size for families',
    price: 150, 
    category: 'gas-cylinder',
    image: require('../../assets/images/12kg.png')
  },
  { 
    id: '15kg', 
    name: '15kg Gas Cylinder', 
    description: 'Large size for heavy usage',
    price: 180, 
    category: 'gas-cylinder',
    image: require('../../assets/images/15kg.png')
  },
];

const ProductsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
  };

  const handleOrderNow = () => {
    if (!selectedSize) {
      setToast({ visible: true, message: 'Please select a cylinder size', type: 'error' });
      return;
    }

    const product = products.find(p => p.id === selectedSize);
    if (product) {
      addToCart(product, 1);
      setToast({ visible: true, message: `${product.name} added to cart!`, type: 'success' });
      
      // Navigate to cart/checkout after a short delay
      setTimeout(() => {
        (navigation as any).navigate('Cart');
      }, 1000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FA" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Gas Cylinder</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sizeGrid}>
          <TouchableOpacity
            style={[
              styles.sizeCard,
              styles.sizeCardBlue,
              selectedSize === '6kg' && styles.selectedCard,
            ]}
            onPress={() => handleSelectSize('6kg')}
          >
            <Image 
              source={products[0].image} 
              style={styles.cylinderImage}
            />
            <Text style={styles.sizeText}>6kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sizeCard,
              styles.sizeCardOrange,
              selectedSize === '12kg' && styles.selectedCard,
            ]}
            onPress={() => handleSelectSize('12kg')}
          >
            <Image 
              source={products[1].image} 
              style={styles.cylinderImage}
            />
            <Text style={styles.sizeText}>12kg</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Cylinder Sizes</Text>

        <View style={styles.bottomGrid}>
          <TouchableOpacity
            style={[
              styles.sizeCardLarge,
              styles.sizeCardYellow,
              selectedSize === '15kg' && styles.selectedCard,
            ]}
            onPress={() => handleSelectSize('15kg')}
          >
            <Image 
              source={products[2].image} 
              style={styles.cylinderImageLarge}
            />
            <Text style={styles.sizeText}>15kg</Text>
          </TouchableOpacity>

          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionCard}>
              <Ionicons name="calendar-outline" size={32} color="#0A2540" />
              <Text style={styles.optionText}>Schedule Refill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionCard}>
              <Text style={styles.priceText}>
                {selectedSize === '6kg' ? 'GH₵ 80.00' : selectedSize === '12kg' ? 'GH₵ 150.00' : selectedSize === '15kg' ? 'GH₵ 180.00' : '—'}
              </Text>
              <Text style={styles.optionText}>Price</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.orderButton} onPress={handleOrderNow}>
          <Text style={styles.orderButtonText}>Order Now</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    paddingHorizontal: 24,
  },
  sizeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sizeCard: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    height: 180,
    justifyContent: 'center',
  },
  sizeCardBlue: {
    backgroundColor: '#4A90E2',
  },
  sizeCardOrange: {
    backgroundColor: '#FF6F00',
  },
  selectedCard: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cylinderImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  cylinderIconContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sizeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2540',
    marginBottom: 16,
  },
  bottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sizeCardLarge: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    height: 220,
    justifyContent: 'center',
  },
  sizeCardYellow: {
    backgroundColor: '#FFC107',
  },
  cylinderImageLarge: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  cylinderIconContainerLarge: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionsContainer: {
    width: '48%',
    justifyContent: 'space-between',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2540',
    marginTop: 8,
  },
  priceText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderButton: {
    backgroundColor: '#FF6F00',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ProductsScreen;