import prisma from '../config/prisma';

export type FaceAnalysis = {
  faceCount: number;
  embedding: number[];
  embeddingVersion?: string;
  quality?: {
    blur?: number;
    brightness?: number;
    faceSize?: number;
  };
};

export type FaceRecognitionRuntimeConfig = {
  provider: string;
  apiUrl: string;
  apiKey?: string | null;
  threshold: number;
  duplicateWindowSeconds: number;
  source: 'ENV' | 'DATABASE';
};

const cleanUrl = (value?: string | null) => String(value || '').trim().replace(/\/+$/, '');

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const faceThreshold = () => parseNumber(process.env.FACE_RECOGNITION_THRESHOLD, 0.75);
export const duplicateAttendanceWindowSeconds = () => parseNumber(process.env.FACE_ATTENDANCE_DUPLICATE_SECONDS, 10);

export const getFaceRecognitionRuntimeConfig = async (): Promise<FaceRecognitionRuntimeConfig> => {
  const envUrl = cleanUrl(process.env.FACE_RECOGNITION_API_URL);
  if (envUrl) {
    return {
      provider: process.env.FACE_RECOGNITION_PROVIDER || 'EXTERNAL',
      apiUrl: envUrl,
      apiKey: process.env.FACE_RECOGNITION_API_KEY || null,
      threshold: faceThreshold(),
      duplicateWindowSeconds: duplicateAttendanceWindowSeconds(),
      source: 'ENV',
    };
  }

  const setting = await prisma.faceRecognitionSetting.findUnique({ where: { code: 'DEFAULT' } });
  const dbUrl = cleanUrl(setting?.apiUrl);
  if (!setting || !setting.isActive || !dbUrl) {
    const error = new Error('Chưa cấu hình FACE_RECOGNITION_API_URL để phân tích/nhận diện khuôn mặt.');
    (error as any).code = 'FACE_RECOGNITION_NOT_CONFIGURED';
    throw error;
  }

  return {
    provider: setting.provider || 'EXTERNAL',
    apiUrl: dbUrl,
    apiKey: setting.apiKey || null,
    threshold: parseNumber(setting.threshold, 0.75),
    duplicateWindowSeconds: parseNumber(setting.duplicateWindowSeconds, 10),
    source: 'DATABASE',
  };
};

export const analyzeFaceImage = async (imageUrl: string): Promise<FaceAnalysis> => {
  const config = await getFaceRecognitionRuntimeConfig();
  const response = await fetch(`${config.apiUrl}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'Dịch vụ nhận diện khuôn mặt không phản hồi hợp lệ.');
  }

  const data = await response.json() as FaceAnalysis;
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    const error = new Error('Dịch vụ nhận diện không trả embedding khuôn mặt.');
    (error as any).code = 'FACE_EMBEDDING_MISSING';
    throw error;
  }

  return {
    faceCount: Number(data.faceCount || 0),
    embedding: data.embedding.map(Number),
    embeddingVersion: data.embeddingVersion || 'external-v1',
    quality: data.quality,
  };
};

export const checkFaceRecognitionProvider = async () => {
  const config = await getFaceRecognitionRuntimeConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${config.apiUrl}/health`, {
      method: 'GET',
      headers: {
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      signal: controller.signal,
    });
    const message = await response.text().catch(() => '');
    const healthy = response.ok;

    if (config.source === 'DATABASE') {
      await prisma.faceRecognitionSetting.update({
        where: { code: 'DEFAULT' },
        data: {
          lastHealthStatus: healthy ? 'OK' : 'FAILED',
          lastHealthMessage: message.slice(0, 1000),
          lastHealthCheckedAt: new Date(),
        },
      });
    }

    return {
      healthy,
      status: response.status,
      message: message.slice(0, 1000),
      source: config.source,
      apiUrl: config.apiUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const cosineSimilarity = (a: number[], b: number[]) => {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const parseStoredEmbedding = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};
