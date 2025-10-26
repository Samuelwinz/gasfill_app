import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NotificationPreferences } from '../types';

interface NotificationSettingsScreenProps {
  navigation: any;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    order_updates: true,
    payment_updates: true,
    promotional: true,
    rider_updates: true,
    earnings_updates: true,
    push_enabled: true,
    email_enabled: false,
    sms_enabled: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // TODO: Load from API
      // const response = await apiService.getNotificationPreferences();
      // setPreferences(response.data);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));

    // Auto-save
    try {
      setIsSaving(true);
      // TODO: Call API to save preferences
      // await apiService.updateNotificationPreferences({ ...preferences, [key]: value });
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
      setIsSaving(false);
    }
  };

  const handleTestNotification = () => {
    Alert.alert(
      'Test Notification',
      'A test notification will be sent to your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              // TODO: Call API to send test notification
              // await apiService.sendTestNotification();
              Alert.alert('Success', 'Test notification sent!');
            } catch (error) {
              Alert.alert('Error', 'Failed to send test notification');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Indicator */}
        {isSaving && (
          <View style={styles.savingIndicator}>
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}

        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Channels</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="notifications" size={22} color="#3b82f6" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications on this device
                </Text>
              </View>
              <Switch
                value={preferences.push_enabled}
                onValueChange={(value) => updatePreference('push_enabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={preferences.push_enabled ? '#3b82f6' : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="mail" size={22} color="#3b82f6" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive updates via email
                </Text>
              </View>
              <Switch
                value={preferences.email_enabled}
                onValueChange={(value) => updatePreference('email_enabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={preferences.email_enabled ? '#3b82f6' : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="chatbox" size={22} color="#3b82f6" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive updates via SMS
                </Text>
              </View>
              <Switch
                value={preferences.sms_enabled}
                onValueChange={(value) => updatePreference('sms_enabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={preferences.sms_enabled ? '#3b82f6' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="cart" size={22} color="#10b981" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Order Updates</Text>
                <Text style={styles.settingDescription}>
                  Status changes and tracking updates
                </Text>
              </View>
              <Switch
                value={preferences.order_updates}
                onValueChange={(value) => updatePreference('order_updates', value)}
                trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                thumbColor={preferences.order_updates ? '#10b981' : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="card" size={22} color="#10b981" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Payment Updates</Text>
                <Text style={styles.settingDescription}>
                  Payment confirmations and receipts
                </Text>
              </View>
              <Switch
                value={preferences.payment_updates}
                onValueChange={(value) => updatePreference('payment_updates', value)}
                trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                thumbColor={preferences.payment_updates ? '#10b981' : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="bicycle" size={22} color="#3b82f6" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Rider Updates</Text>
                <Text style={styles.settingDescription}>
                  Rider assignment and location updates
                </Text>
              </View>
              <Switch
                value={preferences.rider_updates}
                onValueChange={(value) => updatePreference('rider_updates', value)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={preferences.rider_updates ? '#3b82f6' : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="cash" size={22} color="#f59e0b" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Earnings Updates</Text>
                <Text style={styles.settingDescription}>
                  Commission and payout notifications
                </Text>
              </View>
              <Switch
                value={preferences.earnings_updates}
                onValueChange={(value) => updatePreference('earnings_updates', value)}
                trackColor={{ false: '#D1D5DB', true: '#FDE68A' }}
                thumbColor={preferences.earnings_updates ? '#f59e0b' : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="gift" size={22} color="#8b5cf6" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Promotional</Text>
                <Text style={styles.settingDescription}>
                  Offers, discounts, and special deals
                </Text>
              </View>
              <Switch
                value={preferences.promotional}
                onValueChange={(value) => updatePreference('promotional', value)}
                trackColor={{ false: '#D1D5DB', true: '#DDD6FE' }}
                thumbColor={preferences.promotional ? '#8b5cf6' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleTestNotification}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="paper-plane-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Send Test Notification</Text>
              <Text style={styles.actionDescription}>
                Check if notifications are working
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Make sure notifications are enabled in your device settings for the best experience.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  savingIndicator: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  savingText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 68,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 32,
  },
});

export default NotificationSettingsScreen;
