import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface LocationUpdateCallback {
  (location: LocationCoordinates): void;
}

class LocationTrackingService {
  private subscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;
  private callback: LocationUpdateCallback | null = null;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('[LocationTracking] Requesting permissions...');
      
      // Request foreground permissions first
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('[LocationTracking] Foreground permission denied');
        return false;
      }

      // Request background permissions (only on Android, iOS handles differently)
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.log('[LocationTracking] Background permission denied (optional)');
          // Continue anyway - foreground tracking will still work
        }
      }

      console.log('[LocationTracking] Permissions granted');
      return true;
    } catch (error) {
      console.error('[LocationTracking] Permission request error:', error);
      return false;
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    try {
      const hasPermission = await this.checkPermissions();
      
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.log('[LocationTracking] No permissions for getCurrentLocation');
          return null;
        }
      }

      console.log('[LocationTracking] Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('[LocationTracking] Get current location error:', error);
      return null;
    }
  }

  /**
   * Check if permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[LocationTracking] Check permissions error:', error);
      return false;
    }
  }

  /**
   * Start tracking location with updates
   * @param callback Function to call on each location update
   * @param intervalMs Update interval in milliseconds (default: 10000 = 10 seconds)
   */
  async startTracking(
    callback: LocationUpdateCallback,
    intervalMs: number = 10000
  ): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log('[LocationTracking] Already tracking, stopping previous session');
        await this.stopTracking();
      }

      const hasPermission = await this.checkPermissions();
      
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.log('[LocationTracking] Cannot start tracking without permissions');
          return false;
        }
      }

      this.callback = callback;

      console.log(`[LocationTracking] Starting location tracking (interval: ${intervalMs}ms)`);

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: 10, // Update if moved at least 10 meters
        },
        (location) => {
          const coords: LocationCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          console.log('[LocationTracking] Location update:', {
            lat: coords.latitude.toFixed(6),
            lng: coords.longitude.toFixed(6),
            accuracy: coords.accuracy?.toFixed(2),
            speed: coords.speed?.toFixed(2),
          });

          if (this.callback) {
            this.callback(coords);
          }
        }
      );

      this.isTracking = true;
      console.log('[LocationTracking] Tracking started successfully');
      return true;
    } catch (error) {
      console.error('[LocationTracking] Start tracking error:', error);
      return false;
    }
  }

  /**
   * Stop tracking location
   */
  async stopTracking(): Promise<void> {
    try {
      if (this.subscription) {
        console.log('[LocationTracking] Stopping location tracking');
        this.subscription.remove();
        this.subscription = null;
      }

      this.isTracking = false;
      this.callback = null;
      console.log('[LocationTracking] Tracking stopped');
    } catch (error) {
      console.error('[LocationTracking] Stop tracking error:', error);
    }
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Calculate distance between two coordinates (in meters)
   * Uses Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate ETA based on distance and average speed
   * @param distanceMeters Distance in meters
   * @param averageSpeedKmh Average speed in km/h (default: 30 km/h for urban delivery)
   * @returns ETA in minutes
   */
  calculateETA(distanceMeters: number, averageSpeedKmh: number = 30): number {
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / averageSpeedKmh;
    const timeMinutes = Math.ceil(timeHours * 60);
    return timeMinutes;
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Format ETA for display
   */
  formatETA(minutes: number): string {
    if (minutes < 1) {
      return 'Less than 1 min';
    } else if (minutes === 1) {
      return '1 minute';
    } else if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      } else {
        return `${hours}h ${mins}m`;
      }
    }
  }
}

// Export singleton instance
export default new LocationTrackingService();
