import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as controller from './controller.js';

export const router = Router();

router.post('/register', asyncHandler(controller.register));
router.post('/login', asyncHandler(controller.login));


