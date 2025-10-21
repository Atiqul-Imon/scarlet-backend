import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload media file (will be handled by frontend upload API)
// router.post('/upload', upload.single('file'), controller.uploadMedia);

// Get media files with filters and pagination
router.get('/', controller.getMediaFiles);

// Get single media file
router.get('/:id', controller.getMediaFile);

// Update media file
router.put('/:id', controller.updateMediaFile);

// Delete media file (soft delete)
router.delete('/:id', controller.deleteMediaFile);

// Get media statistics
router.get('/stats/overview', controller.getMediaStats);

export { router };
