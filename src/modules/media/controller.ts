import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';
import type { MediaFilters, MediaUploadRequest, MediaUpdateRequest } from './model.js';

// Upload media file
export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  if (!userId) {
    return fail(res, { message: 'Authentication required' }, 401);
  }

  const file = req.file;
  if (!file) {
    return fail(res, { message: 'File is required' }, 400);
  }

  const uploadData: MediaUploadRequest = {
    file: file as any, // Multer file object
    alt: req.body.alt || '',
    caption: req.body.caption || '',
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    category: req.body.category || 'general'
  };

  try {
    const mediaFile = await presenter.uploadMediaFile(uploadData, userId);
    ok(res, mediaFile);
  } catch (error: any) {
    return fail(res, { 
      message: error.message || 'Upload failed',
      code: error.code 
    }, 400);
  }
});

// Get media files with filters
export const getMediaFiles = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    tags,
    uploadedBy,
    dateFrom,
    dateTo,
    search,
    mimeType,
    page = '1',
    limit = '20'
  } = req.query;

  const filters: MediaFilters = {
    category: category as string,
    tags: tags ? (tags as string).split(',') : undefined,
    uploadedBy: uploadedBy as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
    search: search as string,
    mimeType: mimeType as string
  };

  try {
    const result = await presenter.getMediaFiles(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );
    ok(res, result);
  } catch (error: any) {
    return fail(res, { 
      message: error.message || 'Failed to fetch media files',
      code: error.code 
    }, 500);
  }
});

// Get single media file
export const getMediaFile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const mediaFile = await presenter.getMediaFileById(id);
    ok(res, mediaFile);
  } catch (error: any) {
    if (error.code === 'FILE_NOT_FOUND') {
      return fail(res, { message: 'Media file not found' }, 404);
    }
    return fail(res, { 
      message: error.message || 'Failed to fetch media file',
      code: error.code 
    }, 500);
  }
});

// Update media file
export const updateMediaFile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?._id;
  
  if (!userId) {
    return fail(res, { message: 'Authentication required' }, 401);
  }

  const updates: MediaUpdateRequest = {
    alt: req.body.alt,
    caption: req.body.caption,
    tags: req.body.tags,
    category: req.body.category,
    isActive: req.body.isActive
  };

  try {
    const updatedFile = await presenter.updateMediaFile(id, updates, userId);
    ok(res, updatedFile);
  } catch (error: any) {
    if (error.code === 'FILE_NOT_FOUND') {
      return fail(res, { message: 'Media file not found' }, 404);
    }
    if (error.code === 'UNAUTHORIZED') {
      return fail(res, { message: 'Unauthorized to update this file' }, 403);
    }
    return fail(res, { 
      message: error.message || 'Failed to update media file',
      code: error.code 
    }, 500);
  }
});

// Delete media file
export const deleteMediaFile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?._id;
  
  if (!userId) {
    return fail(res, { message: 'Authentication required' }, 401);
  }

  try {
    await presenter.deleteMediaFile(id, userId);
    ok(res, { message: 'Media file deleted successfully' });
  } catch (error: any) {
    if (error.code === 'FILE_NOT_FOUND') {
      return fail(res, { message: 'Media file not found' }, 404);
    }
    if (error.code === 'UNAUTHORIZED') {
      return fail(res, { message: 'Unauthorized to delete this file' }, 403);
    }
    return fail(res, { 
      message: error.message || 'Failed to delete media file',
      code: error.code 
    }, 500);
  }
});

// Get media statistics
export const getMediaStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = await presenter.getMediaStats();
    ok(res, stats);
  } catch (error: any) {
    return fail(res, { 
      message: error.message || 'Failed to fetch media statistics',
      code: error.code 
    }, 500);
  }
});
