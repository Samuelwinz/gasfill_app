import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';

const DeliveryTrackingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [deliveryStatus, setDeliveryStatus] = useState('On the Way');
  const mapRef = useRef<MapView>(null);

  const driverLocation = { latitude: 5.65, longitude: -0.2 };
  const userLocation = { latitude: 5.6, longitude: -0.18 };

  const statusSteps = ['Confirmed', 'On the Way', 'Delivered'];
  const currentStatusIndex = statusSteps.indexOf(deliveryStatus);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Your Delivery</Text>
        <View style={{ width: 24 }} />
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...userLocation,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        provider="google"
        onMapReady={() => {
          mapRef.current?.fitToCoordinates([userLocation, driverLocation], {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }}
      >
        <Marker coordinate={userLocation} title="Your Location">
          <Ionicons name="home" size={30} color="#FF6F00" />
        </Marker>
        <Marker coordinate={driverLocation} title="Driver">
          <View style={styles.driverIconContainer}>
            <Ionicons name="car" size={30} color="#0A2540" />
          </View>
        </Marker>
        <Polyline
          coordinates={[driverLocation, userLocation]}
          strokeColor="#0A2540"
          strokeWidth={3}
          lineDashPattern={[5, 5]}
        />
      </MapView>

      <View style={styles.bottomSheet}>
        <View style={styles.timeContainer}>
          <Text style={styles.etaLabel}>Estimated Arrival</Text>
          <Text style={styles.etaTime}>15 Mins</Text>
        </View>

        <View style={styles.statusContainer}>
          {statusSteps.map((step, index) => (
            <React.Fragment key={step}>
              <View style={styles.statusItem}>
                <View
                  style={[
                    styles.statusDot,
                    index <= currentStatusIndex ? styles.activeDot : {},
                  ]}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    index <= currentStatusIndex ? styles.activeLabel : {},
                  ]}
                >
                  {step}
                </Text>
              </View>
              {index < statusSteps.length - 1 && (
                <View
                  style={[
                    styles.statusLine,
                    index < currentStatusIndex ? styles.activeLine : {},
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.driverContainer}>
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
            style={styles.driverAvatar}
          />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>Kwame Mensah</Text>
            <Text style={styles.driverRating}>⭐️ 4.8 (50+ ratings)</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  map: {
    flex: 1,
  },
  vanIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  driverIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  etaLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  etaTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  activeDot: {
    backgroundColor: '#FF6F00',
  },
  statusLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activeLabel: {
    color: '#0A2540',
    fontWeight: 'bold',
  },
  statusLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: -20,
    transform: [{ translateY: -10 }],
  },
  activeLine: {
    backgroundColor: '#FF6F00',
  },
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  driverRating: {
    fontSize: 14,
    color: '#6B7280',
  },
  callButton: {
    backgroundColor: '#0A2540',
    padding: 12,
    borderRadius: 30,
  },
});

export default DeliveryTrackingScreen;