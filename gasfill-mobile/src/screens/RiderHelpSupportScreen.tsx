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

const RiderHelpSupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'Getting Started',
      question: 'How do I start receiving orders?',
      answer: 'Toggle the "Available" switch on your dashboard to start receiving order notifications. Make sure your location services are enabled.',
    },
    {
      id: '2',
      category: 'Getting Started',
      question: 'What are the requirements to become a rider?',
      answer: 'You need a valid driver\'s license, registered vehicle, smartphone with internet, and pass our background verification process.',
    },
    {
      id: '3',
      category: 'Earnings',
      question: 'How are my earnings calculated?',
      answer: 'You earn 15% commission on order value plus a ₵10.00 delivery fee per order. Bonuses are awarded for completing 5+ deliveries daily (₵50) or 25+ weekly (₵200).',
    },
    {
      id: '4',
      category: 'Earnings',
      question: 'When can I request a payout?',
      answer: 'You can request payout when you have at least ₵50.00 in pending earnings. Payouts are processed within 1-2 business days.',
    },
    {
      id: '5',
      category: 'Earnings',
      question: 'Can I modify my payout request?',
      answer: 'Yes! You can modify the amount or cancel a pending payout request before it\'s approved by admin.',
    },
    {
      id: '6',
      category: 'Orders',
      question: 'What happens if I reject an order?',
      answer: 'Rejecting orders affects your acceptance rate. Maintain a high acceptance rate to receive more order assignments.',
    },
    {
      id: '7',
      category: 'Orders',
      question: 'How do I mark an order as delivered?',
      answer: 'Navigate to the order details, tap "Update Status", and select "Delivered". You may need to take a delivery photo for verification.',
    },
    {
      id: '8',
      category: 'Orders',
      question: 'What if a customer is not available?',
      answer: 'Call the customer using the in-app call button. If unreachable after 3 attempts, contact support through this help section.',
    },
    {
      id: '9',
      category: 'Account',
      question: 'How do I update my profile information?',
      answer: 'Go to Account Settings from the dashboard menu. You can update your phone, emergency contact, vehicle number, and area coverage.',
    },
    {
      id: '10',
      category: 'Account',
      question: 'What if I forgot my password?',
      answer: 'On the login screen, tap "Forgot Password" and follow the instructions sent to your registered email.',
    },
    {
      id: '11',
      category: 'Technical',
      question: 'The app is not showing new orders',
      answer: 'Check that you\'re set to "Available" status, have good internet connection, and location services enabled. Try logging out and back in.',
    },
    {
      id: '12',
      category: 'Technical',
      question: 'GPS location is inaccurate',
      answer: 'Enable "High Accuracy" mode in your phone\'s location settings. Restart the app if the issue persists.',
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
        subject: 'Support Request',
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
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          
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

        {/* Emergency Support */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="alert-circle" size={24} color="#ef4444" />
            <Text style={styles.emergencyTitle}>Emergency Support</Text>
          </View>
          <Text style={styles.emergencyText}>
            For urgent issues during delivery (accident, safety concerns), call our 24/7 emergency hotline
          </Text>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => Linking.openURL('tel:+233999000111')}
          >
            <Ionicons name="call" size={20} color="#ffffff" />
            <Text style={styles.emergencyButtonText}>+233 999 000 111</Text>
          </TouchableOpacity>
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
            <Text style={styles.ticketTitle}>Submit a Support Ticket</Text>
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
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <TouchableOpacity onPress={() => copyToClipboard('1.0.0', 'Version')}>
                <Text style={styles.infoValue}>1.0.0</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build Number</Text>
              <TouchableOpacity onPress={() => copyToClipboard('2025.10.30', 'Build number')}>
                <Text style={styles.infoValue}>2025.10.30</Text>
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
  emergencyCard: {
    backgroundColor: '#fee2e2',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
  },
  emergencyText: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 12,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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

export default RiderHelpSupportScreen;
