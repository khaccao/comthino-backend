type FaceAnalysis = {
  faceCount: number;
  embedding: number[];
  embeddingVersion?: string;
  quality?: {
    blur?: number;
    brightness?: number;
    faceSize?: number;
  };
};

const providerUrl = () => (process.env.FACE_RECOGNITION_API_URL || '').replace(/\/+$/, '');
const providerKey = () => process.env.FACE_RECOGNITION_API_KEY || '';

export const faceThreshold = () => Number(process.env.FACE_RECOGNITION_THRESHOLD || 0.75);
export const duplicateAttendanceWindowSeconds = () => Number(process.env.FACE_ATTENDANCE_DUPLICATE_SECONDS || 10);

const assertProvider = () => {
  const url = providerUrl();
  if (!url) {
    const error = new Error('Chưa cấu hình FACE_RECOGNITION_API_URL để phân tích/nhận diện khuôn mặt.');
    (error as any).code = 'FACE_RECOGNITION_NOT_CONFIGURED';
    throw error;
  }
  return url;
};

export const analyzeFaceImage = async (imageUrl: string): Promise<FaceAnalysis> => {
  const url = assertProvider();
  const response = await fetch(`${url}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(providerKey() ? { Authorization: `Bearer ${providerKey()}` } : {}),
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
