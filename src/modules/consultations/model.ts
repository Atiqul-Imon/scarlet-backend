export interface Consultation {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  subject: string;
  message: string;
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

