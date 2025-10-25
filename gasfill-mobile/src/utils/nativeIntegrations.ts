import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

// Business contact information (from original HTML files)
const BUSINESS_PHONE = '233201022153';
const BUSINESS_EMAIL = 'support@gasfill.example';
const WHATSAPP_BUSINESS_NUMBER = '233201022153';

export class NativeIntegrations {
  // WhatsApp Integration
  static async openWhatsApp(message?: string): Promise<void> {
    try {
      const url = message 
        ? `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}`;
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web browser
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Unable to open WhatsApp');
    }
  }

  // WhatsApp Order Integration (from original g8.html pattern)
  static async sendOrderViaWhatsApp(orderData: {
    name: string;
    phone: string;
    product: string;
    qty: number;
    address: string;
  }): Promise<void> {
    const message = `GasFill Order:
Name: ${orderData.name}
Phone: ${orderData.phone}
Product: ${orderData.product} x${orderData.qty}
Address: ${orderData.address}`;

    await this.openWhatsApp(message);
  }

  // Phone Call Integration
  static async makePhoneCall(phoneNumber?: string): Promise<void> {
    try {
      const number = phoneNumber || BUSINESS_PHONE;
      const url = `tel:${number}`;
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert('Error', 'Unable to make phone call');
    }
  }

  // Email Integration
  static async openEmail(
    email?: string, 
    subject?: string, 
    body?: string
  ): Promise<void> {
    try {
      const recipient = email || BUSINESS_EMAIL;
      let url = `mailto:${recipient}`;
      
      const params = [];
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Email is not supported on this device');
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert('Error', 'Unable to open email');
    }
  }

  // Web Browser Integration
  static async openWebsite(url: string): Promise<void> {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening website:', error);
      Alert.alert('Error', 'Unable to open website');
    }
  }

  // Maps Integration
  static async openMaps(address: string): Promise<void> {
    try {
      const encodedAddress = encodeURIComponent(address);
      
      let url: string;
      if (Platform.OS === 'ios') {
        url = `http://maps.apple.com/?q=${encodedAddress}`;
      } else {
        url = `http://maps.google.com/?q=${encodedAddress}`;
      }
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Maps is not available on this device');
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Unable to open maps');
    }
  }

  // Share Integration
  static async shareOrder(orderData: any): Promise<void> {
    try {
      const message = `My GasFill Order #${orderData.id}
Status: ${orderData.status}
Total: ₵${orderData.total}
Items: ${orderData.items.map((item: any) => `${item.name} x${item.quantity}`).join(', ')}`;

      if (Platform.OS === 'ios') {
        const { Share } = await import('react-native');
        await Share.share({ message });
      } else {
        // For Android, you might want to use a different sharing method
        console.log('Sharing on Android:', message);
      }
    } catch (error) {
      console.error('Error sharing order:', error);
    }
  }

  // Generic URL handling
  static async openURL(url: string): Promise<void> {
    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Unable to open URL');
    }
  }
}

export default NativeIntegrations;