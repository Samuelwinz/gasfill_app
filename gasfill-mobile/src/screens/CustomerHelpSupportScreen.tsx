import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createSupportTicket } from '../services/riderApi';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const CustomerHelpSupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'Orders',
      question: 'How do I place an order?',
      answer: 'Browse products, add items to cart, proceed to checkout, select delivery address, choose payment method, and confirm your order.',
    },
    {
      id: '2',
      category: 'Orders',
      question: 'How can I track my order?',
      answer: 'Go to "Orders" tab to view all your orders. Tap on an active order to see real-time tracking and rider location on the map.',
    },
    {
      id: '3',
      category: 'Orders',
      question: 'Can I cancel my order?',
      answer: 'Yes, you can cancel an order before it\'s picked up by the rider. Go to Order Details and tap "Cancel Order". Refunds are processed within 3-5 business days.',
    },
    {
      id: '4',
      category: 'Orders',
      question: 'What if my cylinder is not refilled properly?',
      answer: 'Contact support immediately through this screen or call our hotline. We offer free re-delivery if there\'s an issue with your cylinder.',
    },
    {
      id: '5',
      category: 'Delivery',
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 30-60 minutes. Express delivery (for premium subscribers) takes 15-30 minutes in most areas.',
    },
    {
      id: '6',
      category: 'Delivery',
      question: 'What are the delivery charges?',
      answer: 'Delivery fees start from ₵10.00 and vary by distance. Subscribers get free delivery on all orders.',
    },
    {
      id: '7',
      category: 'Delivery',
      question: 'Can I change my delivery address?',
      answer: 'Yes, you can update the delivery address before checkout or save multiple addresses in your profile for quick selection.',
    },
    {
      id: '8',
      category: 'Payment',
      question: 'What payment methods are accepted?',
      answer: 'We accept Mobile Money (MTN, Vodafone, AirtelTigo), credit/debit cards, and cash on delivery for verified customers.',
    },
    {
      id: '9',
      category: 'Payment',
      question: 'Is my payment information secure?',
      answer: 'Yes! All payments are processed through secure, encrypted channels. We never store your full card details on our servers.',
    },
    {
      id: '10',
      category: 'Payment',
      question: 'How do refunds work?',
      answer: 'Refunds for cancelled orders are processed within 3-5 business days to your original payment method. Mobile Money refunds are instant.',
    },
    {
      id: '11',
      category: 'Subscriptions',
      question: 'What are the subscription benefits?',
      answer: 'Subscribers get free delivery, priority service, exclusive discounts (5-25% off), express delivery, and flexible refill schedules.',
    },
    {
      id: '12',
      category: 'Subscriptions',
      question: 'Can I cancel my subscription?',
      answer: 'Yes, you can cancel anytime from Subscription Management. Your benefits continue until the end of the current billing period.',
    },
    {
      id: '13',
      category: 'Subscriptions',
      question: 'How do I upgrade my subscription plan?',
      answer: 'Go to Profile → Subscription Plans, select your desired plan (Basic, Pro, or Family), and confirm. Changes take effect immediately.',
    },
    {
      id: '14',
      category: 'Account',
      question: 'How do I reset my password?',
      answer: 'On the login screen, tap "Forgot Password" and follow the instructions sent to your registered email address.',
    },
    {
      id: '15',
      category: 'Account',
      question: 'Can I update my profile information?',
      answer: 'Yes! Go to Profile screen and tap "Edit Profile" to update your name, phone, email, and delivery addresses.',
    },
    {
      id: '16',
      category: 'Safety',
      question: 'What safety measures do you take?',
      answer: 'All riders are background-checked and verified. Cylinders are inspected before delivery. We follow strict safety protocols for handling and transport.',
    },
  ];

  const filteredFAQs = faqs.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const faqCategories = Array.from(new Set(faqs.map(faq => faq.category)));

  const handleContactSupport = (method: 'phone' | 'email' | 'whatsapp') => {
    switch (method) {
      case 'phone':
        Linking.openURL('tel:+233123456789');
        break;
      case 'email':
        Linking.openURL('mailto:support@gasfill.com');
        break;
      case 'whatsapp':
        Linking.openURL('https://wa.me/233123456789');
        break;
    }
  };

  const handleSubmitTicket = async () => {
    if (!supportMessage.trim()) {
      Alert.alert('Error', 'Please enter your message');
      return;
    }

    try {
      setSubmitting(true);
      const response = await createSupportTicket({
        subject: 'Customer Support Request',
        message: supportMessage,
        priority: 'normal',
      });
      
      Alert.alert(
        'Ticket Submitted',
        `Your support request has been submitted (Ticket #${response.ticket_id}). We'll get back to you within ${response.estimated_response}.`,
        [
          {
            text: 'OK',
            onPress: () => setSupportMessage(''),
          },
        ]
      );
    } catch (err: any) {
      console.error('Error submitting ticket:', err);
      Alert.alert('Error', err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          
          <View style={styles.contactGrid}>
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => handleContactSupport('phone')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="call" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.contactLabel}>Call Us</Text>
              <Text style={styles.contactValue}>+233 123 456 789</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => handleContactSupport('whatsapp')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#10b981" />
              </View>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>Chat Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => handleContactSupport('email')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="mail" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@gasfill.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Hours */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <Ionicons name="time-outline" size={24} color="#3b82f6" />
            <Text style={styles.serviceTitle}>Service Hours</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Customer Support:</Text>
            <Text style={styles.serviceValue}>8:00 AM - 8:00 PM (GMT)</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Order Delivery:</Text>
            <Text style={styles.serviceValue}>7:00 AM - 9:00 PM (Daily)</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>Emergency Hotline:</Text>
            <Text style={[styles.serviceValue, { color: '#ef4444', fontWeight: '700' }]}>24/7 Available</Text>
          </View>
        </View>

        {/* FAQ Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search FAQs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* FAQ Categories */}
        {faqCategories.map(category => {
          const categoryFAQs = filteredFAQs.filter(faq => faq.category === category);
          
          if (categoryFAQs.length === 0) return null;
          
          return (
            <View key={category} style={styles.faqCategory}>
              <Text style={styles.categoryTitle}>{category}</Text>
              
              {categoryFAQs.map(faq => (
                <TouchableOpacity
                  key={faq.id}
                  style={styles.faqItem}
                  onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons
                      name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#6b7280"
                    />
                  </View>
                  
                  {expandedFAQ === faq.id && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {filteredFAQs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No FAQs found</Text>
            <Text style={styles.emptyStateSubtext}>Try different search terms</Text>
          </View>
        )}

        {/* Submit Ticket */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          
          <View style={styles.ticketCard}>
            <Text style={styles.ticketTitle}>Contact Customer Support</Text>
            <Text style={styles.ticketDescription}>
              Describe your issue and our team will get back to you within 24 hours
            </Text>
            
            <TextInput
              style={styles.ticketInput}
              placeholder="Describe your issue..."
              value={supportMessage}
              onChangeText={setSupportMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitTicket}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#ffffff" />
              )}
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About GasFill</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <TouchableOpacity onPress={() => copyToClipboard('1.0.0', 'Version')}>
                <Text style={styles.infoValue}>1.0.0</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.infoRow}>
              <Text style={styles.infoLabel}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.infoRow}>
              <Text style={styles.infoLabel}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rate Us</Text>
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 16,
  },
  contactGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  serviceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  serviceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  faqCategory: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  ticketDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  ticketInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 100,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default CustomerHelpSupportScreen;
