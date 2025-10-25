import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import { apiService } from '../services/api';
import { User } from '../types';

interface ProfileScreenProps {
  navigation?: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await StorageService.getUser();
      if (userData) {
        setUser(userData);
        setEditedUser(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editedUser) return;

    try {
      setLoading(true);
      
      // Validate form
      if (!editedUser.username.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      if (!editedUser.email.trim()) {
        Alert.alert('Error', 'Please enter your email');
        return;
      }
      if (!editedUser.phone?.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }

      // Check if backend is available
      const connected = await apiService.checkConnection();
      
      if (connected) {
        // Try to update on backend
        try {
          const response = await apiService.getCurrentUser();
          // Update user data with backend response
          await StorageService.saveUser({ ...response, ...editedUser });
        } catch (error) {
          console.log('Backend update failed, saving locally');
        }
      }

      // Save locally
      await StorageService.saveUser(editedUser);
      setUser(editedUser);
      setEditMode(false);
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await StorageService.logout();
            // The AuthNavigation component will automatically detect the logout
            // and redirect to login screen due to the auth state change
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Account deletion will be available soon.');
          },
        },
      ]
    );
  };

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle" size={80} color="#d1d5db" />
          <Text style={styles.errorTitle}>No Profile Data</Text>
          <Text style={styles.errorText}>Please login to view your profile</Text>
          {navigation && (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (editMode) {
                setEditedUser(user);
              }
              setEditMode(!editMode);
            }}
          >
            <Ionicons 
              name={editMode ? "close" : "create"} 
              size={20} 
              color={editMode ? "#ef4444" : "#0066cc"} 
            />
            <Text style={[styles.editButtonText, editMode && styles.editButtonTextCancel]}>
              {editMode ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePicture}>
            <Ionicons name="person" size={60} color="#6b7280" />
          </View>
          <Text style={styles.userName}>{user.username}</Text>
          <View style={styles.userRole}>
            <Text style={styles.userRoleText}>
              {user.role === 'rider' ? 'Rider' : user.role === 'admin' ? 'Admin' : 'Customer'}
            </Text>
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedUser?.username || ''}
                onChangeText={(text) => 
                  setEditedUser(prev => prev ? { ...prev, username: text } : null)
                }
                placeholder="Enter your full name"
                autoCapitalize="words"
              />
            ) : (
              <Text style={styles.valueText}>{user.username}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedUser?.email || ''}
                onChangeText={(text) => 
                  setEditedUser(prev => prev ? { ...prev, email: text.toLowerCase() } : null)
                }
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.valueText}>{user.email}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editedUser?.phone || ''}
                onChangeText={(text) => 
                  setEditedUser(prev => prev ? { ...prev, phone: text } : null)
                }
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.valueText}>{user.phone || 'Not provided'}</Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            {editMode ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedUser?.address || ''}
                onChangeText={(text) => 
                  setEditedUser(prev => prev ? { ...prev, address: text } : null)
                }
                placeholder="Enter your address"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.valueText}>{user.address || 'Not provided'}</Text>
            )}
          </View>

          {editMode && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={24} color="#0066cc" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingSubtitle}>Receive order updates and promotions</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={notificationsEnabled ? '#0066cc' : '#6b7280'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="location" size={24} color="#0066cc" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Location Services</Text>
                <Text style={styles.settingSubtitle}>Enable for better delivery experience</Text>
              </View>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={locationEnabled ? '#0066cc' : '#6b7280'}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="card" size={24} color="#0066cc" />
            <Text style={styles.actionText}>Payment Methods</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="receipt" size={24} color="#0066cc" />
            <Text style={styles.actionText}>Order History</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="help-circle" size={24} color="#0066cc" />
            <Text style={styles.actionText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="document-text" size={24} color="#0066cc" />
            <Text style={styles.actionText}>Terms & Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash" size={24} color="#dc2626" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>GasFill App v1.0.0</Text>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
  editButtonTextCancel: {
    color: '#ef4444',
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  userRole: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#0066cc',
  },
  userRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  valueText: {
    fontSize: 16,
    color: '#374151',
    paddingVertical: 4,
  },
  saveButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  deleteText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default ProfileScreen;