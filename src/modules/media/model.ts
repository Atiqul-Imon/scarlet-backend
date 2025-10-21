export interface MediaFile {
  _id?: string;
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
  category: 'product' | 'category' | 'blog' | 'general';
  uploadedBy: string; // userId
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaFilters {
  category?: string;
  tags?: string[];
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  mimeType?: string;
}

export interface MediaUploadRequest {
  file: File;
  alt?: string;
  caption?: string;
  tags?: string[];
  category: 'product' | 'category' | 'blog' | 'general';
}

export interface MediaUpdateRequest {
  alt?: string;
  caption?: string;
  tags?: string[];
  category?: 'product' | 'category' | 'blog' | 'general';
  isActive?: boolean;
}
