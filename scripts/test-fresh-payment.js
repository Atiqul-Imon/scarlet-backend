#!/usr/bin/env node

/**
 * Test script to create a fresh SSLCommerz payment session
 * This will force SSLCommerz to use the updated callback URLs
 */

import https from 'https';
import crypto from 'crypto';

// SSLCommerz configuration
const STORE_ID = 'pixel68eaa42983567';
const STORE_PASSWORD = 'pixel68eaa42983567@ssl';
const SANDBOX = true;

// Updated callback URLs (API routes)
const SUCCESS_URL = 'https://www.scarletunlimited.net/api/payments/sslcommerz/success';
const FAIL_URL = 'https://www.scarletunlimited.net/api/payments/sslcommerz/failed';
const CANCEL_URL = 'https://www.scarletunlimited.net/api/payments/sslcommerz/cancelled';
const IPN_URL = 'https://www.scarletunlimited.net/api/payments/webhook/sslcommerz';

// SSLCommerz API URLs
const SSLCOMMERZ_URL = SANDBOX 
  ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
  : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

function createHash(data) {
  return crypto.createHash('sha512').update(data).digest('hex');
}

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    // Convert data to form-encoded format
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

async function testFreshPayment() {
  try {
    console.log('🧪 Testing Fresh SSLCommerz Payment Session');
    console.log('==========================================');
    
    // Generate unique order ID
    const orderId = `test-${Date.now()}`;
    const amount = 100.00;
    const currency = 'BDT';
    
    console.log(`📋 Order ID: ${orderId}`);
    console.log(`💰 Amount: ${amount} ${currency}`);
    console.log('');
    
    // Prepare payment data
    const paymentData = {
      store_id: STORE_ID,
      store_passwd: STORE_PASSWORD,
      total_amount: amount,
      currency: currency,
      tran_id: orderId,
      success_url: SUCCESS_URL,
      fail_url: FAIL_URL,
      cancel_url: CANCEL_URL,
      ipn_url: IPN_URL,
      shipping_method: 'NO',
      multi_card_name: 'brac_visa,dbbl_visa,mastercard,amex,nexus,bkash,dbbl_nexus,rocket,upay,mtb_visa,mtb_master,standard_bank,dbbl_master,upay,ebl_visa,ebl_master,fastpay',
      emi_option: 0,
      emi_max_inst_option: 0,
      emi_selected_inst: 0,
      cus_name: 'Test User',
      cus_email: 'test@example.com',
      cus_add1: 'Test Address',
      cus_add2: 'Test Area',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01234567890',
      cus_fax: '',
      ship_name: 'Test User',
      ship_add1: 'Test Address',
      ship_add2: 'Test Area',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
      product_name: 'Test Product',
      product_category: 'Beauty',
      product_profile: 'general',
      hours_till_departure: '24',
      flight_type: 'Domestic',
      pnr: 'PNR123456',
      journey_from_to: 'DAC-CGP',
      third_party: 'no',
      input_currency: currency
    };

    console.log('📤 Sending payment request to SSLCommerz...');
    console.log(`🔗 Success URL: ${SUCCESS_URL}`);
    console.log(`🔗 Fail URL: ${FAIL_URL}`);
    console.log(`🔗 Cancel URL: ${CANCEL_URL}`);
    console.log(`🔗 IPN URL: ${IPN_URL}`);
    console.log('');

    const response = await makeRequest(SSLCOMMERZ_URL, paymentData);
    
    console.log('📥 SSLCommerz Response:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.status === 'SUCCESS') {
      console.log('');
      console.log('✅ Payment session created successfully!');
      console.log(`🔑 Session Key: ${response.sessionkey}`);
      console.log(`🌐 Gateway URL: ${response.gatewayURL}`);
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('1. Visit the Gateway URL above');
      console.log('2. Complete the payment process');
      console.log('3. SSLCommerz should redirect to the new API routes');
      console.log('4. Check if the 405 error is resolved');
    } else {
      console.log('');
      console.log('❌ Payment session creation failed');
      console.log(`Error: ${response.errorMessage || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('🔥 Error:', error.message);
  }
}

// Run the test
testFreshPayment();
