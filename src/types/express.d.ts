import 'express-serve-static-core';
import { User } from '../modules/auth/model';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    userId?: string;
  }
}


