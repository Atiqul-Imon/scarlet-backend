import * as repo from './repository.js';
import { AppError } from '../../core/errors/AppError.js';
import type { Consultation, ConsultationFilters } from './model.js';

export async function submitConsultation(data: {
  name: string;
  address: string;
  phone: string;
  email?: string;
  age: number;
  gender?: 'male' | 'female' | 'other';
  skinType: 'oily' | 'dry' | 'normal' | 'combination' | 'sensitive';
  mainProblem: string;
  problemDuration: string;
  currentProducts?: string;
  images?: string[];
  preferredContactMethod: 'phone' | 'email' | 'whatsapp';
  additionalComments?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  // Validate required fields
  if (!data.name || !data.name.trim()) {
    throw new AppError('Name is required', { status: 400 });
  }

  if (!data.address || !data.address.trim()) {
    throw new AppError('Address is required', { status: 400 });
  }

  if (!data.phone || !data.phone.trim()) {
    throw new AppError('Phone number is required', { status: 400 });
  }

  if (!data.age || data.age < 1 || data.age > 120) {
    throw new AppError('Valid age is required', { status: 400 });
  }

  if (!data.skinType) {
    throw new AppError('Skin type is required', { status: 400 });
  }

  if (!data.mainProblem || !data.mainProblem.trim()) {
    throw new AppError('Main skin problem is required', { status: 400 });
  }

  if (!data.problemDuration || !data.problemDuration.trim()) {
    throw new AppError('Problem duration is required', { status: 400 });
  }

  if (!data.preferredContactMethod) {
    throw new AppError('Preferred contact method is required', { status: 400 });
  }

  // Validate phone format
  if (!isValidMobile(data.phone)) {
    throw new AppError('Invalid phone number format', { status: 400 });
  }

  // Validate email format if provided
  if (data.email && !isValidEmail(data.email)) {
    throw new AppError('Invalid email format', { status: 400 });
  }

  // Validate images array (max 3)
  if (data.images && data.images.length > 3) {
    throw new AppError('Maximum 3 images allowed', { status: 400 });
  }

  const consultation = await repo.createConsultation({
    name: data.name.trim(),
    address: data.address.trim(),
    phone: data.phone.trim(),
    email: data.email?.trim(),
    age: data.age,
    gender: data.gender,
    skinType: data.skinType,
    mainProblem: data.mainProblem.trim(),
    problemDuration: data.problemDuration.trim(),
    currentProducts: data.currentProducts?.trim(),
    images: data.images || [],
    preferredContactMethod: data.preferredContactMethod,
    additionalComments: data.additionalComments?.trim(),
    status: 'pending',
    ipAddress: data.ipAddress,
    userAgent: data.userAgent
  });

  return consultation;
}

export async function getConsultations(
  filters: ConsultationFilters = {},
  page: number = 1,
  limit: number = 50
) {
  const skip = (page - 1) * limit;
  const consultations = await repo.getConsultations(filters, limit, skip);
  const total = await repo.getConsultationCount(filters);

  return {
    data: consultations,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getConsultationById(id: string) {
  const consultation = await repo.getConsultationById(id);
  
  if (!consultation) {
    throw new AppError('Consultation not found', { status: 404 });
  }

  return consultation;
}

export async function updateConsultationStatus(
  id: string,
  status: Consultation['status'],
  adminId?: string
) {
  const consultation = await repo.getConsultationById(id);
  
  if (!consultation) {
    throw new AppError('Consultation not found', { status: 404 });
  }

  const updates: Partial<Consultation> = { status };

  // Auto-assign to admin if moving from pending to read
  if (status === 'read' && !consultation.assignedTo && adminId) {
    updates.assignedTo = adminId;
  }

  return repo.updateConsultation(id, updates);
}

export async function updateConsultation(
  id: string,
  updates: {
    status?: Consultation['status'];
    priority?: Consultation['priority'];
    assignedTo?: string;
    adminNotes?: string;
  }
) {
  const consultation = await repo.getConsultationById(id);
  
  if (!consultation) {
    throw new AppError('Consultation not found', { status: 404 });
  }

  return repo.updateConsultation(id, updates);
}

export async function deleteConsultation(id: string) {
  const consultation = await repo.getConsultationById(id);
  
  if (!consultation) {
    throw new AppError('Consultation not found', { status: 404 });
  }

  const deleted = await repo.deleteConsultation(id);
  
  if (!deleted) {
    throw new AppError('Failed to delete consultation', { status: 500 });
  }

  return { success: true };
}

export async function getConsultationStats() {
  return repo.getConsultationStats();
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidMobile(mobile: string): boolean {
  // Remove spaces, dashes, and parentheses
  const cleanMobile = mobile.replace(/[\s\-()]/g, '');
  // Check if it's 10-15 digits, optionally starting with +
  const mobileRegex = /^\+?\d{10,15}$/;
  return mobileRegex.test(cleanMobile);
}

