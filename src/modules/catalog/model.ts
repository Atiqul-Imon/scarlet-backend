export interface Category { _id?: string; name: string; slug: string; parentId?: string | null; }
export interface ProductPrice { currency: string; amount: number; }
export interface Product { _id?: string; title: string; slug: string; description?: string; categoryIds: string[]; brand?: string; images: string[]; price: ProductPrice; stock: number; attributes?: Record<string, string | number | boolean>; createdAt?: string; updatedAt?: string; }


