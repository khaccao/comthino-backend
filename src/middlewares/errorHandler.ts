import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Handler]:', err.stack || err.message || err);

  const statusCode = err.status || 500;
  const message = err.message || 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
};
