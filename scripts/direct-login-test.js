import { MongoClient } from 'mongodb';
import argon2 from 'argon2';

async function directLoginTest() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'scarlet';
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    const identifier = 'admin@scarlet.com';
    const password = 'admin123';
    
    console.log('\n🔍 Direct Login Test (simulating exact API flow):');
    console.log(`   Identifier: ${identifier}`);
    console.log(`   Password: ${password}`);
    
    // Step 1: Normalize identifier (lowercase email)
    const normalizedIdentifier = identifier.toLowerCase();
    console.log(`   Normalized: ${normalizedIdentifier}`);
    
    // Step 2: Find user using the same query as the repository
    console.log('\n📋 Finding user with $or query...');
    const user = await users.findOne({
      $or: [
        { email: normalizedIdentifier },
        { phone: normalizedIdentifier }
      ]
    });
    
    if (!user) {
      console.log('❌ User not found with $or query');
      
      // Try direct email query
      const directUser = await users.findOne({ email: normalizedIdentifier });
      console.log('   Direct email query:', directUser ? 'Found' : 'Not found');
      
      return;
    }
    
    console.log('✅ User found with $or query');
    console.log(`   User ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    
    // Step 3: Verify password
    console.log('\n🔐 Verifying password...');
    const isValid = await argon2.verify(user.passwordHash, password);
    console.log(`   Password verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (isValid) {
      console.log('\n🎉 LOGIN SHOULD WORK!');
      console.log('   The issue is NOT with the user data or password.');
      console.log('   The issue must be in the API code or TypeScript compilation.');
    } else {
      console.log('\n❌ LOGIN SHOULD FAIL');
      console.log('   The password verification is failing.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

directLoginTest();
