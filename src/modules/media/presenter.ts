import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';
import * as repo from './repository.js';
import type { MediaFile, MediaFilters, MediaUploadRequest, MediaUpdateRequest } from './model.js';

export async function uploadMediaFile(
  uploadData: MediaUploadRequest,
  userId: string
): Promise<MediaFile> {
  try {
    const { file, alt, caption, tags = [], category } = uploadData;
    
    // Validate file
    if (!file) {
      throw new AppError('File is required', { code: 'FILE_REQUIRED' });
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new AppError('File size too large. Maximum 10MB allowed.', { 
        code: 'FILE_TOO_LARGE' 
      });
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new AppError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.', { 
        code: 'INVALID_FILE_TYPE' 
      });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `media_${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
    
    // Upload to ImageKit (you'll need to implement this)
    const uploadResult = await uploadToImageKit(file, filename);
    
    // Create media file record
    const mediaFile: MediaFile = {
      filename: uploadResult.filename,
      originalName: file.name,
      url: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      size: file.size,
      mimeType: file.type,
      width: uploadResult.width,
      height: uploadResult.height,
      alt: alt || '',
      caption: caption || '',
      tags,
      category,
      uploadedBy: userId,
      isActive: true
    };
    
    const createdFile = await repo.insertMediaFile(mediaFile);
    
    logger.info({ 
      mediaId: createdFile._id, 
      filename: createdFile.filename,
      category,
      userId 
    }, 'Media file uploaded successfully');
    
    return createdFile;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to upload media file');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to upload media file', { code: 'UPLOAD_FAILED' });
  }
}

export async function getMediaFiles(
  filters: MediaFilters = {},
  page: number = 1,
  limit: number = 20
) {
  try {
    return await repo.getMediaFiles(filters, page, limit);
  } catch (error) {
    logger.error({ error, filters }, 'Failed to fetch media files');
    throw new AppError('Failed to fetch media files', { code: 'FETCH_FAILED' });
  }
}

export async function getMediaFileById(id: string): Promise<MediaFile> {
  try {
    const file = await repo.getMediaFileById(id);
    if (!file) {
      throw new AppError('Media file not found', { code: 'FILE_NOT_FOUND' });
    }
    return file;
  } catch (error) {
    logger.error({ error, mediaId: id }, 'Failed to fetch media file');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch media file', { code: 'FETCH_FAILED' });
  }
}

export async function updateMediaFile(
  id: string,
  updates: MediaUpdateRequest,
  userId: string
): Promise<MediaFile> {
  try {
    // Check if file exists and user has permission
    const existingFile = await repo.getMediaFileById(id);
    if (!existingFile) {
      throw new AppError('Media file not found', { code: 'FILE_NOT_FOUND' });
    }
    
    if (existingFile.uploadedBy !== userId) {
      throw new AppError('Unauthorized to update this file', { code: 'UNAUTHORIZED' });
    }
    
    const success = await repo.updateMediaFile(id, updates);
    if (!success) {
      throw new AppError('Failed to update media file', { code: 'UPDATE_FAILED' });
    }
    
    const updatedFile = await repo.getMediaFileById(id);
    logger.info({ mediaId: id, updates, userId }, 'Media file updated successfully');
    
    return updatedFile!;
  } catch (error) {
    logger.error({ error, mediaId: id, userId }, 'Failed to update media file');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update media file', { code: 'UPDATE_FAILED' });
  }
}

export async function deleteMediaFile(id: string, userId: string): Promise<void> {
  try {
    // Check if file exists and user has permission
    const existingFile = await repo.getMediaFileById(id);
    if (!existingFile) {
      throw new AppError('Media file not found', { code: 'FILE_NOT_FOUND' });
    }
    
    if (existingFile.uploadedBy !== userId) {
      throw new AppError('Unauthorized to delete this file', { code: 'UNAUTHORIZED' });
    }
    
    // Delete from ImageKit first
    try {
      await deleteFromImageKit(existingFile.url, existingFile.filename);
      logger.info({ mediaId: id, filename: existingFile.filename }, 'File deleted from ImageKit');
    } catch (imagekitError) {
      logger.warn({ 
        mediaId: id, 
        filename: existingFile.filename, 
        error: imagekitError 
      }, 'Failed to delete from ImageKit, but continuing with database deletion');
    }
    
    // Delete from database
    const success = await repo.deleteMediaFile(id);
    if (!success) {
      throw new AppError('Failed to delete media file from database', { code: 'DELETE_FAILED' });
    }
    
    logger.info({ mediaId: id, userId, filename: existingFile.filename }, 'Media file deleted successfully from both ImageKit and database');
  } catch (error) {
    logger.error({ error, mediaId: id, userId }, 'Failed to delete media file');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete media file', { code: 'DELETE_FAILED' });
  }
}

export async function saveMediaFile(
  mediaData: {
    filename: string;
    originalName: string;
    url: string;
    thumbnailUrl?: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
    alt?: string;
    caption?: string;
    tags: string[];
    category: string;
  },
  userId: string
): Promise<MediaFile> {
  try {
    const mediaFile: MediaFile = {
      filename: mediaData.filename,
      originalName: mediaData.originalName,
      url: mediaData.url,
      thumbnailUrl: mediaData.thumbnailUrl,
      size: mediaData.size,
      mimeType: mediaData.mimeType,
      width: mediaData.width,
      height: mediaData.height,
      alt: mediaData.alt || '',
      caption: mediaData.caption || '',
      tags: mediaData.tags,
      category: mediaData.category as 'product' | 'category' | 'blog' | 'general',
      uploadedBy: userId,
      isActive: true
    };

    const createdFile = await repo.insertMediaFile(mediaFile);
    
    logger.info({ 
      mediaId: createdFile._id, 
      filename: createdFile.filename,
      category: mediaData.category,
      userId 
    }, 'Media file saved to database');

    return createdFile;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to save media file');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to save media file', { code: 'SAVE_FAILED' });
  }
}

export async function getMediaStats() {
  try {
    return await repo.getMediaStats();
  } catch (error) {
    logger.error({ error }, 'Failed to fetch media stats');
    throw new AppError('Failed to fetch media statistics', { code: 'STATS_FAILED' });
  }
}

// Helper function to upload to ImageKit
async function uploadToImageKit(file: File, filename: string): Promise<{
  filename: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}> {
  // This is a placeholder - you'll need to implement actual ImageKit upload
  // For now, return mock data
  return {
    filename,
    url: `https://ik.imagekit.io/your-id/${filename}`,
    thumbnailUrl: `https://ik.imagekit.io/your-id/tr:w-300,h-300/${filename}`,
    width: 1920,
    height: 1080
  };
}

// Helper function to delete from ImageKit
async function deleteFromImageKit(url: string, filename: string): Promise<void> {
  try {
    // For now, we'll use the frontend API endpoint to delete from ImageKit
    // This ensures we use the same ImageKit instance and configuration
    const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/delete-image`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, filename })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ImageKit delete failed: ${errorData.error || 'Unknown error'}`);
    }
    
    logger.info({ url, filename }, 'File successfully deleted from ImageKit');
  } catch (error) {
    logger.error({ error, url, filename }, 'Failed to delete file from ImageKit');
    throw error;
  }
}

// Helper function to extract file ID from ImageKit URL
function extractFileIdFromUrl(url: string): string | null {
  try {
    // ImageKit URLs typically have the format: https://ik.imagekit.io/your-id/folder/filename
    // We need to extract the file ID, which is usually the last part of the path
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // For now, we'll use the filename as the file ID
    // In a real implementation, you might need to store the actual file ID
    return filename;
  } catch (error) {
    logger.error({ error, url }, 'Failed to extract file ID from URL');
    return null;
  }
}
