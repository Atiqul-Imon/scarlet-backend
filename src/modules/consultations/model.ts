export interface Consultation {
  _id: string;
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
  images?: string[]; // URLs of uploaded images (max 3)
  preferredContactMethod: 'phone' | 'email' | 'whatsapp';
  additionalComments?: string;
  status: 'pending' | 'read' | 'contacted' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string; // Admin user ID
  adminNotes?: string;
  contactedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsultationFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ConsultationStats {
  total: number;
  pending: number;
  read: number;
  contacted: number;
  resolved: number;
  closed: number;
}

