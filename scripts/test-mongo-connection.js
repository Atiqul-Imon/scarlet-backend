#!/usr/bin/env node

/**
 * MongoDB Atlas Connection Test Script
 * 
 * This script tests the connection to MongoDB Atlas using your .env configuration.
 * Run this before starting the server to ensure your connection string is correct.
 * 
 * Usage: node scripts/test-mongo-connection.js
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set');
  console.log('Please add your MongoDB Atlas connection string to the .env file:');
  console.log('MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/scarlet?retryWrites=true&w=majority');
  process.exit(1);
}

async function testConnection() {
  console.log('🔍 Testing MongoDB Atlas connection...');
  console.log(`📡 Connecting to: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  try {
    // Connect to MongoDB Atlas
    console.log('⏳ Connecting...');
    await client.connect();
    
    // Test the connection
    console.log('🔍 Testing connection...');
    await client.db('admin').command({ ping: 1 });
    
    // Get database info
    const db = client.db(process.env.DB_NAME || 'scarlet');
    const stats = await db.stats();
    
    console.log('✅ MongoDB Atlas connection successful!');
    console.log(`📊 Database: ${stats.db}`);
    console.log(`📁 Collections: ${stats.collections}`);
    console.log(`📄 Objects: ${stats.objects}`);
    console.log(`💾 Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🗃️ Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Test creating a collection (if needed)
    const collections = await db.listCollections().toArray();
    console.log(`📋 Available collections: ${collections.map(c => c.name).join(', ') || 'None'}`);
    
    // Get server info
    const serverStatus = await db.admin().serverStatus();
    console.log(`🖥️ MongoDB Version: ${serverStatus.version}`);
    console.log(`🔗 Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
    console.log(`⏰ Server Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:');
    
    if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication Error: Check your username and password in the connection string');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🌐 Network Error: Check your internet connection and cluster hostname');
    } else if (error.message.includes('timeout')) {
      console.error('⏰ Timeout Error: Connection took too long, check your network or Atlas status');
    } else if (error.message.includes('IP')) {
      console.error('🛡️ IP Whitelist Error: Add your IP address to Atlas Network Access');
    } else {
      console.error(`❓ Unknown Error: ${error.message}`);
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Verify your username and password in the connection string');
    console.log('2. Check that your IP address is whitelisted in MongoDB Atlas');
    console.log('3. Ensure your cluster is running and accessible');
    console.log('4. Verify your internet connection');
    console.log('5. Check MongoDB Atlas status: https://status.mongodb.com/');
    
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n👋 Connection test interrupted');
  process.exit(0);
});

// Run the test
testConnection();
