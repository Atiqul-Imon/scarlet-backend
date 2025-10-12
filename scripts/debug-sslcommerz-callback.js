#!/usr/bin/env node

/**
 * Debug script to test SSLCommerz callback URL caching
 * This will create multiple payment sessions with different callback URLs
 */

import https from 'https';

// Test different callback URL patterns
const testConfigs = [
  {
    name: 'API Routes (Current)',
    successUrl: 'https://www.scarletunlimited.net/api/payments/sslcommerz/success',
    failUrl: 'https://www.scarletunlimited.net/api/payments/sslcommerz/failed',
    cancelUrl: 'https://www.scarletunlimited.net/api/payments/sslcommerz/cancelled'
  },
  {
    name: 'Frontend Pages (Old)',
    successUrl: 'https://www.scarletunlimited.net/payment/success',
    failUrl: 'https://www.scarletunlimited.net/payment/failed',
    cancelUrl: 'https://www.scarletunlimited.net/payment/cancelled'
  },
  {
    name: 'Test URLs',
    successUrl: 'https://httpbin.org/post',
    failUrl: 'https://httpbin.org/post',
    cancelUrl: 'https://httpbin.org/post'
  }
];

const STORE_ID = 'pixel68eaa42983567';
const STORE_PASSWORD = 'pixel68eaa42983567@ssl';
const SANDBOX = true;

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const formData = Object.keys(data)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join('&');
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          resolve({ raw: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(formData);
    req.end();
  });
}

async function testCallbackUrls() {
  console.log('🔍 Testing SSLCommerz Callback URL Caching');
  console.log('==========================================');
  console.log('');

  for (const config of testConfigs) {
    console.log(`📋 Testing: ${config.name}`);
    console.log(`   Success: ${config.successUrl}`);
    console.log(`   Fail: ${config.failUrl}`);
    console.log(`   Cancel: ${config.cancelUrl}`);
    
    const orderId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentData = {
      store_id: STORE_ID,
      store_passwd: STORE_PASSWORD,
      total_amount: '100.00',
      currency: 'BDT',
      tran_id: orderId,
      success_url: config.successUrl,
      fail_url: config.failUrl,
      cancel_url: config.cancelUrl,
      ipn_url: 'https://www.scarletunlimited.net/api/payments/webhook/sslcommerz',
      shipping_method: 'NO',
      cus_name: 'Test User',
      cus_email: 'test@example.com',
      cus_phone: '01234567890',
      cus_add1: 'Test Address',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_postcode: '1000',
      product_name: 'Test Product',
      product_category: 'Beauty',
      product_profile: 'general'
    };

    try {
      const response = await makeRequest('https://sandbox.sslcommerz.com/gwprocess/v4/api.php', paymentData);
      
      if (response.status === 'SUCCESS') {
        console.log(`   ✅ Success: ${response.sessionkey}`);
        console.log(`   🌐 Gateway: ${response.GatewayPageURL}`);
        console.log('');
      } else {
        console.log(`   ❌ Failed: ${response.failedreason}`);
        console.log('');
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
      console.log('');
    }
  }
}

// Run the test
testCallbackUrls();
