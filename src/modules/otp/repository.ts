import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { OTP } from './model.js';

export async function createOTP(otp: OTP): Promise<OTP> {
  const db = await getDb();
  const col = db.collection('otps');
  
  const result = await col.insertOne({
    ...otp,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
  
  return {
    ...otp,
    _id: result.insertedId.toString()
  };
}

export async function findOTPByPhoneAndSession(
  phone: string, 
  sessionId: string, 
  purpose: string
): Promise<OTP | null> {
  const db = await getDb();
  const col = db.collection('otps');
  
  const otp = await col.findOne({
    phone,
    sessionId,
    purpose,
    expiresAt: { $gt: new Date().toISOString() } // Only non-expired OTPs
  }) as any as OTP | null;
  
  return otp;
}

export async function findValidOTP(
  phone: string, 
  sessionId: string, 
  purpose: string
): Promise<OTP | null> {
  const db = await getDb();
  const col = db.collection('otps');
  
  const otp = await col.findOne({
    phone,
    sessionId,
    purpose,
    expiresAt: { $gt: new Date().toISOString() },
    attempts: { $lt: 5 }, // Max 5 attempts
    verifiedAt: { $exists: false } // Exclude already verified OTPs
  }, {
    sort: { createdAt: -1 } // Get the most recent unverified OTP
  }) as any as OTP | null;
  
  return otp;
}

export async function updateOTPAttempts(
  otpId: string, 
  attempts: number
): Promise<void> {
  const db = await getDb();
  const col = db.collection('otps');
  
  await col.updateOne(
    { _id: new ObjectId(otpId) },
    { 
      $set: { 
        attempts,
        updatedAt: new Date().toISOString()
      }
    }
  );
}

export async function markOTPAsVerified(otpId: string): Promise<void> {
  const db = await getDb();
  const col = db.collection('otps');
  
  await col.updateOne(
    { _id: new ObjectId(otpId) },
    { 
      $set: { 
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  );
}

export async function cleanupExpiredOTPs(): Promise<void> {
  const db = await getDb();
  const col = db.collection('otps');
  
  // Delete OTPs that are expired
  await col.deleteMany({
    expiresAt: { $lt: new Date().toISOString() }
  });
}

export async function findRecentOTPByPhone(
  phone: string, 
  purpose: string
): Promise<OTP | null> {
  const db = await getDb();
  const col = db.collection('otps');
  
  // Find the most recent UNVERIFIED OTP for this phone and purpose within the last 10 seconds
  // Only rate-limit if there's an unverified OTP (already verified ones shouldn't block new requests)
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString();
  
  const otp = await col.findOne({
    phone,
    purpose,
    createdAt: { $gt: tenSecondsAgo },
    verifiedAt: { $exists: false } // Only check unverified OTPs for rate limiting
  }, {
    sort: { createdAt: -1 } // Most recent first
  }) as any as OTP | null;
  
  return otp;
}
