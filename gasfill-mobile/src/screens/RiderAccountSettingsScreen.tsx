import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { updateRiderProfile, changeRiderPassword, uploadRiderDocuments } from '../services/riderApi';
import { StorageService } from '../utils/storage';
import { getRiderProfile } from '../services/riderApi';
import Loading from '../components/Loading';

// Backend configuration
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.8.100:8000'
  : 'https://your-production-api.com';

const RiderAccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [areaCoverage, setAreaCoverage] = useState('');
  
  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  
  // Document upload states
  const [licensePhoto, setLicensePhoto] = useState<any>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadSettings();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getRiderProfile();
      setProfile(data);
      
      // Populate form fields
      setPhone(data.phone || '');
      setEmergencyContact(data.emergency_contact || '');
      setVehicleNumber(data.vehicle_number || '');
      setAreaCoverage(data.area_coverage || '');
    } catch (err: any) {
      console.error('Error loading profile:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const push = await AsyncStorage.getItem('notifications_push');
      const email = await AsyncStorage.getItem('notifications_email');
      const sms = await AsyncStorage.getItem('notifications_sms');
      
      setPushEnabled(push !== 'false');
      setEmailEnabled(email !== 'false');
      setSmsEnabled(sms === 'true');
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      await updateRiderProfile({
        phone,
        emergency_contact: emergencyContact,
        vehicle_number: vehicleNumber,
        area: areaCoverage,
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => {
          setEditMode(false);
          loadProfile();
        }}
      ]);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
      console.log(`✅ Saved ${key}: ${value}`);
    } catch (err) {
      console.error('Error saving setting:', err);
    }
  };

  const handleChangePassword = () => {
    Alert.prompt(
      'Change Password',
      'Enter your current password',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (currentPassword?: string) => {
            if (!currentPassword) {
              Alert.alert('Error', 'Please enter your current password');
              return;
            }
            
            Alert.prompt(
              'New Password',
              'Enter your new password',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Change',
                  onPress: async (newPassword?: string) => {
                    if (!newPassword || newPassword.length < 6) {
                      Alert.alert('Error', 'Password must be at least 6 characters');
                      return;
                    }
                    
                    try {
                      await changeRiderPassword(currentPassword, newPassword);
                      Alert.alert('Success', 'Password changed successfully');
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Failed to change password');
                    }
                  }
                }
              ],
              'secure-text'
            );
          }
        }
      ],
      'secure-text'
    );
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
            try {
              await AsyncStorage.multiRemove(['token', 'userRole', 'rider_status']);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' as never }],
              });
            } catch (err) {
              console.error('Error during logout:', err);
            }
          }
        }
      ]
    );
  };

  const pickImage = async (type: 'license' | 'vehicle') => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload documents.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (type === 'license') {
          setLicensePhoto(result.assets[0]);
        } else {
          setVehiclePhoto(result.assets[0]);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUploadDocuments = async () => {
    if (!licensePhoto && !vehiclePhoto) {
      Alert.alert('No Documents', 'Please select at least one document to upload');
      return;
    }

    Alert.alert(
      'Upload Documents',
      'Upload these documents for verification? Your account will be reviewed by our team.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            try {
              setUploading(true);
              
              await uploadRiderDocuments(licensePhoto, vehiclePhoto);
              
              Alert.alert(
                'Success',
                'Documents uploaded successfully! Your account is now pending verification.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setLicensePhoto(null);
                      setVehiclePhoto(null);
                      loadProfile(); // Refresh to show updated status
                    }
                  }
                ]
              );
            } catch (err: any) {
              console.error('Error uploading documents:', err);
              Alert.alert('Error', err.response?.data?.detail || 'Failed to upload documents');
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return <Loading message="Loading account settings..." />;
  }

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
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <TouchableOpacity
              onPress={() => editMode ? handleSaveProfile() : setEditMode(true)}
              disabled={saving}
            >
              <Text style={styles.editButton}>
                {saving ? 'Saving...' : editMode ? 'Save' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={40} color="#ffffff" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.username}</Text>
                <Text style={styles.profileEmail}>{profile?.email}</Text>
                <View style={styles.verificationBadge}>
                  <Ionicons
                    name={profile?.is_verified ? "checkmark-circle" : "alert-circle"}
                    size={16}
                    color={profile?.is_verified ? "#10b981" : "#f59e0b"}
                  />
                  <Text style={[
                    styles.verificationText,
                    { color: profile?.is_verified ? "#10b981" : "#f59e0b" }
                  ]}>
                    {profile?.is_verified ? "Verified" : "Pending Verification"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Editable Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={phone}
                onChangeText={setPhone}
                editable={editMode}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Emergency Contact</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                editable={editMode}
                keyboardType="phone-pad"
                placeholder="Emergency contact number"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle Number</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                editable={editMode}
                placeholder="Vehicle registration number"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Area Coverage</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={areaCoverage}
                onChangeText={setAreaCoverage}
                editable={editMode}
                placeholder="Service area coverage"
              />
            </View>

            {/* Read-only Fields */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License Number:</Text>
              <Text style={styles.infoValue}>{profile?.license_number}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle Type:</Text>
              <Text style={styles.infoValue}>{profile?.vehicle_type}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Deliveries:</Text>
              <Text style={styles.infoValue}>{profile?.total_deliveries || 0}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Success Rate:</Text>
              <Text style={styles.infoValue}>
                {profile?.total_deliveries > 0
                  ? `${((profile?.successful_deliveries / profile?.total_deliveries) * 100).toFixed(1)}%`
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Document Verification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Documents</Text>
          
          <View style={styles.documentCard}>
            {/* Current Status */}
            <View style={styles.statusBanner}>
              <Ionicons
                name={
                  profile?.document_status === 'approved' ? 'checkmark-circle' :
                  profile?.document_status === 'rejected' ? 'close-circle' :
                  'time'
                }
                size={20}
                color={
                  profile?.document_status === 'approved' ? '#10b981' :
                  profile?.document_status === 'rejected' ? '#ef4444' :
                  '#f59e0b'
                }
              />
              <Text style={[
                styles.statusText,
                {
                  color:
                    profile?.document_status === 'approved' ? '#10b981' :
                    profile?.document_status === 'rejected' ? '#ef4444' :
                    '#f59e0b'
                }
              ]}>
                {profile?.document_status === 'approved' ? 'Documents Approved' :
                 profile?.document_status === 'rejected' ? 'Documents Rejected' :
                 'Pending Verification'}
              </Text>
            </View>

            {/* License Photo */}
            <View style={styles.documentUpload}>
              <View style={styles.documentHeader}>
                <Ionicons name="card" size={20} color="#6b7280" />
                <Text style={styles.documentLabel}>License Photo</Text>
              </View>
              
              {(licensePhoto || profile?.license_photo_url) ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: licensePhoto?.uri || `${API_BASE_URL}${profile?.license_photo_url}` }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  {licensePhoto && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setLicensePhoto(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('license')}
                >
                  <Ionicons name="cloud-upload" size={24} color="#3b82f6" />
                  <Text style={styles.uploadButtonText}>Upload License</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Vehicle Photo */}
            <View style={styles.documentUpload}>
              <View style={styles.documentHeader}>
                <Ionicons name="bicycle" size={20} color="#6b7280" />
                <Text style={styles.documentLabel}>Vehicle Photo</Text>
              </View>
              
              {(vehiclePhoto || profile?.vehicle_photo_url) ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: vehiclePhoto?.uri || `${API_BASE_URL}${profile?.vehicle_photo_url}` }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  {vehiclePhoto && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setVehiclePhoto(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('vehicle')}
                >
                  <Ionicons name="cloud-upload" size={24} color="#3b82f6" />
                  <Text style={styles.uploadButtonText}>Upload Vehicle Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Upload Button */}
            {(licensePhoto || vehiclePhoto) && (
              <TouchableOpacity
                style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
                onPress={handleUploadDocuments}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Submit for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Rejection Note */}
            {profile?.document_status === 'rejected' && profile?.verification_notes && (
              <View style={styles.rejectionNote}>
                <Ionicons name="information-circle" size={20} color="#ef4444" />
                <Text style={styles.rejectionText}>{profile.verification_notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={24} color="#3b82f6" />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    New orders and updates
                  </Text>
                </View>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={(value) => {
                  setPushEnabled(value);
                  handleSaveSettings('notifications_push', value);
                }}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={pushEnabled ? '#3b82f6' : '#f3f4f6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail" size={24} color="#10b981" />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Email Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Weekly reports and updates
                  </Text>
                </View>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={(value) => {
                  setEmailEnabled(value);
                  handleSaveSettings('notifications_email', value);
                }}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={emailEnabled ? '#10b981' : '#f3f4f6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="chatbubbles" size={24} color="#f59e0b" />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>SMS Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Important updates only
                  </Text>
                </View>
              </View>
              <Switch
                value={smsEnabled}
                onValueChange={(value) => {
                  setSmsEnabled(value);
                  handleSaveSettings('notifications_sms', value);
                }}
                trackColor={{ false: '#d1d5db', true: '#fcd34d' }}
                thumbColor={smsEnabled ? '#f59e0b' : '#f3f4f6'}
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleChangePassword}
          >
            <Ionicons name="lock-closed" size={24} color="#3b82f6" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Change Password</Text>
              <Text style={styles.actionDescription}>
                Update your account password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={[styles.actionCard, styles.dangerCard]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color="#ef4444" />
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, styles.dangerText]}>Logout</Text>
              <Text style={styles.actionDescription}>
                Sign out of your account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingCard: {
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  dangerText: {
    color: '#ef4444',
  },
  bottomSpacer: {
    height: 40,
  },
  // Document Upload Styles
  documentCard: {
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  documentUpload: {
    marginBottom: 16,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    color: '#ef4444',
    lineHeight: 18,
  },
});

export default RiderAccountSettingsScreen;
