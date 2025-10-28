#!/usr/bin/env node

/**
 * Check outbound IP address for debugging SSL Wireless IP whitelisting
 */

import https from 'https';
import http from 'http';

async function checkOutboundIP() {
  console.log('🔍 Checking outbound IP address...\n');
  
  const services = [
    { name: 'ipify.org', url: 'https://api.ipify.org?format=json', parser: 'json', field: 'ip' },
    { name: 'httpbin.org', url: 'https://httpbin.org/ip', parser: 'json', field: 'origin' },
    { name: 'ifconfig.me', url: 'https://ifconfig.me/ip', parser: 'text' },
    { name: 'ipinfo.io', url: 'https://ipinfo.io/ip', parser: 'text' }
  ];
  
  const results = [];
  
  for (const service of services) {
    try {
      const ip = await getIPFromService(service.url, service.parser, service.field);
      console.log(`📡 IP from ${service.name}:`, ip);
      results.push(ip);
    } catch (error) {
      console.log(`❌ ${service.name}:`, error.message);
    }
  }
  
  // Find unique IPs
  const uniqueIPs = [...new Set(results)];
  
  console.log('\n✅ IP Check Complete!');
  console.log('📋 Current Outbound IP:', uniqueIPs[0] || 'Unknown');
  console.log('📋 All detected IPs:', uniqueIPs.join(', '));
  console.log('\n💡 Use this IP for SSL Wireless whitelisting request');
}

function getIPFromService(url, parser = 'text', field = null) {
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
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Run the check
checkOutboundIP();
