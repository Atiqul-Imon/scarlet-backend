import { MongoClient } from 'mongodb';
import argon2 from 'argon2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createCustomAdmin() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const dbName = process.env.DB_NAME || 'scarlet';
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Check if admin already exists
    const existingAdmin = await users.findOne({ 
      $or: [
        { email: 'atiqulimon.dev@gmail.com' },
        { role: 'admin' }
      ]
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email || 'N/A'}`);
      console.log(`   Phone: ${existingAdmin.phone || 'N/A'}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName || ''}`);
      
      // Update existing admin with new password if needed
      if (existingAdmin.email === 'atiqulimon.dev@gmail.com') {
        console.log('🔄 Updating existing admin password...');
        const passwordHash = await argon2.hash('Scarletadmin@123');
        await users.updateOne(
          { _id: existingAdmin._id },
          { 
            $set: { 
              passwordHash,
              updatedAt: new Date()
            }
          }
        );
        console.log('✅ Admin password updated successfully!');
      }
      return;
    }
    
    // Create admin user with custom credentials
    console.log('🔐 Hashing password...');
    const passwordHash = await argon2.hash('Scarletadmin@123');
    
    const adminUser = {
      email: 'atiqulimon.dev@gmail.com',
      passwordHash,
      firstName: 'Atiqul',
      lastName: 'Islam',
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
    console.log('   Email: atiqulimon.dev@gmail.com');
    console.log('   Password: Scarletadmin@123');
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

createCustomAdmin();
