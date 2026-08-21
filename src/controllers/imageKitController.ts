import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { getImageKitUploadAuth } from '../services/imageKitService';

export const getImageKitAuth = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, data: getImageKitUploadAuth() });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Không tạo được chữ ký upload ImageKit.',
      code: 'IMAGEKIT_CONFIG_MISSING',
    });
  }
};
