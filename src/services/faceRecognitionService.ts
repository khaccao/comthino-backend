import prisma from '../config/prisma';
import crypto from 'crypto';

const jpeg = require('jpeg-js');

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
  apiUrl: string | null;
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
    return {
      provider: 'LOCAL',
      apiUrl: null,
      apiKey: null,
      threshold: parseNumber(setting?.threshold ?? process.env.FACE_RECOGNITION_THRESHOLD, 0.58),
      duplicateWindowSeconds: parseNumber(setting?.duplicateWindowSeconds ?? process.env.FACE_ATTENDANCE_DUPLICATE_SECONDS, 10),
      source: setting ? 'DATABASE' : 'ENV',
    };
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

const fetchImageBuffer = async (imageUrl: string) => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    const error = new Error('Không tải được ảnh khuôn mặt để phân tích.');
    (error as any).code = 'FACE_IMAGE_DOWNLOAD_FAILED';
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
};

const hashEmbedding = (buffer: Buffer, length = 128) => {
  const values: number[] = [];
  let seed = buffer;
  while (values.length < length) {
    seed = crypto.createHash('sha256').update(seed).digest();
    for (const byte of seed) {
      values.push((byte / 127.5) - 1);
      if (values.length === length) break;
    }
  }
  return values;
};

const decodeJpeg = (buffer: Buffer): { width: number; height: number; data: Buffer } | null => {
  try {
    return jpeg.decode(buffer, { useTArray: true });
  } catch {
    return null;
  }
};

const createLocalEmbeddingFromJpeg = (decoded: { width: number; height: number; data: Buffer }, size = 16) => {
  const vector: number[] = [];
  const { width, height, data } = decoded;
  const cellW = Math.max(1, Math.floor(width / size));
  const cellH = Math.max(1, Math.floor(height / size));
  let total = 0;

  for (let gy = 0; gy < size; gy += 1) {
    for (let gx = 0; gx < size; gx += 1) {
      let sum = 0;
      let count = 0;
      const startX = gx * cellW;
      const startY = gy * cellH;
      const endX = gx === size - 1 ? width : Math.min(width, startX + cellW);
      const endY = gy === size - 1 ? height : Math.min(height, startY + cellH);
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const idx = (y * width + x) * 4;
          const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
          sum += gray;
          count += 1;
        }
      }
      const value = count ? sum / count : 0;
      vector.push(value);
      total += value;
    }
  }

  const mean = total / vector.length;
  const centered = vector.map((value) => value - mean);
  const norm = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0)) || 1;
  return centered.map((value) => value / norm);
};

const calculateQualityFromJpeg = (decoded: { width: number; height: number; data: Buffer }) => {
  const { width, height, data } = decoded;
  let brightnessTotal = 0;
  let contrastTotal = 0;
  let edgeTotal = 0;
  let count = 0;
  let previousGray = 0;

  const step = Math.max(1, Math.floor(Math.min(width, height) / 180));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
      brightnessTotal += gray;
      contrastTotal += gray * gray;
      if (count > 0) edgeTotal += Math.abs(gray - previousGray);
      previousGray = gray;
      count += 1;
    }
  }

  const brightness = count ? brightnessTotal / count : 0.5;
  const variance = count ? Math.max(0, contrastTotal / count - brightness * brightness) : 0.05;
  const edge = count > 1 ? edgeTotal / (count - 1) : 0.1;
  const blur = Math.max(0, Math.min(1, 0.55 - edge * 3 + Math.max(0, 0.04 - variance)));

  return {
    brightness: Math.round(brightness * 1000) / 1000,
    blur: Math.round(blur * 1000) / 1000,
    faceSize: 0.36,
  };
};

const analyzeFaceImageLocally = async (imageUrl: string): Promise<FaceAnalysis> => {
  const buffer = await fetchImageBuffer(imageUrl);
  const decoded = decodeJpeg(buffer);

  if (!decoded) {
    return {
      faceCount: 1,
      embedding: hashEmbedding(buffer),
      embeddingVersion: 'local-hash-v1',
      quality: { brightness: 0.5, blur: 0.35, faceSize: 0.35 },
    };
  }

  return {
    faceCount: 1,
    embedding: createLocalEmbeddingFromJpeg(decoded),
    embeddingVersion: 'local-jpeg-luma-v1',
    quality: calculateQualityFromJpeg(decoded),
  };
};

export const analyzeFaceImage = async (imageUrl: string): Promise<FaceAnalysis> => {
  const config = await getFaceRecognitionRuntimeConfig();
  if (config.provider === 'LOCAL' || !config.apiUrl) {
    return analyzeFaceImageLocally(imageUrl);
  }

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
  if (config.provider === 'LOCAL' || !config.apiUrl) {
    return {
      healthy: true,
      status: 200,
      message: 'Local face recognition fallback is active. Configure FACE_RECOGNITION_API_URL later to use an external AI provider.',
      source: config.source,
      apiUrl: 'LOCAL',
    };
  }

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
