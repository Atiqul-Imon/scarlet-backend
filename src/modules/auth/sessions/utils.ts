import { UAParser } from 'ua-parser-js';

export interface ParsedUserAgent {
  device?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
}

/**
 * Parse user agent string to extract device, browser, and OS info
 */
export function parseUserAgent(userAgent?: string): ParsedUserAgent {
  if (!userAgent) {
    return {};
  }

  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();
  
  // Format device name
  let deviceName: string | undefined;
  if (device.vendor && device.model) {
    deviceName = `${device.vendor} ${device.model}`;
  } else if (device.model) {
    deviceName = device.model;
  } else if (device.type === 'mobile') {
    deviceName = 'Mobile Device';
  } else if (device.type === 'tablet') {
    deviceName = 'Tablet';
  } else {
    // Default to OS info
    deviceName = os.name ? `${os.name} Device` : 'Unknown Device';
  }

  // Format browser name
  const browserName = browser.name && browser.version 
    ? `${browser.name} ${browser.version}`
    : browser.name || 'Unknown Browser';

  // Format OS name
  const osName = os.name && os.version
    ? `${os.name} ${os.version}`
    : os.name || 'Unknown OS';

  return {
    device: deviceName,
    browser: browserName,
    os: osName,
    userAgent
  };
}

/**
 * Get IP address from request (handles proxy/load balancer)
 */
export function getClientIp(req: any): string {
  // Check various headers for real IP (for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection remote address
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Get location from IP address (simple fallback)
 * Note: For production, consider using a geolocation API like ipapi.co or maxmind
 */
export async function getLocationFromIp(ip: string): Promise<{ location?: string; country?: string; city?: string }> {
  // Skip local/private IPs
  if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { location: 'Local Network', country: undefined, city: undefined };
  }

  try {
    // Using free ipapi.co service (1000 requests/day free tier)
    // In production, consider using a paid service or caching results
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'Scarlet-ECommerce-Session-Tracker'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.error) {
        return {};
      }

      const city = data.city || '';
      const country = data.country_name || '';
      const location = city && country ? `${city}, ${country}` : country || city || undefined;

      return { location, country, city };
    }
  } catch (error) {
    // Silently fail - location is optional
    console.warn('Failed to get location from IP:', error);
  }

  return {};
}

