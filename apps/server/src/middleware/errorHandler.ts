import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import logger from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    logger.warn('Upload rejected: file exceeds 5 MB limit');
    res.status(413).json({ success: false, message: 'Image too large — maximum size is 5 MB.' });
    return;
  }

  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const message = 'statusCode' in err ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    logger.error(message, { stack: err.stack, statusCode });
  } else if (process.env.NODE_ENV === 'development') {
    logger.warn(message, { statusCode });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
