import { MongoClient } from 'mongodb';
import argon2 from 'argon2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function recreateAdmin() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const dbName = process.env.DB_NAME || 'scarlet';
  
  console.log('🔧 Environment loaded:');
  console.log('   MongoDB URI:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
  console.log('   Database Name:', dbName);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Delete existing admin user
    console.log('🗑️  Deleting existing admin user...');
    await users.deleteMany({ 
      $or: [
        { email: 'admin@scarlet.com' },
        { role: 'admin' }
      ]
    });
    
    // Create fresh password hash
    console.log('🔐 Creating password hash...');
    const password = 'admin123';
    const passwordHash = await argon2.hash(password);
    console.log('   Password hash created successfully');
    
    // Create new admin user
    console.log('👤 Creating new admin user...');
    const adminUser = {
      email: 'admin@scarlet.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: false,
      preferences: {},
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await users.insertOne(adminUser);
    console.log('✅ Admin user created with ID:', result.insertedId);
    
    // Verify the user can be found
    console.log('🔍 Verifying user can be found...');
    const foundUser = await users.findOne({ email: 'admin@scarlet.com' });
    if (foundUser) {
      console.log('✅ User found successfully');
      console.log('   Email:', foundUser.email);
      console.log('   Role:', foundUser.role);
      
      // Test password verification
      const isValid = await argon2.verify(foundUser.passwordHash, password);
      console.log('   Password verification:', isValid ? '✅ Valid' : '❌ Invalid');
      
      if (isValid) {
        console.log('');
        console.log('🎉 Admin user recreated successfully!');
        console.log('');
        console.log('📧 Login Credentials:');
        console.log('   Email: admin@scarlet.com');
        console.log('   Password: admin123');
        console.log('   Role: Admin');
        console.log('');
        console.log('🌸 Try logging in at: http://localhost:3000/admin');
      }
    } else {
      console.log('❌ User not found after creation');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

recreateAdmin();
