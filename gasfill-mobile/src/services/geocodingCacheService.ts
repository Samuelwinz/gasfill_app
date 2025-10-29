/**
 * Geocoding Cache Service
 * Caches geocoded addresses to reduce API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = '@geocoding_cache:';
const CACHE_EXPIRY_DAYS = 30; // Cache expires after 30 days

interface CachedGeocode {
  address: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface CachedReverseGeocode {
  formattedAddress: string;
  timestamp: number;
}

class GeocodingCacheService {
  /**
   * Get cached geocode result for an address
   */
  async getGeocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const key = `${CACHE_KEY_PREFIX}forward:${address.toLowerCase().trim()}`;
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) {
        return null;
      }

      const data: CachedGeocode = JSON.parse(cached);
      
      // Check if cache has expired
      if (this.isExpired(data.timestamp)) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    } catch (error) {
      console.error('Error reading geocode cache:', error);
      return null;
    }
  }

  /**
   * Cache geocode result
   */
  async setGeocode(address: string, latitude: number, longitude: number): Promise<void> {
    try {
      const key = `${CACHE_KEY_PREFIX}forward:${address.toLowerCase().trim()}`;
      const data: CachedGeocode = {
        address,
        latitude,
        longitude,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving geocode cache:', error);
    }
  }

  /**
   * Get cached reverse geocode result for coordinates
   */
  async getReverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const key = `${CACHE_KEY_PREFIX}reverse:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) {
        return null;
      }

      const data: CachedReverseGeocode = JSON.parse(cached);
      
      // Check if cache has expired
      if (this.isExpired(data.timestamp)) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data.formattedAddress;
    } catch (error) {
      console.error('Error reading reverse geocode cache:', error);
      return null;
    }
  }

  /**
   * Cache reverse geocode result
   */
  async setReverseGeocode(latitude: number, longitude: number, formattedAddress: string): Promise<void> {
    try {
      const key = `${CACHE_KEY_PREFIX}reverse:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const data: CachedReverseGeocode = {
        formattedAddress,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving reverse geocode cache:', error);
    }
  }

  /**
   * Clear all geocoding cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared ${cacheKeys.length} cached geocode entries`);
    } catch (error) {
      console.error('Error clearing geocode cache:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      
      let clearedCount = 0;
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          if (this.isExpired(data.timestamp)) {
            await AsyncStorage.removeItem(key);
            clearedCount++;
          }
        }
      }
      
      if (clearedCount > 0) {
        console.log(`Cleared ${clearedCount} expired geocode entries`);
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ total: number; forward: number; reverse: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      const forwardKeys = cacheKeys.filter(key => key.includes(':forward:'));
      const reverseKeys = cacheKeys.filter(key => key.includes(':reverse:'));

      return {
        total: cacheKeys.length,
        forward: forwardKeys.length,
        reverse: reverseKeys.length,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { total: 0, forward: 0, reverse: 0 };
    }
  }

  // Private methods

  private isExpired(timestamp: number): boolean {
    const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp > expiryMs;
  }
}

export default new GeocodingCacheService();
