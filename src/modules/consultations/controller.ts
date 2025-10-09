import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { ok, created } from '../../core/http/response.js';
import * as presenter from './presenter.js';

// Public route - Submit consultation
export const submitConsultation = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, mobile, subject, message } = req.body;
  
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');

  const consultation = await presenter.submitConsultation({
    name,
    email,
    mobile,
    subject,
    message,
    ipAddress,
    userAgent
  });

  created(res, consultation);
});

// Admin routes
export const getConsultations = asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, assignedTo, startDate, endDate, search, page, limit } = req.query;

  const filters = {
    status: status as string,
    priority: priority as string,
    assignedTo: assignedTo as string,
    startDate: startDate as string,
    endDate: endDate as string,
    search: search as string
  };

  const result = await presenter.getConsultations(
    filters,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 50
  );

  ok(res, result);
});

export const getConsultationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const consultation = await presenter.getConsultationById(id);
  ok(res, consultation);
});

export const updateConsultationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = (req as any).user?.userId;

  const consultation = await presenter.updateConsultationStatus(id, status, adminId);
  ok(res, consultation);
});

export const updateConsultation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, priority, assignedTo, adminNotes } = req.body;

  const consultation = await presenter.updateConsultation(id, {
    status,
    priority,
    assignedTo,
    adminNotes
  });

  ok(res, consultation);
});

export const deleteConsultation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await presenter.deleteConsultation(id);
  ok(res, result);
});

export const getConsultationStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await presenter.getConsultationStats();
  ok(res, stats);
});

