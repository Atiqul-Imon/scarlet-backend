import { MongoClient } from 'mongodb';
import argon2 from 'argon2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createNewAdmin() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const dbName = process.env.DB_NAME || 'scarlet';
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Check if this specific email already exists
    const existingUser = await users.findOne({ 
      email: 'admin@scarlet.com'
    });
    
    if (existingUser) {
      console.log('⚠️  User with email admin@scarlet.com already exists.');
      console.log('🔄 Updating password and role...');
      
      const passwordHash = await argon2.hash('admin@123');
      await users.updateOne(
        { _id: existingUser._id },
        { 
          $set: { 
            passwordHash,
            role: 'admin',
            isEmailVerified: true,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ User updated to admin with new password!');
      console.log('');
      console.log('📧 Login Credentials:');
      console.log('   Email: admin@scarlet.com');
      console.log('   Password: admin@123');
      console.log('   Role: Admin');
      return;
    }
    
    // Create new admin user
    console.log('🔐 Hashing password...');
    const passwordHash = await argon2.hash('admin@123');
    
    const adminUser = {
      email: 'admin@scarlet.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: false,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      },
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('👤 Creating admin user...');
    const result = await users.insertOne(adminUser);
    
    console.log('🎉 Admin user created successfully!');
    console.log('');
    console.log('📧 Login Credentials:');
    console.log('   Email: admin@scarlet.com');
    console.log('   Password: admin@123');
    console.log('   Role: Admin');
    console.log('   User ID:', result.insertedId);
    console.log('');
    console.log('🌐 Access the admin panel at:');
    console.log('   Frontend: https://scarletunlimited.net/admin');
    console.log('   API: https://api.scarletunlimited.net/api/admin');
    console.log('');
    console.log('✅ Admin user is ready to use!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createNewAdmin();

