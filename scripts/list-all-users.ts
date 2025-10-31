/**
 * Script to list all registered users from MongoDB
 * 
 * Run: npx tsx scripts/list-all-users.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

interface User {
  _id: any;
  email?: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  role: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

async function listAllUsers() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(process.env.DB_NAME || 'scarlet');
    const usersCollection = db.collection<User>('users');
    
    // Get all users
    const users = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();
    
    console.log('='.repeat(100));
    console.log(`📊 Total Users: ${users.length}`);
    console.log('='.repeat(100));
    
    if (users.length === 0) {
      console.log('No users found in database.');
      await client.close();
      return;
    }
    
    // Count by role
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role || 'unknown'] = (acc[user.role || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📈 Users by Role:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });
    
    console.log('\n' + '='.repeat(100));
    console.log('👥 User List:');
    console.log('='.repeat(100));
    
    // Display users in a table format
    console.log('\nID'.padEnd(28) + 'Name'.padEnd(25) + 'Email'.padEnd(30) + 'Phone'.padEnd(18) + 'Role'.padEnd(10) + 'Verified');
    console.log('-'.repeat(120));
    
    users.forEach((user, index) => {
      const id = user._id?.toString() || 'N/A';
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
      const email = user.email || 'N/A';
      const phone = user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : 'N/A';
      const role = user.role || 'customer';
      const verified = `${user.isEmailVerified ? 'E' : ''}${user.isPhoneVerified ? 'P' : ''}` || 'None';
      
      console.log(
        id.substring(0, 26).padEnd(28) +
        name.substring(0, 23).padEnd(25) +
        email.substring(0, 28).padEnd(30) +
        phone.padEnd(18) +
        role.padEnd(10) +
        verified
      );
    });
    
    console.log('\n' + '='.repeat(100));
    console.log('📋 Detailed User Information:');
    console.log('='.repeat(100));
    
    // Show detailed info for each user
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user._id}`);
      console.log(`   Name: ${user.firstName || 'N/A'} ${user.lastName || ''}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Role: ${user.role || 'customer'}`);
      console.log(`   Email Verified: ${user.isEmailVerified ? 'Yes' : 'No'}`);
      console.log(`   Phone Verified: ${user.isPhoneVerified ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`);
      console.log(`   Updated: ${user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}`);
    });
    
    // Phone format analysis
    console.log('\n' + '='.repeat(100));
    console.log('📱 Phone Number Format Analysis:');
    console.log('='.repeat(100));
    
    const phoneFormats = users.reduce((acc, user) => {
      if (!user.phone) {
        acc['No Phone'] = (acc['No Phone'] || 0) + 1;
        return acc;
      }
      
      let format = 'Unknown';
      if (user.phone.startsWith('+8801')) format = '+8801XXXXXXXXX';
      else if (user.phone.startsWith('8801')) format = '8801XXXXXXXXX';
      else if (user.phone.startsWith('01')) format = '01XXXXXXXXX';
      else format = 'Other Format';
      
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(phoneFormats).forEach(([format, count]) => {
      console.log(`   ${format}: ${count}`);
    });
    
    console.log('\n✅ List completed!');
    
  } catch (error: any) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run script
listAllUsers()
  .then(() => {
    console.log('\n🎉 Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });

