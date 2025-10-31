import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { User } from './model.js';

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  return db.collection<User>('users').findOne({ email });
}

// Find user by phone (exact match)
export async function findUserByPhone(phone: string): Promise<User | null> {
  const db = await getDb();
  return db.collection<User>('users').findOne({ phone });
}

// Find user by phone (flexible - tries multiple formats)
export async function findUserByPhoneFlexible(phone: string): Promise<User | null> {
  const db = await getDb();
  const collection = db.collection<User>('users');
  
  // Generate all possible phone formats to try
  const formats: string[] = [phone]; // Original format
  
  // If starts with '01', try with +8801
  if (phone.startsWith('01')) {
    formats.push('+8801' + phone.substring(2)); // +8801XXXXXXXXX (normalized)
    formats.push('+880' + phone.substring(1)); // +8801XXXXXXXXX variant
    formats.push(phone.substring(1)); // 1XXXXXXXXX (without leading 0)
  }
  
  // If starts with +8801, try without +
  if (phone.startsWith('+8801')) {
    formats.push('8801' + phone.substring(5)); // 8801XXXXXXXXX
    formats.push('01' + phone.substring(5)); // 01XXXXXXXXX
  }
  
  // Remove duplicates
  const uniqueFormats = Array.from(new Set(formats));
  
  // Use MongoDB $or to query all formats in a single query (more efficient)
  const user = await collection.findOne({
    phone: { $in: uniqueFormats }
  });
  
  return user || null;
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  const db = await getDb();
  return db.collection<User>('users').findOne({ _id: new ObjectId(id) } as any);
}

// Find user by email or phone (for login)
export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const db = await getDb();
  return db.collection<User>('users').findOne({
    $or: [
      { email: identifier },
      { phone: identifier }
    ]
  });
}

// Insert new user
export async function insertUser(user: User): Promise<User> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc = { 
    ...user, 
    createdAt: user.createdAt || now, 
    updatedAt: user.updatedAt || now 
  } as User;
  
  const res = await db.collection<User>('users').insertOne(doc as any);
  return { ...doc, _id: res.insertedId.toString() };
}

// Update user by ID
export async function updateUserById(id: string, updates: Partial<User>): Promise<void> {
  const db = await getDb();
  const updateDoc = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await db.collection<User>('users').updateOne(
    { _id: new ObjectId(id) } as any,
    { $set: updateDoc }
  );
}

// Delete user by ID
export async function deleteUserById(id: string): Promise<void> {
  const db = await getDb();
  await db.collection<User>('users').deleteOne({ _id: new ObjectId(id) } as any);
}

// Find users with pagination
export async function findUsers(
  filter: Partial<User> = {},
  page = 1,
  limit = 20,
  sort: Record<string, 1 | -1> = { createdAt: -1 }
): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
  const db = await getDb();
  const collection = db.collection<User>('users');
  
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    collection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter)
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

// Create database indexes for performance
export async function createUserIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection<User>('users');
  
  // Create indexes for email and phone (unique)
  await Promise.all([
    collection.createIndex({ email: 1 }, { unique: true, sparse: true }),
    collection.createIndex({ phone: 1 }, { unique: true, sparse: true }),
    collection.createIndex({ role: 1 }),
    collection.createIndex({ createdAt: -1 }),
    collection.createIndex({ 'firstName': 'text', 'lastName': 'text' })
  ]);
}


