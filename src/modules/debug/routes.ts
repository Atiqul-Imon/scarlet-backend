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
    { name: 'ipinfo.io', url: 'https://ipinfo.io/ip', parser: 'text' as const },
    { name: 'icanhazip.com', url: 'https://icanhazip.com', parser: 'text' as const },
    { name: 'api.my-ip.io', url: 'https://api.my-ip.io/ip', parser: 'text' as const },
    { name: 'checkip.amazonaws.com', url: 'https://checkip.amazonaws.com', parser: 'text' as const },
    { name: 'ip.42.pl', url: 'https://ip.42.pl/raw', parser: 'text' as const }
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
  
  // Check if IPs are Cloudflare IPs
  const cloudflareIPs = uniqueIPs.filter(ip => isCloudflareIP(ip));
  const nonCloudflareIPs = uniqueIPs.filter(ip => !isCloudflareIP(ip));
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    currentIP: uniqueIPs[0] || 'Unknown',
    allIPs: uniqueIPs,
    cloudflareIPs,
    nonCloudflareIPs,
    isUsingCloudflare: cloudflareIPs.length > 0,
    results,
    errors: errors.length > 0 ? errors : undefined
  };
}

function isCloudflareIP(ip: string): boolean {
  // Common Cloudflare IP ranges (simplified check)
  const cloudflareRanges = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/12',
    '172.64.0.0/13',
    '131.0.72.0/22'
  ];
  
  // Simple IP range check (for demonstration)
  // In production, you'd use a proper IP range library
  const ipParts = ip.split('.').map(Number);
  
  // Check some common Cloudflare IP patterns
  if (ipParts[0] === 104 && ipParts[1] >= 16 && ipParts[1] <= 31) return true;
  if (ipParts[0] === 172 && ipParts[1] >= 64 && ipParts[1] <= 79) return true;
  if (ipParts[0] === 173 && ipParts[1] === 245) return true;
  if (ipParts[0] === 103 && ipParts[1] >= 21 && ipParts[1] <= 31) return true;
  if (ipParts[0] === 141 && ipParts[1] === 101) return true;
  if (ipParts[0] === 108 && ipParts[1] === 162) return true;
  if (ipParts[0] === 190 && ipParts[1] === 93) return true;
  if (ipParts[0] === 188 && ipParts[1] === 114) return true;
  if (ipParts[0] === 197 && ipParts[1] === 234) return true;
  if (ipParts[0] === 198 && ipParts[1] === 41) return true;
  if (ipParts[0] === 162 && ipParts[1] === 158) return true;
  if (ipParts[0] === 131 && ipParts[1] === 0) return true;
  
  return false;
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

// API endpoint to test SSL Wireless API and see what IP they see
router.get('/test-ssl-wireless-ip', async (req, res) => {
  try {
    const result = await testSSLWirelessIP();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to check what IP external services see from our outbound requests
router.get('/check-outbound-ip', async (req, res) => {
  try {
    const result = await checkOutboundIPFromExternalServices();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

async function checkOutboundIPFromExternalServices() {
  const services = [
    { name: 'ipify.org', url: 'https://api.ipify.org?format=json', parser: 'json' as const, field: 'ip' },
    { name: 'httpbin.org', url: 'https://httpbin.org/ip', parser: 'json' as const, field: 'origin' },
    { name: 'ifconfig.me', url: 'https://ifconfig.me/ip', parser: 'text' as const },
    { name: 'ipinfo.io', url: 'https://ipinfo.io/ip', parser: 'text' as const },
    { name: 'icanhazip.com', url: 'https://icanhazip.com', parser: 'text' as const }
  ];
  
  const results = [];
  const errors = [];
  
  for (const service of services) {
    try {
      const ip = await getIPFromService(service.url, service.parser, service.field);
      const isCloudflare = isCloudflareIP(ip);
      results.push({ 
        service: service.name, 
        ip, 
        isCloudflare,
        note: isCloudflare ? 'This IP is from Cloudflare' : 'This IP is from Render'
      });
    } catch (error: any) {
      errors.push({ service: service.name, error: error.message });
    }
  }
  
  // Find unique IPs
  const uniqueIPs = [...new Set(results.map(r => r.ip))];
  const cloudflareIPs = uniqueIPs.filter(ip => isCloudflareIP(ip));
  const renderIPs = uniqueIPs.filter(ip => !isCloudflareIP(ip));
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    summary: {
      totalIPs: uniqueIPs.length,
      cloudflareIPs: cloudflareIPs.length,
      renderIPs: renderIPs.length,
      conclusion: cloudflareIPs.length > 0 
        ? 'Outbound requests go through Cloudflare IPs'
        : 'Outbound requests go through Render IPs'
    },
    allIPs: uniqueIPs,
    cloudflareIPs,
    renderIPs,
    results,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function testSSLWirelessIP() {
  const apiToken = process.env.SSL_WIRELESS_API_TOKEN;
  const sid = process.env.SSL_WIRELESS_SID;
  
  if (!apiToken || !sid) {
    return {
      success: false,
      error: 'SSL Wireless credentials not configured',
      timestamp: new Date().toISOString()
    };
  }
  
  // Test with a dummy request to see what IP SSL Wireless sees
  const testData = {
    api_token: apiToken,
    sid: sid,
    msisdn: '8801714918360', // Test phone number
    sms: 'Test message to check IP',
    csms_id: `TEST_${Date.now()}`
  };
  
  try {
    const response = await fetch('https://smsplus.sslwireless.com/api/v3/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw_response: responseText };
    }
    
    // Check if the response indicates IP blacklisting
    const isIPBlacklisted = responseData.status_code === 4003;
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      sslWirelessResponse: responseData,
      statusCode: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      isIPBlacklisted: isIPBlacklisted,
      note: isIPBlacklisted 
        ? 'SSL Wireless sees Cloudflare IPs (Status 4003 = IP Blacklisted)'
        : 'SSL Wireless sees Render IPs (Request successful)'
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      note: 'Failed to test SSL Wireless API'
    };
  }
}

export { router };
