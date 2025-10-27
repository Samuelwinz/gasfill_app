import { useState, useEffect, useCallback, useRef } from 'react';
import locationTrackingService, { LocationCoordinates } from '../services/locationTracking';

interface UseLocationTrackingOptions {
  enabled?: boolean;
  intervalMs?: number;
  onLocationUpdate?: (location: LocationCoordinates) => void;
}

interface UseLocationTrackingReturn {
  currentLocation: LocationCoordinates | null;
  isTracking: boolean;
  hasPermission: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  getCurrentLocation: () => Promise<void>;
}

/**
 * Custom hook for location tracking
 * 
 * @example
 * const { currentLocation, startTracking, stopTracking } = useLocationTracking({
 *   enabled: isDelivering,
 *   intervalMs: 10000,
 *   onLocationUpdate: (location) => sendToServer(location),
 * });
 */
export function useLocationTracking(
  options: UseLocationTrackingOptions = {}
): UseLocationTrackingReturn {
  const { enabled = false, intervalMs = 10000, onLocationUpdate } = options;

  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLocationUpdateRef = useRef(onLocationUpdate);

  // Keep ref updated
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const granted = await locationTrackingService.checkPermissions();
      setHasPermission(granted);
    } catch (err) {
      console.error('[useLocationTracking] Check permissions error:', err);
      setHasPermission(false);
    }
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const granted = await locationTrackingService.requestPermissions();
      setHasPermission(granted);
      
      if (!granted) {
        setError('Location permissions were denied');
      }
      
      return granted;
    } catch (err: any) {
      console.error('[useLocationTracking] Request permissions error:', err);
      setError(err.message || 'Failed to request permissions');
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      setError(null);
      const location = await locationTrackingService.getCurrentLocation();
      
      if (location) {
        setCurrentLocation(location);
        if (onLocationUpdateRef.current) {
          onLocationUpdateRef.current(location);
        }
      } else {
        setError('Failed to get current location');
      }
    } catch (err: any) {
      console.error('[useLocationTracking] Get current location error:', err);
      setError(err.message || 'Failed to get location');
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      const success = await locationTrackingService.startTracking(
        (location) => {
          setCurrentLocation(location);
          if (onLocationUpdateRef.current) {
            onLocationUpdateRef.current(location);
          }
        },
        intervalMs
      );

      if (success) {
        setIsTracking(true);
      } else {
        setError('Failed to start tracking');
      }
    } catch (err: any) {
      console.error('[useLocationTracking] Start tracking error:', err);
      setError(err.message || 'Failed to start tracking');
    }
  }, [intervalMs]);

  const stopTracking = useCallback(async () => {
    try {
      setError(null);
      await locationTrackingService.stopTracking();
      setIsTracking(false);
    } catch (err: any) {
      console.error('[useLocationTracking] Stop tracking error:', err);
      setError(err.message || 'Failed to stop tracking');
    }
  }, []);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }

    // Cleanup on unmount
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [enabled]);

  return {
    currentLocation,
    isTracking,
    hasPermission,
    error,
    startTracking,
    stopTracking,
    requestPermissions,
    getCurrentLocation,
  };
}
