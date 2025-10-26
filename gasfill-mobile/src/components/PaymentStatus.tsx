import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PaystackService from '../services/paystack';

interface PaymentStatusProps {
  onStatusChange?: (status: { available: boolean; message: string }) => void;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ onStatusChange }) => {
  const [backendStatus, setBackendStatus] = useState<{
    available: boolean;
    message: string;
    loading: boolean;
  }>({
    available: false,
    message: 'Checking...',
    loading: true,
  });

  const checkBackendStatus = async () => {
    setBackendStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const status = await PaystackService.getBackendStatus();
      setBackendStatus({
        available: status.available,
        message: status.message,
        loading: false,
      });
      
      onStatusChange?.(status);
    } catch (error) {
      setBackendStatus({
        available: false,
        message: 'Failed to check backend status',
        loading: false,
      });
    }
  };

  const showConfiguration = () => {
    const config = PaystackService.getConfiguration();
    Alert.alert(
      'Payment Configuration',
      `Mode: ${config.isDemoMode ? 'Demo' : 'Production'}\n` +
      `Backend: ${config.backendUrl}\n` +
      `Public Key: ${config.publicKey}`,
      [{ text: 'OK' }]
    );
  };

  const startBackendInstructions = () => {
    Alert.alert(
      'Start Payment Backend',
      'To enable real payments:\n\n' +
      '1. Open terminal/command prompt\n' +
      '2. Navigate to backend folder\n' +
      '3. Run: node local-payment-server.js\n' +
      '4. Or double-click start-payment-server.bat\n\n' +
      'Then refresh this status.',
      [
        { text: 'Got it', style: 'default' },
        { text: 'Refresh', onPress: checkBackendStatus }
      ]
    );
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.statusInfo}>
          <Ionicons 
            name={backendStatus.loading ? 'time' : backendStatus.available ? 'checkmark-circle' : 'close-circle'} 
            size={20} 
            color={backendStatus.loading ? '#f59e0b' : backendStatus.available ? '#10b981' : '#ef4444'} 
          />
          <Text style={styles.statusText}>
            {backendStatus.loading ? 'Checking...' : backendStatus.available ? 'Backend Online' : 'Backend Offline'}
          </Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity onPress={checkBackendStatus} style={styles.refreshButton}>
            <Ionicons name="refresh" size={16} color="#6b7280" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={showConfiguration} style={styles.infoButton}>
            <Ionicons name="information-circle" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.statusMessage}>{backendStatus.message}</Text>
      
      {!backendStatus.available && !backendStatus.loading && (
        <TouchableOpacity onPress={startBackendInstructions} style={styles.helpButton}>
          <Text style={styles.helpButtonText}>How to start backend?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    padding: 4,
  },
  infoButton: {
    padding: 4,
  },
  statusMessage: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  helpButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  helpButtonText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },
});

export default PaymentStatus;