#!/usr/bin/env ts-node

/**
 * Diagnostic script to check SSLCommerz IPN reception
 * Checks:
 * 1. IPN endpoint configuration
 * 2. Recent IPN logs
 * 3. Recent orders with SSLCommerz payment
 * 4. Payment status verification
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function checkSSLCommerzIPN() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // 1. Check IPN URL configuration
    console.log('='.repeat(60));
    console.log('1. IPN URL Configuration');
    console.log('='.repeat(60));
    const ipnUrl = process.env.SSLCOMMERZ_IPN_URL || 'NOT SET';
    console.log(`IPN URL: ${ipnUrl}`);
    console.log(`Expected URL: https://api.scarletunlimited.net/api/payments/webhook/sslcommerz\n`);
    
    // 2. Check recent SSLCommerz orders (last 7 days)
    console.log('='.repeat(60));
    console.log('2. Recent SSLCommerz Orders (Last 7 Days)');
    console.log('='.repeat(60));
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const recentOrders = await db.collection('orders')
      .find({
        'paymentInfo.method': 'sslcommerz',
        createdAt: { $gte: sevenDaysAgo }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`Found ${recentOrders.length} SSLCommerz orders in last 7 days:\n`);
    
    for (const order of recentOrders) {
      const paymentStatus = order.paymentInfo?.status || 'unknown';
      const orderStatus = order.status || 'unknown';
      const createdAt = new Date(order.createdAt).toLocaleString();
      
      console.log(`  Order: ${order.orderNumber}`);
      console.log(`    Status: ${orderStatus}`);
      console.log(`    Payment Status: ${paymentStatus}`);
      console.log(`    Total: ৳${order.total?.toLocaleString() || 0}`);
      console.log(`    Created: ${createdAt}`);
      console.log(`    Order ID: ${order._id}`);
      console.log('');
    }
    
    // 3. Check orders with pending payment (shouldn't exist if IPN is working)
    console.log('='.repeat(60));
    console.log('3. SSLCommerz Orders with Pending Payment');
    console.log('='.repeat(60));
    const pendingOrders = await db.collection('orders')
      .find({
        'paymentInfo.method': 'sslcommerz',
        'paymentInfo.status': { $ne: 'completed' },
        createdAt: { $gte: sevenDaysAgo }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    if (pendingOrders.length > 0) {
      console.log(`⚠️  Found ${pendingOrders.length} SSLCommerz orders with non-completed payment:\n`);
      for (const order of pendingOrders) {
        console.log(`  Order: ${order.orderNumber}`);
        console.log(`    Payment Status: ${order.paymentInfo?.status || 'unknown'}`);
        console.log(`    Order Status: ${order.status || 'unknown'}`);
        console.log(`    Created: ${new Date(order.createdAt).toLocaleString()}`);
        console.log(`    Order ID: ${order._id}`);
        console.log('');
      }
      console.log('⚠️  These orders suggest IPN might not be working correctly!\n');
    } else {
      console.log('✅ No pending SSLCommerz orders found - IPN appears to be working\n');
    }
    
    // 4. Check orders updated in last 24 hours (IPN activity)
    console.log('='.repeat(60));
    console.log('4. Recent Order Updates (Last 24 Hours - Possible IPN Activity)');
    console.log('='.repeat(60));
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const recentlyUpdated = await db.collection('orders')
      .find({
        'paymentInfo.method': 'sslcommerz',
        updatedAt: { $gte: oneDayAgo }
      })
      .sort({ updatedAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`Found ${recentlyUpdated.length} SSLCommerz orders updated in last 24 hours:\n`);
    
    for (const order of recentlyUpdated) {
      const paymentStatus = order.paymentInfo?.status || 'unknown';
      const orderStatus = order.status || 'unknown';
      const updatedAt = new Date(order.updatedAt).toLocaleString();
      const createdAt = new Date(order.createdAt).toLocaleString();
      
      console.log(`  Order: ${order.orderNumber}`);
      console.log(`    Status: ${orderStatus}`);
      console.log(`    Payment Status: ${paymentStatus}`);
      console.log(`    Created: ${createdAt}`);
      console.log(`    Updated: ${updatedAt}`);
      
      if (order.paymentInfo?.bankTransactionId) {
        console.log(`    Bank Transaction ID: ${order.paymentInfo.bankTransactionId}`);
      }
      console.log('');
    }
    
    // 5. Summary
    console.log('='.repeat(60));
    console.log('5. Summary & Recommendations');
    console.log('='.repeat(60));
    
    const totalSSLCommerzOrders = await db.collection('orders')
      .countDocuments({
        'paymentInfo.method': 'sslcommerz',
        createdAt: { $gte: sevenDaysAgo }
      });
    
    const completedOrders = await db.collection('orders')
      .countDocuments({
        'paymentInfo.method': 'sslcommerz',
        'paymentInfo.status': 'completed',
        createdAt: { $gte: sevenDaysAgo }
      });
    
    console.log(`Total SSLCommerz orders (7 days): ${totalSSLCommerzOrders}`);
    console.log(`Completed payments: ${completedOrders}`);
    console.log(`Pending/Failed payments: ${totalSSLCommerzOrders - completedOrders}`);
    
    if (totalSSLCommerzOrders > 0) {
      const successRate = ((completedOrders / totalSSLCommerzOrders) * 100).toFixed(1);
      console.log(`Success rate: ${successRate}%`);
      
      if (parseFloat(successRate) < 80) {
        console.log('\n⚠️  WARNING: Low success rate suggests IPN might not be working properly!');
        console.log('   - Check server logs for IPN reception');
        console.log('   - Verify IPN URL is configured in SSLCommerz merchant panel');
        console.log('   - Check if IPN endpoint is accessible from internet');
      }
    }
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Check PM2 logs: pm2 logs backend --lines 100 | grep -i "IPN"');
    console.log('   2. Verify IPN URL in SSLCommerz merchant panel');
    console.log('   3. Test IPN endpoint manually with SSLCommerz test tool');
    console.log('   4. Check server firewall/Nginx configuration for IPN endpoint');
    
  } catch (error) {
    console.error('❌ Error checking SSLCommerz IPN:', error);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

checkSSLCommerzIPN();

