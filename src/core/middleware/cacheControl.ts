import type { Request, Response, NextFunction } from 'express';

// Cache control middleware for different types of content
export function setCacheHeaders(type: 'dynamic' | 'semi-static' | 'static') {
  return (req: Request, res: Response, next: NextFunction) => {
    switch (type) {
      case 'dynamic':
        // No caching for dynamic content (cart, orders, auth, etc.)
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });
        break;
        
      case 'semi-static':
        // Short cache for semi-static content (products, categories)
        res.set({
          'Cache-Control': 'public, max-age=300, s-maxage=600', // 5-10 minutes
        });
        break;
        
      case 'static':
        // Long cache for static content (images, etc.)
        res.set({
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        });
        break;
    }
    
    next();
  };
}

// Specific middleware for cart endpoints
export function noCacheCart(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  next();
}

// Specific middleware for order endpoints
export function noCacheOrders(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  next();
}

// Specific middleware for auth endpoints
export function noCacheAuth(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  next();
}

// Specific middleware for user endpoints
export function noCacheUsers(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  next();
}

// Specific middleware for checkout/payment endpoints
export function noCacheCheckout(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  next();
}

// Specific middleware for semi-static content
export function shortCacheSemiStatic(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600', // 5-10 minutes
  });
  next();
}
