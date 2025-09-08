import type { RequestHandler } from 'express';

export function asyncHandler(
  handler: (req: any, res: any, next?: any) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}


