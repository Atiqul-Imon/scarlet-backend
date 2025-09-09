#!/usr/bin/env node

/**
 * Create Test Order Script
 * Creates a test order for testing the admin order details endpoint
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function createTestOrder() {
  console.log('🛍️ Creating test order...\n');

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('scarlet');

    // Get a product to use in the order
    const product = await db.collection('products').findOne({});
    if (!product) {
      console.log('❌ No products found. Please run the seed script first.');
      process.exit(1);
    }

    // Get admin user
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    console.log('🔍 Searching for admin user...');
    console.log('📊 Total users in database:', await db.collection('users').countDocuments());
    
    if (!adminUser) {
      console.log('❌ No admin user found. Please run the create-admin script first.');
      // List all users for debugging
      const allUsers = await db.collection('users').find({}).toArray();
      console.log('👥 All users:', allUsers.map(u => ({ id: u._id, email: u.email, role: u.role })));
      process.exit(1);
    }
    
    console.log('✅ Admin user found:', { id: adminUser._id, email: adminUser.email, role: adminUser.role });

    // Create test order
    const testOrder = {
      orderNumber: `ORD-${Date.now()}`,
      userId: adminUser._id,
      guestId: null,
      status: 'pending',
      items: [
        {
          productId: product._id,
          title: product.title,
          sku: product.sku,
          price: product.price.amount,
          quantity: 2,
          image: product.images?.[0] || null,
          variant: null
        }
      ],
      subtotal: product.price.amount * 2,
      shipping: 100,
      tax: 0,
      discount: 0,
      total: (product.price.amount * 2) + 100,
      currency: 'BDT',
      paymentInfo: {
        method: 'cod',
        status: 'pending',
        transactionId: null
      },
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+8801712345678',
        address: 'House 123, Road 15, Block C',
        city: 'Dhaka',
        area: 'Bashundhara R/A',
        postalCode: '1229'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+8801712345678',
        address: 'House 123, Road 15, Block C',
        city: 'Dhaka',
        area: 'Bashundhara R/A',
        postalCode: '1229'
      },
      notes: 'Test order for admin panel testing',
      trackingNumber: null,
      estimatedDelivery: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('orders').insertOne(testOrder);
    
    console.log('✅ Test order created successfully!');
    console.log(`📦 Order ID: ${result.insertedId}`);
    console.log(`📋 Order Number: ${testOrder.orderNumber}`);
    console.log(`💰 Total: ৳${testOrder.total}`);
    console.log(`👤 Customer: ${testOrder.shippingAddress.firstName} ${testOrder.shippingAddress.lastName}`);
    console.log(`📧 Email: ${testOrder.shippingAddress.email}`);
    console.log(`📱 Phone: ${testOrder.shippingAddress.phone}`);
    console.log(`📍 Address: ${testOrder.shippingAddress.address}, ${testOrder.shippingAddress.city}`);
    console.log(`🛍️ Items: ${testOrder.items.length} item(s)`);
    console.log(`📊 Status: ${testOrder.status}`);
    console.log(`💳 Payment: ${testOrder.paymentInfo.method} (${testOrder.paymentInfo.status})`);
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error creating test order:', error.message);
    process.exit(1);
  }
}

createTestOrder();
