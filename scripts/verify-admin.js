import { MongoClient } from 'mongodb';
import argon2 from 'argon2';

async function verifyAdmin() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'scarlet';
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Find admin user
    const admin = await users.findOne({ 
      email: 'admin@scarlet.com'
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('📋 Admin User Details:');
    console.log(`   ID: ${admin._id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Phone: ${admin.phone || 'N/A'}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName || ''}`);
    console.log(`   Password Hash: ${admin.passwordHash ? 'Present' : 'Missing'}`);
    console.log(`   Email Verified: ${admin.isEmailVerified}`);
    console.log(`   Created: ${admin.createdAt}`);
    
    // Test password verification
    if (admin.passwordHash) {
      try {
        const isValid = await argon2.verify(admin.passwordHash, 'admin123');
        console.log(`🔐 Password 'admin123' verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        
        // Also test with different passwords to make sure verification works
        const isWrong = await argon2.verify(admin.passwordHash, 'wrongpassword');
        console.log(`🔐 Password 'wrongpassword' verification: ${isWrong ? '❌ Should be false!' : '✅ Correctly rejected'}`);
      } catch (error) {
        console.log(`❌ Password verification error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

verifyAdmin();
