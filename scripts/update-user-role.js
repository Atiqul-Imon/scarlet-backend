import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const env = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  mongoDbName: process.env.MONGO_DB_NAME || 'scarlet'
};

async function updateUserRole() {
  const client = new MongoClient(env.mongoUri);
  
  try {
    await client.connect();
    const db = client.db(env.mongoDbName);
    
    // Find the user by email (replace with the email you used to register)
    const userEmail = 'admin@scarlet.com'; // Change this to your registered email
    
    const user = await db.collection('users').findOne({ email: userEmail });
    
    if (!user) {
      console.log('❌ User not found with email:', userEmail);
      console.log('Available users:');
      const users = await db.collection('users').find({}, { projection: { email: 1, phone: 1, role: 1 } }).toArray();
      users.forEach(u => console.log(`- Email: ${u.email}, Phone: ${u.phone}, Role: ${u.role}`));
      return;
    }
    
    console.log('👤 Found user:', {
      id: user._id,
      email: user.email,
      phone: user.phone,
      currentRole: user.role
    });
    
    // Update role to admin
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { role: 'admin', updatedAt: new Date().toISOString() } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated user role to admin');
    } else {
      console.log('❌ Failed to update user role');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

updateUserRole();
