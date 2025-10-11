/**
 * SSLCommerz Production Testing Script
 * Tests payment creation with production URLs
 */

import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const config = {
  storeId: process.env.SSLCOMMERZ_STORE_ID,
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
  sandbox: process.env.SSLCOMMERZ_SANDBOX === 'true',
  successUrl: process.env.SSLCOMMERZ_SUCCESS_URL,
  failUrl: process.env.SSLCOMMERZ_FAIL_URL,
  cancelUrl: process.env.SSLCOMMERZ_CANCEL_URL,
};

console.log('🌐 Testing SSLCommerz Production Integration\n');
console.log('📋 Configuration:');
console.log('  Store ID:', config.storeId);
console.log('  Sandbox Mode:', config.sandbox);
console.log('  Success URL:', config.successUrl);
console.log('  Fail URL:', config.failUrl);
console.log('  Cancel URL:', config.cancelUrl);
console.log('');

async function testProductionPayment() {
  try {
    console.log('🚀 Step 1: Creating production test payment...\n');

    const baseUrl = config.sandbox 
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';

    const testOrderId = `PROD_TEST_${Date.now()}`;

    // Payment parameters
    const params = {
      store_id: config.storeId,
      store_passwd: config.storePassword,
      total_amount: '500.00',
      currency: 'BDT',
      tran_id: testOrderId,
      success_url: config.successUrl,
      fail_url: config.failUrl,
      cancel_url: config.cancelUrl,

      // Customer information
      cus_name: 'Production Test Customer',
      cus_email: 'test@scarletunlimited.net',
      cus_phone: '01711111111',
      cus_add1: 'Test Address',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_postcode: '1000',

      // Product information
      product_name: 'Scarlet Beauty Product',
      product_category: 'Beauty',
      product_profile: 'general',

      // Additional
      shipping_method: 'NO',
      num_of_item: 1,
      emi_option: 0,
    };

    console.log('📤 Sending request to SSLCommerz...');
    console.log('   Order ID:', testOrderId);
    console.log('   Amount: ৳500');
    console.log('   Customer: Production Test Customer');
    console.log('');

    const response = await axios.post(
      `${baseUrl}/gwprocess/v4/api.php`,
      new URLSearchParams(params).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      }
    );

    console.log('📥 Response received:\n');
    console.log('   Status:', response.data.status);

    if (response.data.status === 'SUCCESS') {
      console.log('   ✅ Production payment session created successfully!');
      console.log('   Session Key:', response.data.sessionkey);
      console.log('');
      console.log('🌐 Production Payment Gateway URL:');
      console.log('   ', response.data.GatewayPageURL || response.data.redirectGatewayURL);
      console.log('');
      console.log('🎯 Production Testing Instructions:');
      console.log('   1. Deploy your website to www.scarletunlimited.net');
      console.log('   2. Copy the Gateway URL above');
      console.log('   3. Open it in your browser');
      console.log('   4. Complete payment with test credentials');
      console.log('   5. You will be redirected to your live website');
      console.log('');
      console.log('💳 Test Payment Credentials:');
      console.log('   📱 Mobile Banking (bKash/Nagad/Rocket):');
      console.log('      Phone: 01711111111');
      console.log('      OTP: 1234');
      console.log('      PIN: 1234');
      console.log('');
      console.log('   💳 Card Payment:');
      console.log('      Card Number: 4111111111111111 (Visa)');
      console.log('      CVV: 123');
      console.log('      Expiry: 12/25 (any future date)');
      console.log('');
      console.log('✅ PRODUCTION TEST READY!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Deploy frontend to www.scarletunlimited.net');
      console.log('   2. Deploy backend with SSLCommerz routes');
      console.log('   3. Test complete payment flow on live domain');
      console.log('   4. Verify IPN webhook is working');
      console.log('   5. Switch to live SSLCommerz when ready');
    } else {
      console.log('   ❌ Production payment initiation failed!');
      console.log('   Reason:', response.data.failedreason || 'Unknown error');
      console.log('');
      console.log('🔍 Troubleshooting:');
      console.log('   - Verify Store ID and Password are correct');
      console.log('   - Check your production URLs are accessible');
      console.log('   - Ensure your domain is whitelisted');
      console.log('   - Contact SSLCommerz support if issue persists');
    }

  } catch (error) {
    console.error('\n❌ Error during production test:');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   No response received from server');
      console.error('   Check your internet connection');
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n🔍 Configuration Check:');
    console.log('   Store ID set:', !!config.storeId);
    console.log('   Store Password set:', !!config.storePassword);
    console.log('   Sandbox mode:', config.sandbox);
    console.log('   Success URL set:', !!config.successUrl);
    console.log('   Fail URL set:', !!config.failUrl);
    console.log('   Cancel URL set:', !!config.cancelUrl);
  }
}

// Run the test
testProductionPayment();

