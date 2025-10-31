/**
 * Migration Script: Normalize all user phone numbers to +8801XXXXXXXXX format
 * 
 * This script will:
 * 1. Find all users with phone numbers
 * 2. Convert their phone numbers to +8801XXXXXXXXX format (database standard)
 * 3. Update the database
 * 
 * Run: npx tsx scripts/migrate-user-phones.ts
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
  phone?: string;
  email?: string;
  firstName?: string;
}

/**
 * Normalize phone number to +8801XXXXXXXXX format (database standard)
 */
function normalizePhoneToDatabaseFormat(phone: string | undefined): string | null {
  if (!phone) return null;
  
  // Remove spaces, dashes, parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Already in correct format
  if (cleanPhone.startsWith('+8801')) {
    return cleanPhone;
  }
  
  // 8801XXXXXXXXX -> +8801XXXXXXXXX
  if (cleanPhone.startsWith('8801')) {
    return '+' + cleanPhone;
  }
  
  // 01XXXXXXXXX -> +8801XXXXXXXXX
  if (cleanPhone.startsWith('01')) {
    return '+8801' + cleanPhone.substring(2);
  }
  
  // Try to extract digits
  const digits = cleanPhone.replace(/\D/g, '');
  
  if (digits.length === 13 && digits.startsWith('8801')) {
    return '+' + digits;
  }
  
  if (digits.length === 11 && digits.startsWith('01')) {
    return '+8801' + digits.substring(2);
  }
  
  // Can't normalize - return null
  return null;
}

async function migrateUserPhones() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.DB_NAME || 'scarlet');
    const usersCollection = db.collection<User>('users');
    
    // Find all users with phone numbers
    const users = await usersCollection.find({ phone: { $exists: true, $ne: null } }).toArray();
    console.log(`\n📊 Found ${users.length} users with phone numbers\n`);
    
    if (users.length === 0) {
      console.log('✅ No users to migrate');
      await client.close();
      return;
    }
    
    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const errors: Array<{ userId: string; phone: string; error: string }> = [];
    
    for (const user of users) {
      const originalPhone = user.phone;
      const normalizedPhone = normalizePhoneToDatabaseFormat(originalPhone);
      
      if (!normalizedPhone) {
        console.log(`⚠️  Cannot normalize phone for user ${user._id}: ${originalPhone}`);
        failed++;
        errors.push({
          userId: user._id.toString(),
          phone: originalPhone || 'N/A',
          error: 'Cannot normalize phone format'
        });
        continue;
      }
      
      if (normalizedPhone === originalPhone) {
        console.log(`✓ User ${user._id} (${user.firstName || 'N/A'}): Already normalized - ${originalPhone}`);
        unchanged++;
        continue;
      }
      
      try {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { phone: normalizedPhone, updatedAt: new Date().toISOString() } }
        );
        
        console.log(`✅ User ${user._id} (${user.firstName || 'N/A'}): ${originalPhone} → ${normalizedPhone}`);
        updated++;
      } catch (error: any) {
        console.error(`❌ Failed to update user ${user._id}: ${error.message}`);
        failed++;
        errors.push({
          userId: user._id.toString(),
          phone: originalPhone || 'N/A',
          error: error.message
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total users with phones: ${users.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`✓ Unchanged (already normalized): ${unchanged}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(60));
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => {
        console.log(`  User ${err.userId}: ${err.phone} - ${err.error}`);
      });
    }
    
    console.log('\n✅ Migration completed!');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run migration
migrateUserPhones()
  .then(() => {
    console.log('\n🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script error:', error);
    process.exit(1);
  });

