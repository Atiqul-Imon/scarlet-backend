import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { MediaFile, MediaFilters } from './model.js';

export async function insertMediaFile(mediaFile: MediaFile): Promise<MediaFile> {
  const db = await getDb();
  const { _id, ...fileData } = mediaFile;
  const result = await db.collection('media').insertOne({
    ...fileData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  return {
    ...mediaFile,
    _id: result.insertedId.toString(),
    createdAt: mediaFile.createdAt || new Date().toISOString(),
    updatedAt: mediaFile.updatedAt || new Date().toISOString()
  };
}

export async function getMediaFiles(
  filters: MediaFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<{ files: MediaFile[]; total: number; pages: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = { isActive: true };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.uploadedBy) {
    query.uploadedBy = filters.uploadedBy;
  }
  
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      query.createdAt.$lte = filters.dateTo;
    }
  }
  
  if (filters.search) {
    query.$or = [
      { originalName: { $regex: filters.search, $options: 'i' } },
      { alt: { $regex: filters.search, $options: 'i' } },
      { caption: { $regex: filters.search, $options: 'i' } },
      { tags: { $in: [new RegExp(filters.search, 'i')] } }
    ];
  }
  
  if (filters.mimeType) {
    query.mimeType = { $regex: filters.mimeType, $options: 'i' };
  }
  
  // Get files and total count
  const [files, total] = await Promise.all([
    db.collection('media')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('media').countDocuments(query)
  ]);
  
  return {
    files: files.map((file: any) => ({
      ...file,
      _id: file._id.toString()
    })),
    total,
    pages: Math.ceil(total / limit)
  };
}

export async function getMediaFileById(id: string): Promise<MediaFile | null> {
  const db = await getDb();
  const file = await db.collection('media').findOne({ _id: new ObjectId(id) });
  
  if (!file) return null;
  
  return {
    ...file as any,
    _id: file._id.toString()
  };
}

export async function updateMediaFile(
  id: string, 
  updates: Partial<MediaFile>
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('media').updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } 
    }
  );
  
  return result.modifiedCount > 0;
}

export async function deleteMediaFile(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('media').updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        isActive: false,
        updatedAt: new Date().toISOString() 
      } 
    }
  );
  
  return result.modifiedCount > 0;
}

export async function getMediaStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  byCategory: Record<string, number>;
  byMimeType: Record<string, number>;
}> {
  const db = await getDb();
  
  const [totalFiles, totalSize, categoryStats, mimeTypeStats] = await Promise.all([
    db.collection('media').countDocuments({ isActive: true }),
    db.collection('media').aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]).toArray(),
    db.collection('media').aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray(),
    db.collection('media').aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$mimeType', count: { $sum: 1 } } }
    ]).toArray()
  ]);
  
  return {
    totalFiles,
    totalSize: totalSize[0]?.totalSize || 0,
    byCategory: categoryStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>),
    byMimeType: mimeTypeStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>)
  };
}
