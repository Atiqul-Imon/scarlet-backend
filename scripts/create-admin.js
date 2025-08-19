import { MongoClient } from 'mongodb';
import argon2 from 'argon2';

async function createAdmin() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'scarlet';
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Check if admin already exists
    const existingAdmin = await users.findOne({ 
      $or: [
        { email: 'admin@scarlet.com' },
        { role: 'admin' }
      ]
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email || 'N/A'}`);
      console.log(`   Phone: ${existingAdmin.phone || 'N/A'}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName || ''}`);
      return;
    }
    
    // Create admin user
    const passwordHash = await argon2.hash('admin123');
    
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
    
    console.log('🎉 Admin user created successfully!');
    console.log('');
    console.log('📧 Login Credentials:');
    console.log('   Email: admin@scarlet.com');
    console.log('   Password: admin123');
    console.log('   Role: Admin');
    console.log('');
    console.log('🌸 Access the admin panel at: http://localhost:3000/admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await client.close();
  }
}

createAdmin();
