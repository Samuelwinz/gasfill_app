import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import { apiService } from '../services/api';
import { PickupRequest, Rider, Commission } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const RiderDashboard: React.FC = () => {
  const [rider, setRider] = useState<Rider | null>(null);
  const [availableJobs, setAvailableJobs] = useState<PickupRequest[]>([]);
  const [activeJob, setActiveJob] = useState<PickupRequest | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PickupRequest | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'refill'>('pickup');

  useEffect(() => {
    loadRiderData();
    loadAvailableJobs();
    loadEarnings();
  }, []);

  const loadRiderData = async () => {
    try {
      const user = await StorageService.getUser();
      if (user) {
        // Mock rider data - in real app, fetch from API
        const riderData: Rider = {
          id: user.id,
          user_id: user.id,
          name: user.username,
          email: user.email,
          phone: user.phone || '',
          vehicle_type: 'Motorcycle',
          vehicle_number: 'GR-1234-AB',
          license_number: 'DL-567890',
          status: 'active',
          rating: 4.8,
          total_pickups: 156,
          total_earnings: 2450.50,
          wallet_balance: 650.25,
          commission_rate: 15,
          created_at: '2023-01-15',
          is_available: false,
        };
        setRider(riderData);
        setIsAvailable(riderData.is_available);
      }
    } catch (error) {
      console.error('Error loading rider data:', error);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      // Mock data - in real app, fetch from API
      const jobs: PickupRequest[] = [
        {
          id: 'pickup-001',
          customer_id: 1,
          customer_name: 'John Doe',
          customer_phone: '+233241234567',
          pickup_address: '123 Airport Residential Area, Accra',
          delivery_address: '123 Airport Residential Area, Accra',
          cylinder_type: '12.5kg',
          cylinder_count: 2,
          status: 'pending',
          total_cost: 340,
          commission_amount: 51,
          payment_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'pickup-002',
          customer_id: 2,
          customer_name: 'Mary Asante',
          customer_phone: '+233241234568',
          pickup_address: '45 East Legon, Accra',
          delivery_address: '45 East Legon, Accra',
          cylinder_type: '6kg',
          cylinder_count: 1,
          status: 'pending',
          total_cost: 95,
          commission_amount: 14.25,
          payment_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setAvailableJobs(jobs);
    } catch (error) {
      console.error('Error loading available jobs:', error);
    }
  };

  const loadEarnings = async () => {
    try {
      // Mock earnings data
      setTodayEarnings(125.50);
      setWeeklyEarnings(856.75);
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  };

  const toggleAvailability = async () => {
    try {
      setLoading(true);
      const newStatus = !isAvailable;
      
      // Update availability in API
      // await ApiService.updateRiderAvailability(rider!.id, newStatus);
      
      setIsAvailable(newStatus);
      
      if (rider) {
        setRider({ ...rider, is_available: newStatus });
      }
      
      Alert.alert(
        'Status Updated',
        `You are now ${newStatus ? 'available' : 'unavailable'} for pickup jobs`
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability status');
    } finally {
      setLoading(false);
    }
  };

  const acceptJob = async (job: PickupRequest) => {
    try {
      setLoading(true);
      
      // Update job status in API
      // await ApiService.acceptPickupJob(job.id, rider!.id);
      
      setActiveJob({ ...job, status: 'accepted', rider_id: rider!.id });
      setAvailableJobs(availableJobs.filter(j => j.id !== job.id));
      setShowJobModal(false);
      
      Alert.alert('Job Accepted', 'Head to the pickup location to start the job');
    } catch (error) {
      console.error('Error accepting job:', error);
      Alert.alert('Error', 'Failed to accept job');
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (status: string) => {
    if (!activeJob) return;

    try {
      setLoading(true);
      
      // Update job status in API
      // await ApiService.updatePickupJobStatus(activeJob.id, status);
      
      setActiveJob({ ...activeJob, status: status as any });
      
      let message = '';
      switch (status) {
        case 'picked_up':
          message = 'Pickup confirmed! Head to the refill center.';
          break;
        case 'at_refill_center':
          message = 'Arrived at refill center. Please confirm refill completion.';
          break;
        case 'refilled':
          message = 'Refill confirmed! Head to delivery location.';
          break;
        case 'delivered':
          message = 'Job completed successfully! Commission has been added to your wallet.';
          setActiveJob(null);
          loadEarnings(); // Refresh earnings
          break;
      }
      
      if (message) {
        Alert.alert('Status Updated', message);
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      Alert.alert('Error', 'Failed to update job status');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Upload photo and update job
        if (photoType === 'pickup') {
          setActiveJob(prev => prev ? { ...prev, pickup_photo: photoUri } : null);
          updateJobStatus('picked_up');
        } else {
          setActiveJob(prev => prev ? { ...prev, refill_confirmation_photo: photoUri } : null);
          updateJobStatus('refilled');
        }
        
        setShowPhotoModal(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'picked_up': return '#8b5cf6';
      case 'at_refill_center': return '#06b6d4';
      case 'refilled': return '#10b981';
      case 'delivered': return '#22c55e';
      default: return '#6b7280';
    }
  };

  if (!rider) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.riderName}>{rider.name}</Text>
        </View>
        <View style={styles.availabilityToggle}>
          <Text style={styles.toggleLabel}>Available</Text>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            trackColor={{ false: '#e5e7eb', true: '#10b981' }}
            thumbColor={isAvailable ? '#ffffff' : '#f3f4f6'}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₵{todayEarnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₵{weeklyEarnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rider.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Active Job */}
        {activeJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Job</Text>
            <View style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobId}>#{activeJob.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeJob.status) }]}>
                  <Text style={styles.statusText}>{activeJob.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={styles.customerName}>{activeJob.customer_name}</Text>
              <Text style={styles.jobDetails}>
                {activeJob.cylinder_count}x {activeJob.cylinder_type} • ₵{activeJob.commission_amount} commission
              </Text>
              <Text style={styles.address}>{activeJob.pickup_address}</Text>

              <View style={styles.jobActions}>
                {activeJob.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => {
                      setPhotoType('pickup');
                      setShowPhotoModal(true);
                    }}
                  >
                    <Ionicons name="camera" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Confirm Pickup</Text>
                  </TouchableOpacity>
                )}
                
                {activeJob.status === 'picked_up' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => updateJobStatus('at_refill_center')}
                  >
                    <Ionicons name="location" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>At Refill Center</Text>
                  </TouchableOpacity>
                )}
                
                {activeJob.status === 'at_refill_center' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => {
                      setPhotoType('refill');
                      setShowPhotoModal(true);
                    }}
                  >
                    <Ionicons name="camera" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Confirm Refill</Text>
                  </TouchableOpacity>
                )}
                
                {activeJob.status === 'refilled' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => updateJobStatus('delivered')}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Mark Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Available Jobs */}
        {isAvailable && !activeJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Jobs ({availableJobs.length})</Text>
            {availableJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No jobs available right now</Text>
              </View>
            ) : (
              availableJobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => {
                    setSelectedJob(job);
                    setShowJobModal(true);
                  }}
                >
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobId}>#{job.id}</Text>
                    <Text style={styles.commission}>₵{job.commission_amount}</Text>
                  </View>
                  
                  <Text style={styles.customerName}>{job.customer_name}</Text>
                  <Text style={styles.jobDetails}>
                    {job.cylinder_count}x {job.cylinder_type}
                  </Text>
                  <Text style={styles.address}>{job.pickup_address}</Text>
                  
                  <View style={styles.jobFooter}>
                    <Text style={styles.distance}>2.3 km away</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Wallet Balance */}
        <View style={styles.section}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletTitle}>Wallet Balance</Text>
              <TouchableOpacity>
                <Ionicons name="card-outline" size={20} color="#0b5ed7" />
              </TouchableOpacity>
            </View>
            <Text style={styles.walletBalance}>₵{rider.wallet_balance.toFixed(2)}</Text>
            <TouchableOpacity style={styles.withdrawButton}>
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Job Details Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Job Details</Text>
            <TouchableOpacity onPress={() => setShowJobModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          {selectedJob && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer</Text>
                <Text style={styles.modalText}>{selectedJob.customer_name}</Text>
                <Text style={styles.modalSubtext}>{selectedJob.customer_phone}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Job Details</Text>
                <Text style={styles.modalText}>
                  {selectedJob.cylinder_count}x {selectedJob.cylinder_type} Cylinder
                </Text>
                <Text style={styles.modalSubtext}>Total: ₵{selectedJob.total_cost}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Pickup Address</Text>
                <Text style={styles.modalText}>{selectedJob.pickup_address}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Commission</Text>
                <Text style={[styles.modalText, { color: '#10b981', fontSize: 20, fontWeight: '700' }]}>
                  ₵{selectedJob.commission_amount}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => acceptJob(selectedJob)}
                disabled={loading}
              >
                <Text style={styles.acceptButtonText}>
                  {loading ? 'Accepting...' : 'Accept Job'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {photoType === 'pickup' ? 'Confirm Pickup' : 'Confirm Refill'}
            </Text>
            <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.photoModalContent}>
            <Ionicons name="camera" size={64} color="#d1d5db" />
            <Text style={styles.photoModalTitle}>
              Take a photo to confirm {photoType === 'pickup' ? 'pickup' : 'refill completion'}
            </Text>
            <Text style={styles.photoModalSubtext}>
              {photoType === 'pickup' 
                ? 'Take a clear photo of the cylinders you picked up'
                : 'Take a photo of the refilled cylinders or QR code'
              }
            </Text>
            
            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#ffffff" />
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  riderName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  availabilityToggle: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b5ed7',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  commission: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  jobDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  jobActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#0b5ed7',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distance: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  walletCard: {
    backgroundColor: '#0b5ed7',
    padding: 20,
    borderRadius: 12,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  walletBalance: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  withdrawButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#0b5ed7',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  photoModalSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cameraButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RiderDashboard;