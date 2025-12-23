import axios from 'axios';

interface GeoLocation {
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  coordinates?: [number, number];
}

export class GeoService {
  /**
   * Resolve IP address to location using a public API
   * In production, you might want to use MaxMind or a paid service for better reliability
   */
  async resolveIp(ip: string): Promise<GeoLocation | null> {
    try {
      // Don't try to resolve local IPs
      if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
          country: 'Local Network',
          city: 'Internal',
          region: 'Dev',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }

      // Using ip-api.com (Free for non-commercial use, 45 requests/min)
      // For production, replace with your preferred provider
      const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,timezone,lat,lon`);
      
      if (response.data.status === 'success') {
        return {
          country: response.data.country,
          city: response.data.city,
          region: response.data.regionName,
          timezone: response.data.timezone,
          coordinates: [response.data.lon, response.data.lat]
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error resolving IP location:', error);
      return null;
    }
  }
}

export const geoService = new GeoService();
