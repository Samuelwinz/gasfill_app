import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { Rider, RefillOutlet, Commission, AdminStats, Payout } from '../types';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'riders' | 'outlets' | 'commissions' | 'payouts'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [outlets, setOutlets] = useState<RefillOutlet[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<RefillOutlet | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        await loadStats();
      } else if (activeTab === 'riders') {
        await loadRiders();
      } else if (activeTab === 'outlets') {
        await loadOutlets();
      } else if (activeTab === 'commissions') {
        await loadCommissions();
      } else if (activeTab === 'payouts') {
        await loadPayouts();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Mock data - in real app, fetch from API
    const mockStats: AdminStats = {
      total_pickups: 1247,
      active_riders: 23,
      total_revenue: 45680.50,
      pending_payouts: 8750.25,
      pickups_today: 15,
      average_rating: 4.7,
    };
    setStats(mockStats);
  };

  const loadRiders = async () => {
    // Mock data - in real app, fetch from API
    const mockRiders: Rider[] = [
      {
        id: 1,
        user_id: 101,
        name: 'Kwame Asante',
        email: 'kwame@example.com',
        phone: '+233241234567',
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
        is_available: true,
      },
      {
        id: 2,
        user_id: 102,
        name: 'Akosua Mensah',
        email: 'akosua@example.com',
        phone: '+233241234568',
        vehicle_type: 'Bicycle',
        vehicle_number: 'GR-5678-CD',
        license_number: 'DL-123456',
        status: 'active',
        rating: 4.9,
        total_pickups: 203,
        total_earnings: 3125.75,
        wallet_balance: 892.30,
        commission_rate: 15,
        created_at: '2023-02-10',
        is_available: false,
      },
    ];
    setRiders(mockRiders);
  };

  const loadOutlets = async () => {
    // Mock data - in real app, fetch from API
    const mockOutlets: RefillOutlet[] = [
      {
        id: 1,
        name: 'Total Gas Station - Airport',
        address: '123 Airport Road, Accra',
        phone: '+233302123456',
        location: { latitude: 5.6037, longitude: -0.1870 },
        operating_hours: '6:00 AM - 10:00 PM',
        commission_rate: 5,
        cylinder_types: ['6kg', '12.5kg', '14.5kg'],
        is_active: true,
      },
      {
        id: 2,
        name: 'Shell Gas Center - East Legon',
        address: '45 East Legon Road, Accra',
        phone: '+233302123457',
        location: { latitude: 5.6500, longitude: -0.1500 },
        operating_hours: '24 Hours',
        commission_rate: 8,
        cylinder_types: ['6kg', '12.5kg', '14.5kg', '50kg'],
        is_active: true,
      },
    ];
    setOutlets(mockOutlets);
  };

  const loadCommissions = async () => {
    // Mock data - in real app, fetch from API
    const mockCommissions: Commission[] = [
      {
        id: 1,
        rider_id: 1,
        pickup_request_id: 'pickup-001',
        amount: 51.00,
        percentage: 15,
        status: 'paid',
        created_at: '2024-01-20T10:30:00Z',
        paid_at: '2024-01-20T18:45:00Z',
      },
      {
        id: 2,
        rider_id: 2,
        pickup_request_id: 'pickup-002',
        amount: 28.50,
        percentage: 15,
        status: 'pending',
        created_at: '2024-01-21T14:15:00Z',
      },
    ];
    setCommissions(mockCommissions);
  };

  const loadPayouts = async () => {
    // Mock data - in real app, fetch from API
    const mockPayouts: Payout[] = [
      {
        id: 1,
        rider_id: 1,
        amount: 500.00,
        method: 'mobile_money',
        account_details: '+233241234567',
        status: 'completed',
        transaction_id: 'TXN-123456',
        created_at: '2024-01-20T09:00:00Z',
        processed_at: '2024-01-20T09:15:00Z',
      },
      {
        id: 2,
        rider_id: 2,
        amount: 750.00,
        method: 'bank_transfer',
        account_details: 'GTB-1234567890',
        status: 'pending',
        created_at: '2024-01-21T16:30:00Z',
      },
    ];
    setPayouts(mockPayouts);
  };

  const updateRiderStatus = async (riderId: number, status: string) => {
    try {
      // Update rider status in API
      // await ApiService.updateRiderStatus(riderId, status);
      
      setRiders(riders.map(rider => 
        rider.id === riderId ? { ...rider, status: status as any } : rider
      ));
      
      Alert.alert('Success', 'Rider status updated successfully');
    } catch (error) {
      console.error('Error updating rider status:', error);
      Alert.alert('Error', 'Failed to update rider status');
    }
  };

  const processPayout = async (payoutId: number) => {
    try {
      // Process payout in API
      // await ApiService.processPayout(payoutId);
      
      setPayouts(payouts.map(payout => 
        payout.id === payoutId 
          ? { ...payout, status: 'processing', processed_at: new Date().toISOString() }
          : payout
      ));
      
      Alert.alert('Success', 'Payout is being processed');
    } catch (error) {
      console.error('Error processing payout:', error);
      Alert.alert('Error', 'Failed to process payout');
    }
  };

  const TabButton: React.FC<{ 
    id: string; 
    title: string; 
    icon: string; 
    active: boolean; 
    onPress: () => void 
  }> = ({ id, title, icon, active, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.activeTabButton]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={active ? '#0b5ed7' : '#6b7280'} 
      />
      <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="receipt-outline" size={24} color="#0b5ed7" />
            <Text style={styles.statValue}>{stats?.total_pickups}</Text>
          </View>
          <Text style={styles.statLabel}>Total Pickups</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="people-outline" size={24} color="#10b981" />
            <Text style={styles.statValue}>{stats?.active_riders}</Text>
          </View>
          <Text style={styles.statLabel}>Active Riders</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="cash-outline" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>₵{stats?.total_revenue.toFixed(2)}</Text>
          </View>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="wallet-outline" size={24} color="#ef4444" />
            <Text style={styles.statValue}>₵{stats?.pending_payouts.toFixed(2)}</Text>
          </View>
          <Text style={styles.statLabel}>Pending Payouts</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="today-outline" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{stats?.pickups_today}</Text>
          </View>
          <Text style={styles.statLabel}>Today's Pickups</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="star-outline" size={24} color="#06b6d4" />
            <Text style={styles.statValue}>{stats?.average_rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderRiders = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Riders ({riders.length})</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Rider</Text>
        </TouchableOpacity>
      </View>
      
      {riders.map((rider) => (
        <TouchableOpacity
          key={rider.id}
          style={styles.listItem}
          onPress={() => {
            setSelectedRider(rider);
            setShowRiderModal(true);
          }}
        >
          <View style={styles.listItemContent}>
            <View>
              <Text style={styles.listItemTitle}>{rider.name}</Text>
              <Text style={styles.listItemSubtitle}>
                {rider.vehicle_type} • {rider.total_pickups} pickups
              </Text>
              <Text style={styles.listItemDetails}>
                Rating: {rider.rating.toFixed(1)} • Balance: ₵{rider.wallet_balance.toFixed(2)}
              </Text>
            </View>
            <View style={styles.listItemActions}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: rider.status === 'active' ? '#10b981' : '#ef4444' }
              ]}>
                <Text style={styles.statusText}>{rider.status.toUpperCase()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderOutlets = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gas Outlets ({outlets.length})</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Outlet</Text>
        </TouchableOpacity>
      </View>
      
      {outlets.map((outlet) => (
        <TouchableOpacity
          key={outlet.id}
          style={styles.listItem}
          onPress={() => {
            setSelectedOutlet(outlet);
            setShowOutletModal(true);
          }}
        >
          <View style={styles.listItemContent}>
            <View>
              <Text style={styles.listItemTitle}>{outlet.name}</Text>
              <Text style={styles.listItemSubtitle}>{outlet.address}</Text>
              <Text style={styles.listItemDetails}>
                Commission: {outlet.commission_rate}% • {outlet.operating_hours}
              </Text>
            </View>
            <View style={styles.listItemActions}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: outlet.is_active ? '#10b981' : '#ef4444' }
              ]}>
                <Text style={styles.statusText}>
                  {outlet.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderCommissions = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Commission Tracking</Text>
      </View>
      
      {commissions.map((commission) => {
        const rider = riders.find(r => r.id === commission.rider_id);
        return (
          <View key={commission.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <View>
                <Text style={styles.listItemTitle}>
                  {rider?.name || 'Unknown Rider'}
                </Text>
                <Text style={styles.listItemSubtitle}>
                  Job #{commission.pickup_request_id}
                </Text>
                <Text style={styles.listItemDetails}>
                  {commission.percentage}% commission • {new Date(commission.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.listItemActions}>
                <Text style={styles.commissionAmount}>₵{commission.amount.toFixed(2)}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: commission.status === 'paid' ? '#10b981' : '#f59e0b' }
                ]}>
                  <Text style={styles.statusText}>{commission.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderPayouts = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rider Payouts</Text>
      </View>
      
      {payouts.map((payout) => {
        const rider = riders.find(r => r.id === payout.rider_id);
        return (
          <View key={payout.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <View>
                <Text style={styles.listItemTitle}>
                  {rider?.name || 'Unknown Rider'}
                </Text>
                <Text style={styles.listItemSubtitle}>
                  {payout.method.replace('_', ' ').toUpperCase()} • {payout.account_details}
                </Text>
                <Text style={styles.listItemDetails}>
                  {new Date(payout.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.listItemActions}>
                <Text style={styles.payoutAmount}>₵{payout.amount.toFixed(2)}</Text>
                <View style={[
                  styles.statusBadge,
                  { 
                    backgroundColor: 
                      payout.status === 'completed' ? '#10b981' :
                      payout.status === 'processing' ? '#f59e0b' : '#6b7280'
                  }
                ]}>
                  <Text style={styles.statusText}>{payout.status.toUpperCase()}</Text>
                </View>
                {payout.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.processButton}
                    onPress={() => processPayout(payout.id)}
                  >
                    <Text style={styles.processButtonText}>Process</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TabButton
            id="overview"
            title="Overview"
            icon="analytics-outline"
            active={activeTab === 'overview'}
            onPress={() => setActiveTab('overview')}
          />
          <TabButton
            id="riders"
            title="Riders"
            icon="people-outline"
            active={activeTab === 'riders'}
            onPress={() => setActiveTab('riders')}
          />
          <TabButton
            id="outlets"
            title="Outlets"
            icon="business-outline"
            active={activeTab === 'outlets'}
            onPress={() => setActiveTab('outlets')}
          />
          <TabButton
            id="commissions"
            title="Commissions"
            icon="cash-outline"
            active={activeTab === 'commissions'}
            onPress={() => setActiveTab('commissions')}
          />
          <TabButton
            id="payouts"
            title="Payouts"
            icon="wallet-outline"
            active={activeTab === 'payouts'}
            onPress={() => setActiveTab('payouts')}
          />
        </ScrollView>
      </View>

      <View style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'riders' && renderRiders()}
        {activeTab === 'outlets' && renderOutlets()}
        {activeTab === 'commissions' && renderCommissions()}
        {activeTab === 'payouts' && renderPayouts()}
      </View>

      {/* Rider Detail Modal */}
      <Modal
        visible={showRiderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rider Details</Text>
            <TouchableOpacity onPress={() => setShowRiderModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          {selectedRider && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Personal Information</Text>
                <Text style={styles.modalText}>{selectedRider.name}</Text>
                <Text style={styles.modalSubtext}>{selectedRider.email}</Text>
                <Text style={styles.modalSubtext}>{selectedRider.phone}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Vehicle Information</Text>
                <Text style={styles.modalText}>{selectedRider.vehicle_type}</Text>
                <Text style={styles.modalSubtext}>Number: {selectedRider.vehicle_number}</Text>
                <Text style={styles.modalSubtext}>License: {selectedRider.license_number}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Performance</Text>
                <Text style={styles.modalText}>Rating: {selectedRider.rating.toFixed(1)}/5.0</Text>
                <Text style={styles.modalSubtext}>Total Pickups: {selectedRider.total_pickups}</Text>
                <Text style={styles.modalSubtext}>Total Earnings: ₵{selectedRider.total_earnings.toFixed(2)}</Text>
                <Text style={styles.modalSubtext}>Wallet Balance: ₵{selectedRider.wallet_balance.toFixed(2)}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Status Management</Text>
                <View style={styles.statusActions}>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#10b981' }]}
                    onPress={() => updateRiderStatus(selectedRider.id, 'active')}
                  >
                    <Text style={styles.statusButtonText}>Activate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#f59e0b' }]}
                    onPress={() => updateRiderStatus(selectedRider.id, 'suspended')}
                  >
                    <Text style={styles.statusButtonText}>Suspend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => updateRiderStatus(selectedRider.id, 'inactive')}
                  >
                    <Text style={styles.statusButtonText}>Deactivate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#eff6ff',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#0b5ed7',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listItem: {
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
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  listItemDetails: {
    fontSize: 12,
    color: '#9ca3af',
  },
  listItemActions: {
    alignItems: 'flex-end',
    gap: 8,
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
  commissionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b5ed7',
  },
  processButton: {
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 12,
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
    marginBottom: 2,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminDashboard;