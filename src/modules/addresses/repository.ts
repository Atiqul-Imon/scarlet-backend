import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { Address, CreateAddressRequest } from './model.js';

export async function createAddress(userId: string, addressData: CreateAddressRequest): Promise<Address> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // If this is set as default, remove default from other addresses
  if (addressData.isDefault) {
    await db.collection<Address>('addresses').updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false, updatedAt: now } }
    );
  }
  
  const doc = {
    ...addressData,
    userId,
    isDefault: addressData.isDefault || false,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.collection<Address>('addresses').insertOne(doc as any);
  return { ...doc, _id: result.insertedId.toString() } as Address;
}

export async function getAddressesByUser(userId: string): Promise<Address[]> {
  const db = await getDb();
  return db.collection<Address>('addresses')
    .find({ userId })
    .sort({ isDefault: -1, createdAt: -1 })
    .toArray();
}

export async function getAddressById(addressId: string, userId: string): Promise<Address | null> {
  const db = await getDb();
  return db.collection<Address>('addresses')
    .findOne({ _id: new ObjectId(addressId), userId } as any);
}

export async function updateAddress(addressId: string, userId: string, updates: Partial<CreateAddressRequest>): Promise<Address | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // If this is set as default, remove default from other addresses
  if (updates.isDefault) {
      await db.collection<Address>('addresses').updateMany(
    { userId, _id: { $ne: new ObjectId(addressId) } as any, isDefault: true },
    { $set: { isDefault: false, updatedAt: now } }
  );
  }
  
  const updatedAddress = await db.collection<Address>('addresses')
    .findOneAndUpdate(
      { _id: new ObjectId(addressId), userId } as any,
      { $set: { ...updates, updatedAt: now } },
      { returnDocument: 'after' }
    );
  
  return updatedAddress;
}

export async function deleteAddress(addressId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Address>('addresses')
    .deleteOne({ _id: new ObjectId(addressId), userId } as any);
  
  return result.deletedCount > 0;
}

export async function setDefaultAddress(addressId: string, userId: string): Promise<Address | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // First, remove default from all addresses
  await db.collection<Address>('addresses').updateMany(
    { userId, isDefault: true },
    { $set: { isDefault: false, updatedAt: now } }
  );
  
  // Then set the specified address as default
  const updatedAddress = await db.collection<Address>('addresses')
    .findOneAndUpdate(
      { _id: new ObjectId(addressId), userId } as any,
      { $set: { isDefault: true, updatedAt: now } },
      { returnDocument: 'after' }
    );
  
  return updatedAddress;
}
