import * as Location from 'expo-location';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

class GeocodingService {
  /**
   * Geocode an address string to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      console.log('🗺️ Geocoding address:', address);
      
      // Use Expo's built-in geocoding
      const results = await Location.geocodeAsync(address);
      
      if (results && results.length > 0) {
        const location = results[0];
        console.log('✅ Geocoding successful:', location);
        
        // Try to get formatted address via reverse geocoding
        let formattedAddress = address;
        try {
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
          }
        } catch (err) {
          console.warn('⚠️ Reverse geocoding failed:', err);
        }
        
        return {
          lat: location.latitude,
          lng: location.longitude,
          formattedAddress,
        };
      }
      
      console.warn('⚠️ No geocoding results found for address:', address);
      return null;
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to an address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      console.log('🗺️ Reverse geocoding:', lat, lng);
      
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
        return formattedAddress;
      }
      
      console.warn('⚠️ No reverse geocoding results found');
      return null;
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
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
