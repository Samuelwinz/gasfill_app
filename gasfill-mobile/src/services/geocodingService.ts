import * as Location from 'expo-location';
import geocodingCacheService from './geocodingCacheService';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

class GeocodingService {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  /**
   * Wait before making next request (rate limiting)
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
  }

  /**
   * Geocode an address string to coordinates (with caching and rate limiting)
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      console.log('🗺️ Geocoding address:', address);
      
      // Check cache first
      const cached = await geocodingCacheService.getGeocode(address);
      if (cached) {
        console.log('✅ Using cached geocode result');
        
        // Get formatted address from reverse geocode cache
        const formattedAddress = await geocodingCacheService.getReverseGeocode(
          cached.latitude,
          cached.longitude
        ) || address;
        
        return {
          lat: cached.latitude,
          lng: cached.longitude,
          formattedAddress,
        };
      }

      // Rate limit API requests
      await this.waitForRateLimit();
      
      // Use Expo's built-in geocoding
      const results = await Location.geocodeAsync(address);
      
      if (results && results.length > 0) {
        const location = results[0];
        console.log('✅ Geocoding successful:', location);
        
        // Cache the result immediately
        await geocodingCacheService.setGeocode(
          address,
          location.latitude,
          location.longitude
        );
        
        // Try to get formatted address via reverse geocoding
        let formattedAddress = address;
        try {
          // Rate limit this request too
          await this.waitForRateLimit();
          
          const reverseResults = await Location.reverseGeocodeAsync({
            latitude: location.latitude,
            longitude: location.longitude,
          });
          
          if (reverseResults && reverseResults.length > 0) {
            const addr = reverseResults[0];
            formattedAddress = [
              addr.name,
              addr.street,
              addr.city,
              addr.region,
              addr.country,
            ]
              .filter(Boolean)
              .join(', ');
            
            // Cache the reverse geocode result
            await geocodingCacheService.setReverseGeocode(
              location.latitude,
              location.longitude,
              formattedAddress
            );
          }
        } catch (err: any) {
          console.warn('⚠️ Reverse geocoding failed:', err.message || err);
          // Use the original address if reverse geocoding fails
        }
        
        return {
          lat: location.latitude,
          lng: location.longitude,
          formattedAddress,
        };
      }
      
      console.warn('⚠️ No geocoding results found for address:', address);
      return null;
    } catch (error: any) {
      if (error.message?.includes('rate limit')) {
        console.error('❌ Geocoding rate limit exceeded - using cache only');
      } else {
        console.error('❌ Geocoding error:', error);
      }
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to an address (with caching and rate limiting)
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      console.log('🗺️ Reverse geocoding:', lat, lng);
      
      // Check cache first
      const cached = await geocodingCacheService.getReverseGeocode(lat, lng);
      if (cached) {
        console.log('✅ Using cached reverse geocode result');
        return cached;
      }

      // Rate limit API requests
      await this.waitForRateLimit();
      
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      
      if (results && results.length > 0) {
        const addr = results[0];
        const formattedAddress = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.country,
        ]
          .filter(Boolean)
          .join(', ');
        
        console.log('✅ Reverse geocoding successful:', formattedAddress);
        
        // Cache the result
        await geocodingCacheService.setReverseGeocode(lat, lng, formattedAddress);
        
        return formattedAddress;
      }
      
      console.warn('⚠️ No reverse geocoding results found');
      return null;
    } catch (error: any) {
      if (error.message?.includes('rate limit')) {
        console.error('❌ Geocoding rate limit exceeded');
        console.log('💡 Showing coordinates instead of address');
      } else {
        console.error('❌ Reverse geocoding error:', error);
      }
      return null;
    }
  }

  /**
   * Validate if coordinates are within Ghana (or your service area)
   */
  isWithinServiceArea(lat: number, lng: number): boolean {
    // Ghana approximate bounds
    const GHANA_BOUNDS = {
      north: 11.1748,
      south: 4.7368,
      east: 1.1991,
      west: -3.2559,
    };
    
    const isWithin = 
      lat >= GHANA_BOUNDS.south &&
      lat <= GHANA_BOUNDS.north &&
      lng >= GHANA_BOUNDS.west &&
      lng <= GHANA_BOUNDS.east;
    
    if (!isWithin) {
      console.warn('⚠️ Location outside service area:', lat, lng);
    }
    
    return isWithin;
  }

  /**
   * Get distance between two coordinates in kilometers
   */
  getDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceInKm: number): string {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)}m`;
    }
    return `${distanceInKm.toFixed(1)}km`;
  }
}

export default new GeocodingService();
