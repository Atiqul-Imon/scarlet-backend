import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { Consultation, ConsultationFilters, ConsultationStats } from './model.js';

const COLLECTION_NAME = 'consultations';

export async function createConsultation(consultationData: Omit<Consultation, '_id' | 'createdAt' | 'updatedAt'>): Promise<Consultation> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const consultation = {
    ...consultationData,
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now
  };

  const result = await db.collection(COLLECTION_NAME).insertOne(consultation);
  
  return {
    ...consultation,
    _id: result.insertedId.toString()
  };
}

export async function getConsultations(
  filters: ConsultationFilters = {},
  limit: number = 50,
  skip: number = 0
): Promise<Consultation[]> {
  const db = await getDb();
  const query: any = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { mobile: { $regex: filters.search, $options: 'i' } },
      { subject: { $regex: filters.search, $options: 'i' } },
      { message: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const consultations = await db.collection<Consultation>(COLLECTION_NAME)
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return consultations.map(c => ({
    ...c,
    _id: c._id.toString()
  }));
}

export async function getConsultationCount(
  filters: ConsultationFilters = {}
): Promise<number> {
  const db = await getDb();
  const query: any = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { mobile: searchRegex },
      { subject: searchRegex },
      { message: searchRegex }
    ];
  }

  return db.collection<Consultation>(COLLECTION_NAME).countDocuments(query);
}

export async function getConsultationById(id: string): Promise<Consultation | null> {
  const db = await getDb();
  
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const consultation = await db.collection<Consultation>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) as any });

  if (!consultation) {
    return null;
  }

  return {
    ...consultation,
    _id: consultation._id.toString()
  };
}

export async function updateConsultation(
  id: string,
  updates: Partial<Omit<Consultation, '_id' | 'createdAt'>>
): Promise<Consultation | null> {
  const db = await getDb();
  
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // Set timestamps for status changes
  if (updates.status === 'contacted' && !updates.contactedAt) {
    updateData.contactedAt = new Date().toISOString();
  }
  if (updates.status === 'resolved' && !updates.resolvedAt) {
    updateData.resolvedAt = new Date().toISOString();
  }

  const result = await db.collection<Consultation>(COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) as any },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result) {
    return null;
  }

  return {
    ...result,
    _id: result._id.toString()
  } as Consultation;
}

export async function deleteConsultation(id: string): Promise<boolean> {
  const db = await getDb();
  
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

export async function getConsultationStats(): Promise<ConsultationStats> {
  const db = await getDb();
  
  const pipeline = [
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];

  const results = await db.collection(COLLECTION_NAME).aggregate(pipeline).toArray();
  
  const stats: ConsultationStats = {
    total: 0,
    pending: 0,
    read: 0,
    contacted: 0,
    resolved: 0,
    closed: 0
  };

  results.forEach((result: any) => {
    const status = result._id as keyof Omit<ConsultationStats, 'total'>;
    if (status && status in stats) {
      stats[status] = result.count;
      stats.total += result.count;
    }
  });

  return stats;
}


