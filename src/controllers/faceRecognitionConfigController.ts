import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
  checkFaceRecognitionProvider,
  duplicateAttendanceWindowSeconds,
  faceThreshold,
} from '../services/faceRecognitionService';

const configSchema = z.object({
  provider: z.string().trim().min(1).default('EXTERNAL'),
  apiUrl: z.string().trim().url().optional().or(z.literal('')),
  apiKey: z.string().optional().nullable(),
  threshold: z.coerce.number().min(0.1).max(0.99).default(0.75),
  duplicateWindowSeconds: z.coerce.number().int().min(3).max(3600).default(10),
  isActive: z.coerce.boolean().default(true),
});

const maskSecret = (value?: string | null) => {
  if (!value) return null;
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const serializeSetting = (setting: any) => {
  const envUrl = process.env.FACE_RECOGNITION_API_URL || '';
  const envKey = process.env.FACE_RECOGNITION_API_KEY || '';
  return {
    provider: setting?.provider || process.env.FACE_RECOGNITION_PROVIDER || 'EXTERNAL',
    apiUrl: setting?.apiUrl || '',
    hasApiKey: Boolean(setting?.apiKey),
    apiKeyMasked: maskSecret(setting?.apiKey),
    threshold: Number(setting?.threshold ?? faceThreshold()),
    duplicateWindowSeconds: Number(setting?.duplicateWindowSeconds ?? duplicateAttendanceWindowSeconds()),
    isActive: setting?.isActive ?? true,
    lastHealthStatus: setting?.lastHealthStatus || null,
    lastHealthMessage: setting?.lastHealthMessage || null,
    lastHealthCheckedAt: setting?.lastHealthCheckedAt || null,
    runtime: {
      source: envUrl ? 'ENV' : 'DATABASE',
      envConfigured: Boolean(envUrl),
      envApiUrl: envUrl ? `${envUrl.replace(/\/+$/, '')}` : null,
      envHasApiKey: Boolean(envKey),
    },
  };
};

export const getFaceRecognitionConfig = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.faceRecognitionSetting.findUnique({ where: { code: 'DEFAULT' } });
    res.json({ success: true, data: serializeSetting(setting) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được cấu hình nhận diện khuôn mặt.' });
  }
};

export const updateFaceRecognitionConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = configSchema.parse(req.body);
    const existing = await prisma.faceRecognitionSetting.findUnique({ where: { code: 'DEFAULT' } });
    const shouldUpdateApiKey = Object.prototype.hasOwnProperty.call(req.body, 'apiKey');

    const setting = await prisma.faceRecognitionSetting.upsert({
      where: { code: 'DEFAULT' },
      update: {
        provider: parsed.provider,
        apiUrl: parsed.apiUrl || null,
        ...(shouldUpdateApiKey ? { apiKey: parsed.apiKey ? parsed.apiKey.trim() : null } : {}),
        threshold: parsed.threshold,
        duplicateWindowSeconds: parsed.duplicateWindowSeconds,
        isActive: parsed.isActive,
      },
      create: {
        code: 'DEFAULT',
        provider: parsed.provider,
        apiUrl: parsed.apiUrl || null,
        apiKey: shouldUpdateApiKey && parsed.apiKey ? parsed.apiKey.trim() : null,
        threshold: parsed.threshold,
        duplicateWindowSeconds: parsed.duplicateWindowSeconds,
        isActive: parsed.isActive,
      },
    });

    res.json({
      success: true,
      data: serializeSetting(setting),
      message: existing ? 'Đã cập nhật cấu hình Face AI.' : 'Đã tạo cấu hình Face AI.',
    });
  } catch (error: any) {
    const status = error?.name === 'ZodError' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Không lưu được cấu hình nhận diện khuôn mặt.' });
  }
};

export const healthCheckFaceRecognition = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await checkFaceRecognitionProvider();
    res.status(result.healthy ? 200 : 502).json({ success: result.healthy, data: result });
  } catch (error: any) {
    const status = error.code === 'FACE_RECOGNITION_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({
      success: false,
      code: error.code || 'FACE_RECOGNITION_HEALTH_FAILED',
      message: error.message || 'Không kiểm tra được dịch vụ nhận diện khuôn mặt.',
    });
  }
};
