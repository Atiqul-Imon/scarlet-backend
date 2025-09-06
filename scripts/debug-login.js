import { MongoClient } from 'mongodb';
import argon2 from 'argon2';

async function debugLogin() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const dbName = process.env.DB_NAME || 'scarlet';
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    const identifier = 'admin@scarlet.com';
    const password = 'admin123';
    
    console.log('\n🔍 Debug Login Process:');
    console.log(`   Identifier: ${identifier}`);
    console.log(`   Password: ${password}`);
    
    // Step 1: Normalize identifier (like in the code)
    const normalizedIdentifier = identifier.toLowerCase();
    console.log(`   Normalized: ${normalizedIdentifier}`);
    
    // Step 2: Find user by email
    console.log('\n📋 Looking for user...');
    const user = await users.findOne({ email: normalizedIdentifier });
    
    if (!user) {
      console.log('❌ User not found with normalized identifier');
      
      // Try to find any user with similar email
      const allAdmins = await users.find({ role: 'admin' }).toArray();
      console.log(`   Found ${allAdmins.length} admin users:`);
      allAdmins.forEach(admin => {
        console.log(`   - Email: "${admin.email}" (Type: ${typeof admin.email})`);
      });
      return;
    }
    
    console.log('✅ User found');
    console.log(`   User ID: ${user._id}`);
    console.log(`   Email: "${user.email}" (Type: ${typeof user.email})`);
    console.log(`   Role: ${user.role}`);
    
    // Step 3: Verify password
    console.log('\n🔐 Verifying password...');
    if (!user.passwordHash) {
      console.log('❌ No password hash found');
      return;
    }
    
    try {
      const isValid = await argon2.verify(user.passwordHash, password);
      console.log(`   Password verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      if (isValid) {
        console.log('\n🎉 Login should succeed!');
        console.log('   The issue might be elsewhere in the login flow.');
      } else {
        console.log('\n❌ Password verification failed');
        console.log('   This is why login is failing.');
      }
    } catch (error) {
      console.log(`❌ Password verification error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugLogin();
