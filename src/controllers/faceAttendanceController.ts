import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
  analyzeFaceImage,
  cosineSimilarity,
  duplicateAttendanceWindowSeconds,
  faceThreshold,
  parseStoredEmbedding,
} from '../services/faceRecognitionService';

const poseValues = ['FRONT', 'LEFT', 'RIGHT'] as const;

const faceImageSchema = z.object({
  pose: z.enum(poseValues),
  imageUrl: z.string().url(),
  imageKitFileId: z.string().optional().nullable(),
});

const registerSchema = z.object({
  employeeId: z.string().min(1),
  images: z.array(faceImageSchema).length(3),
});

const recognizeSchema = z.object({
  imageUrl: z.string().url(),
  imageKitFileId: z.string().optional().nullable(),
  deviceId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
});

const vietnamDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const parseVietnamDateStart = (value = vietnamDateKey()) => new Date(`${value}T00:00:00.000+07:00`);
const parseVietnamDateEnd = (value = vietnamDateKey()) => new Date(`${value}T23:59:59.999+07:00`);

const serializeEmployee = (item: any) => ({
  ...item,
  hourlyRate: item.hourlyRate === null || item.hourlyRate === undefined ? null : Number(item.hourlyRate),
  defaultShift: item.defaultShift ? { ...item.defaultShift, hourlyRate: Number(item.defaultShift.hourlyRate || 0) } : item.defaultShift,
  faceRegistrations: item.faceRegistrations || [],
});

const calcAttendance = (clockIn: Date, clockOut: Date | null, breakMinutes: number, hourlyRate: number) => {
  if (!clockOut) return { totalHours: 0, grossAmount: 0 };
  const minutes = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 60000 - breakMinutes);
  const totalHours = Math.round((minutes / 60) * 100) / 100;
  return { totalHours, grossAmount: Math.round(totalHours * hourlyRate) };
};

export const getFaceRegistrationBootstrap = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await prisma.payrollEmployee.findMany({
      where: { isActive: true },
      include: {
        branch: true,
        defaultShift: true,
        faceRegistrations: {
          where: { isActive: true },
          include: { images: true },
          orderBy: { registeredAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ fullName: 'asc' }],
    });

    res.json({
      success: true,
      data: {
        employees: employees.map(serializeEmployee),
        poses: poseValues,
        threshold: faceThreshold(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được danh sách đăng ký khuôn mặt.' });
  }
};

export const registerEmployeeFace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const poses = new Set(data.images.map((item) => item.pose));
    if (!poseValues.every((pose) => poses.has(pose))) {
      res.status(400).json({ success: false, code: 'MISSING_FACE_POSE', message: 'Cần đủ 3 ảnh: chính diện, trái, phải.' });
      return;
    }

    const employee = await prisma.payrollEmployee.findUnique({ where: { id: data.employeeId } });
    if (!employee || !employee.isActive) {
      res.status(404).json({ success: false, code: 'EMPLOYEE_NOT_ACTIVE', message: 'Nhân viên không tồn tại hoặc đã nghỉ.' });
      return;
    }

    const analyzed: Array<{
      pose: typeof poseValues[number];
      imageUrl: string;
      imageKitFileId?: string | null;
      analysis: Awaited<ReturnType<typeof analyzeFaceImage>>;
    }> = [];
    for (const image of data.images) {
      const analysis = await analyzeFaceImage(image.imageUrl);
      if (analysis.faceCount !== 1) {
        res.status(400).json({
          success: false,
          code: analysis.faceCount > 1 ? 'MULTIPLE_FACES' : 'NO_FACE',
          message: analysis.faceCount > 1 ? 'Ảnh có nhiều hơn 1 khuôn mặt.' : 'Không phát hiện khuôn mặt rõ ràng.',
        });
        return;
      }
      analyzed.push({ ...image, analysis });
    }

    const registration = await prisma.$transaction(async (tx) => {
      await tx.employeeFaceRegistration.updateMany({
        where: { employeeId: employee.id, isActive: true },
        data: { isActive: false, status: 'DISABLED' },
      });

      const created = await tx.employeeFaceRegistration.create({
        data: {
          employeeId: employee.id,
          employeeCode: employee.code,
          status: 'REGISTERED',
          registeredBy: req.user?.id,
          images: {
            create: analyzed.map((item) => ({
              employeeId: employee.id,
              pose: item.pose,
              imageUrl: item.imageUrl,
              imageKitFileId: item.imageKitFileId || null,
              faceDetected: true,
              faceCount: item.analysis.faceCount,
              embedding: JSON.stringify(item.analysis.embedding),
              embeddingVersion: item.analysis.embeddingVersion || 'external-v1',
            })),
          },
        },
        include: { images: true },
      });

      await tx.payrollEmployee.update({
        where: { id: employee.id },
        data: { faceStatus: 'REGISTERED', faceRegisteredAt: created.registeredAt },
      });

      return created;
    });

    res.status(201).json({ success: true, data: registration });
  } catch (error: any) {
    const status = error.code === 'FACE_RECOGNITION_NOT_CONFIGURED' ? 503 : 400;
    res.status(status).json({
      success: false,
      code: error.code || 'FACE_REGISTER_FAILED',
      message: error.message || 'Không đăng ký được khuôn mặt.',
    });
  }
};

export const recognizeFaceAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = recognizeSchema.parse(req.body);
    const analysis = await analyzeFaceImage(data.imageUrl);
    if (analysis.faceCount !== 1) {
      res.status(400).json({
        success: false,
        code: analysis.faceCount > 1 ? 'MULTIPLE_FACES' : 'NO_FACE',
        message: analysis.faceCount > 1 ? 'Ảnh có nhiều hơn 1 khuôn mặt.' : 'Không phát hiện khuôn mặt rõ ràng.',
      });
      return;
    }

    const employees = await prisma.payrollEmployee.findMany({
      where: { isActive: true, faceRegistrations: { some: { isActive: true, status: 'REGISTERED' } } },
      include: {
        defaultShift: true,
        faceImages: {
          where: { isActive: true, registration: { isActive: true, status: 'REGISTERED' } },
        },
      },
    });

    let best: { employee: any; confidence: number } | null = null;
    for (const employee of employees) {
      const similarities = employee.faceImages
        .map((image: any) => cosineSimilarity(analysis.embedding, parseStoredEmbedding(image.embedding)))
        .filter((value: number) => Number.isFinite(value));
      const confidence = similarities.length ? Math.max(...similarities) : 0;
      if (!best || confidence > best.confidence) best = { employee, confidence };
    }

    if (!best || best.confidence < faceThreshold()) {
      res.status(403).json({
        success: false,
        code: best ? 'LOW_CONFIDENCE' : 'FACE_NOT_RECOGNIZED',
        message: 'Không nhận diện được nhân viên với độ tin cậy đủ cao.',
        data: { confidence: best?.confidence || 0, threshold: faceThreshold() },
      });
      return;
    }

    const employee = best.employee;
    const now = new Date();
    const todayStart = parseVietnamDateStart();
    const todayEnd = parseVietnamDateEnd();
    const recent = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: employee.id,
        recognizedAt: { gte: new Date(now.getTime() - duplicateAttendanceWindowSeconds() * 1000) },
      },
      orderBy: { recognizedAt: 'desc' },
    });
    if (recent) {
      res.json({
        success: true,
        data: { duplicated: true, attendanceType: recent.clockOut ? 'CHECK_OUT' : 'CHECK_IN', attendance: recent, employee, confidence: best.confidence },
      });
      return;
    }

    const open = await prisma.attendanceRecord.findFirst({
      where: { employeeId: employee.id, workDate: { gte: todayStart, lte: todayEnd }, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });

    const hourlyRate = Number(employee.hourlyRate ?? employee.defaultShift?.hourlyRate ?? 0);
    const baseFaceData = {
      faceCapturedImageUrl: data.imageUrl,
      faceImageKitFileId: data.imageKitFileId || null,
      recognitionStatus: 'MATCHED',
      recognitionConfidence: best.confidence,
      recognitionDeviceId: data.deviceId || null,
      recognitionLocationId: data.locationId || null,
      recognizedAt: now,
    };

    if (open) {
      const totals = calcAttendance(open.clockIn, now, open.breakMinutes, Number(open.hourlyRate || hourlyRate));
      const attendance = await prisma.attendanceRecord.update({
        where: { id: open.id },
        data: {
          clockOut: now,
          totalHours: totals.totalHours,
          grossAmount: totals.grossAmount,
          ...baseFaceData,
        },
        include: { employee: { include: { defaultShift: true } }, shift: true },
      });
      res.json({ success: true, data: { attendanceType: 'CHECK_OUT', attendance, employee, confidence: best.confidence } });
      return;
    }

    const attendance = await prisma.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        shiftId: employee.defaultShiftId || null,
        workDate: todayStart,
        clockIn: now,
        hourlyRate,
        totalHours: 0,
        grossAmount: 0,
        note: 'Chấm công bằng nhận diện khuôn mặt',
        ...baseFaceData,
      },
      include: { employee: { include: { defaultShift: true } }, shift: true },
    });

    res.status(201).json({ success: true, data: { attendanceType: 'CHECK_IN', attendance, employee, confidence: best.confidence } });
  } catch (error: any) {
    const status = error.code === 'FACE_RECOGNITION_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({
      success: false,
      code: error.code || 'FACE_ATTENDANCE_FAILED',
      message: error.message || 'Không chấm công được bằng khuôn mặt.',
    });
  }
};
