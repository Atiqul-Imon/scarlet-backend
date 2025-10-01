import type { RequestHandler, Request, Response, NextFunction } from 'express';

export function asyncHandler(
  handler: (req: Request, res: Response, next?: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}


