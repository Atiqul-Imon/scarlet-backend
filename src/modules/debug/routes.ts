import { Router } from 'express';
import https from 'https';
import http from 'http';

const router = Router();

/**
 * Check outbound IP address for debugging SSL Wireless IP whitelisting
 */
async function checkOutboundIP() {
  const services = [
    { name: 'ipify.org', url: 'https://api.ipify.org?format=json', parser: 'json' as const, field: 'ip' },
    { name: 'httpbin.org', url: 'https://httpbin.org/ip', parser: 'json' as const, field: 'origin' },
    { name: 'ifconfig.me', url: 'https://ifconfig.me/ip', parser: 'text' as const },
    { name: 'ipinfo.io', url: 'https://ipinfo.io/ip', parser: 'text' as const }
  ];
  
  const results = [];
  const errors = [];
  
  for (const service of services) {
    try {
      const ip = await getIPFromService(service.url, service.parser, service.field);
      results.push({ service: service.name, ip });
    } catch (error: any) {
      errors.push({ service: service.name, error: error.message });
    }
  }
  
  // Find unique IPs
  const uniqueIPs = [...new Set(results.map(r => r.ip))];
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    currentIP: uniqueIPs[0] || 'Unknown',
    allIPs: uniqueIPs,
    results,
    errors: errors.length > 0 ? errors : undefined
  };
}

function getIPFromService(url: string, parser: 'text' | 'json' = 'text', field: string | null = null): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (parser === 'json') {
            const result = JSON.parse(data);
            resolve(field ? result[field] : result);
          } else {
            resolve(data.trim());
          }
        } catch (parseError: any) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });
    
    req.on('error', (error: any) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// API endpoint to check outbound IP
router.get('/check-ip', async (req, res) => {
  try {
    const result = await checkOutboundIP();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export { router };
