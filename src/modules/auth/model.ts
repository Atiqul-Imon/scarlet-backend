export interface User {
  _id?: string;
  email: string;
  passwordHash: string;
  name?: string;
  role: 'admin' | 'staff' | 'customer';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}


