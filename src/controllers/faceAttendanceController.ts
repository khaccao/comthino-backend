import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
  analyzeFaceImage,
  cosineSimilarity,
  faceThreshold,
  getFaceRecognitionRuntimeConfig,
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
  action: z.enum(['AUTO', 'CHECK_IN', 'CHECK_OUT']).optional(),
  locationText: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  handoverImages: z.array(z.object({
    imageUrl: z.string().url(),
    imageKitFileId: z.string().optional().nullable(),
    caption: z.string().optional().nullable(),
  })).optional(),
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
const money = (value: any) => Number(value || 0);

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

const minutesFromTime = (value?: string | null) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const dateAtShiftTime = (workDate: Date, time?: string | null, endTime?: string | null, startTime?: string | null) => {
  const minutes = minutesFromTime(time);
  if (minutes === null) return null;
  const dateKey = vietnamDateKey(workDate);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const result = new Date(`${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000+07:00`);
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  if (start !== null && end !== null && end <= start && time === endTime) result.setDate(result.getDate() + 1);
  return result;
};

const positiveMinutes = (a: Date, b: Date) => Math.max(0, Math.round((a.getTime() - b.getTime()) / 60000));

const calculateRuleSnapshot = async (params: {
  clockIn: Date;
  clockOut?: Date | null;
  workDate: Date;
  shift?: any | null;
  hourlyRate: number;
  hasAssignment: boolean;
}) => {
  const rules = await prisma.attendanceRule.findMany({ where: { isActive: true } });
  const byType = new Map(rules.map((rule) => [rule.type, rule]));
  const shiftStart = params.shift ? dateAtShiftTime(params.workDate, params.shift.startTime, params.shift.endTime, params.shift.startTime) : null;
  const shiftEnd = params.shift ? dateAtShiftTime(params.workDate, params.shift.endTime, params.shift.endTime, params.shift.startTime) : null;
  const lateRule = byType.get('LATE');
  const earlyLeaveRule = byType.get('EARLY_LEAVE');
  const earlyInRule = byType.get('EARLY_IN');
  const overtimeRule = byType.get('OVERTIME');
  const missingShiftRule = byType.get('MISSING_SHIFT');
  const lateMinutes = shiftStart ? Math.max(0, positiveMinutes(params.clockIn, shiftStart) - money(lateRule?.thresholdMinutes)) : 0;
  const earlyInMinutes = shiftStart ? Math.max(0, positiveMinutes(shiftStart, params.clockIn) - money(earlyInRule?.thresholdMinutes)) : 0;
  const earlyLeaveMinutes = params.clockOut && shiftEnd ? Math.max(0, positiveMinutes(shiftEnd, params.clockOut) - money(earlyLeaveRule?.thresholdMinutes)) : 0;
  const overtimeMinutes = params.clockOut && shiftEnd ? Math.max(0, positiveMinutes(params.clockOut, shiftEnd) - money(overtimeRule?.thresholdMinutes)) : 0;
  const autoPenaltyAmount = Math.round(
    (lateMinutes > 0 ? money(lateRule?.amount) : 0) +
    (earlyLeaveMinutes > 0 ? money(earlyLeaveRule?.amount) : 0) +
    (!params.hasAssignment ? money(missingShiftRule?.amount) : 0),
  );
  const overtimeAmount = Math.round((overtimeMinutes / 60) * params.hourlyRate * money(overtimeRule?.rateMultiplier || 1));
  const ruleSummary = [
    lateMinutes > 0 ? `Đi muộn ${lateMinutes} phút` : null,
    earlyInMinutes > 0 ? `Đến sớm ${earlyInMinutes} phút` : null,
    earlyLeaveMinutes > 0 ? `Về sớm ${earlyLeaveMinutes} phút` : null,
    overtimeMinutes > 0 ? `Tăng ca ${overtimeMinutes} phút` : null,
    !params.hasAssignment ? 'Chưa có ca đã duyệt' : null,
  ].filter(Boolean).join('; ') || null;
  const approvalTypes = [
    !params.hasAssignment ? 'MISSING_SHIFT' : null,
    earlyInMinutes > 0 && earlyInRule?.requiresApproval ? 'EARLY_IN' : null,
    overtimeMinutes > 0 && overtimeRule?.requiresApproval ? 'OVERTIME' : null,
  ].filter(Boolean) as string[];
  return { lateMinutes, earlyInMinutes, earlyLeaveMinutes, overtimeMinutes, autoPenaltyAmount, overtimeAmount, ruleSummary, approvalTypes };
};

const ensureAttendanceApprovals = async (tx: any, attendanceId: string, employeeId: string, types: string[], requestedById?: string) => {
  for (const type of types) {
    const existing = await tx.attendanceApprovalRequest.findFirst({
      where: { attendanceRecordId: attendanceId, type, status: 'PENDING' },
    });
    if (!existing) {
      await tx.attendanceApprovalRequest.create({
        data: { attendanceRecordId: attendanceId, employeeId, type, status: 'PENDING', requestedById },
      });
    }
  }
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
    res.json({ success: true, data: { employees: employees.map(serializeEmployee), poses: poseValues, threshold: faceThreshold() } });
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
    const analyzed: Array<{ pose: typeof poseValues[number]; imageUrl: string; imageKitFileId?: string | null; analysis: Awaited<ReturnType<typeof analyzeFaceImage>> }> = [];
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
      await tx.employeeFaceRegistration.updateMany({ where: { employeeId: employee.id, isActive: true }, data: { isActive: false, status: 'DISABLED' } });
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
      await tx.payrollEmployee.update({ where: { id: employee.id }, data: { faceStatus: 'REGISTERED', faceRegisteredAt: created.registeredAt } });
      return created;
    });
    res.status(201).json({ success: true, data: registration });
  } catch (error: any) {
    const status = error.code === 'FACE_RECOGNITION_NOT_CONFIGURED' ? 503 : 400;
    res.status(status).json({ success: false, code: error.code || 'FACE_REGISTER_FAILED', message: error.message || 'Không đăng ký được khuôn mặt.' });
  }
};

export const recognizeFaceAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = recognizeSchema.parse(req.body);
    const runtimeConfig = await getFaceRecognitionRuntimeConfig();
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
        faceImages: { where: { isActive: true, registration: { isActive: true, status: 'REGISTERED' } } },
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
    if (!best || best.confidence < runtimeConfig.threshold) {
      res.status(403).json({
        success: false,
        code: best ? 'LOW_CONFIDENCE' : 'FACE_NOT_RECOGNIZED',
        message: 'Không nhận diện được nhân viên với độ tin cậy đủ cao.',
        data: { confidence: best?.confidence || 0, threshold: runtimeConfig.threshold },
      });
      return;
    }
    const employee = best.employee;
    const now = new Date();
    const todayStart = parseVietnamDateStart();
    const todayEnd = parseVietnamDateEnd();
    const recent = await prisma.attendanceRecord.findFirst({
      where: { employeeId: employee.id, recognizedAt: { gte: new Date(now.getTime() - runtimeConfig.duplicateWindowSeconds * 1000) } },
      orderBy: { recognizedAt: 'desc' },
    });
    if (recent) {
      res.json({ success: true, data: { duplicated: true, attendanceType: recent.clockOut ? 'CHECK_OUT' : 'CHECK_IN', attendance: recent, employee, confidence: best.confidence } });
      return;
    }
    const open = await prisma.attendanceRecord.findFirst({
      where: { employeeId: employee.id, workDate: { gte: todayStart, lte: todayEnd }, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });
    const assignment = await prisma.workShiftAssignment.findFirst({
      where: { employeeId: employee.id, workDate: { gte: todayStart, lte: todayEnd }, status: 'APPROVED' },
      include: { shift: true },
      orderBy: { approvedAt: 'desc' },
    });
    const activeShift = assignment?.shift || employee.defaultShift || null;
    const hourlyRate = Number(employee.hourlyRate ?? activeShift?.hourlyRate ?? 0);
    const baseFaceData = {
      faceCapturedImageUrl: data.imageUrl,
      faceImageKitFileId: data.imageKitFileId || null,
      recognitionStatus: 'MATCHED',
      recognitionConfidence: best.confidence,
      recognitionDeviceId: data.deviceId || null,
      recognitionLocationId: data.locationId || null,
      recognizedAt: now,
      locationText: data.locationText || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    };
    if (data.action === 'CHECK_IN' && open) {
      res.json({ success: true, data: { duplicated: true, attendanceType: 'CHECK_IN', attendance: open, employee, confidence: best.confidence } });
      return;
    }
    if (data.action === 'CHECK_OUT' && !open) {
      res.status(400).json({ success: false, code: 'NO_OPEN_ATTENDANCE', message: 'Nhân viên chưa có ca đang mở để chấm giờ về.' });
      return;
    }
    if (open) {
      const handoverImages = data.handoverImages || [];
      if (handoverImages.length < 3) {
        res.status(400).json({ success: false, code: 'HANDOVER_IMAGES_REQUIRED', message: 'Chấm giờ về cần ít nhất 3 ảnh bàn giao cuối ca.', data: { employee, attendance: open, requiredPhotos: 3 } });
        return;
      }
      const totals = calcAttendance(open.clockIn, now, open.breakMinutes, Number(open.hourlyRate || hourlyRate));
      const snapshot = await calculateRuleSnapshot({ clockIn: open.clockIn, clockOut: now, workDate: open.workDate, shift: activeShift, hourlyRate: Number(open.hourlyRate || hourlyRate), hasAssignment: Boolean(assignment) });
      const attendance = await prisma.$transaction(async (tx) => {
        const updated = await tx.attendanceRecord.update({
          where: { id: open.id },
          data: {
            clockOut: now,
            totalHours: totals.totalHours,
            grossAmount: totals.grossAmount,
            lateMinutes: snapshot.lateMinutes,
            earlyInMinutes: snapshot.earlyInMinutes,
            earlyLeaveMinutes: snapshot.earlyLeaveMinutes,
            overtimeMinutes: snapshot.overtimeMinutes,
            autoPenaltyAmount: snapshot.autoPenaltyAmount,
            overtimeAmount: snapshot.overtimeAmount,
            ruleSummary: snapshot.ruleSummary,
            approvalStatus: snapshot.approvalTypes.length ? 'PENDING' : open.approvalStatus,
            handoverStatus: 'SUBMITTED',
            ...baseFaceData,
            handoverPhotos: {
              create: handoverImages.map((image) => ({ employeeId: employee.id, imageUrl: image.imageUrl, imageKitFileId: image.imageKitFileId || null, caption: image.caption || null })),
            },
          },
          include: { employee: { include: { defaultShift: true } }, shift: true, handoverPhotos: true, approvals: true },
        });
        await ensureAttendanceApprovals(tx, open.id, employee.id, snapshot.approvalTypes, req.user?.id);
        return updated;
      });
      res.json({ success: true, data: { attendanceType: 'CHECK_OUT', attendance, employee, confidence: best.confidence, ruleSummary: snapshot.ruleSummary } });
      return;
    }
    const snapshot = await calculateRuleSnapshot({ clockIn: now, clockOut: null, workDate: todayStart, shift: activeShift, hourlyRate, hasAssignment: Boolean(assignment) });
    const attendance = await prisma.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        shiftId: activeShift?.id || null,
        shiftAssignmentId: assignment?.id || null,
        workDate: todayStart,
        clockIn: now,
        hourlyRate,
        totalHours: 0,
        grossAmount: 0,
        lateMinutes: snapshot.lateMinutes,
        earlyInMinutes: snapshot.earlyInMinutes,
        earlyLeaveMinutes: snapshot.earlyLeaveMinutes,
        overtimeMinutes: snapshot.overtimeMinutes,
        autoPenaltyAmount: snapshot.autoPenaltyAmount,
        overtimeAmount: snapshot.overtimeAmount,
        ruleSummary: snapshot.ruleSummary,
        approvalStatus: snapshot.approvalTypes.length ? 'PENDING' : 'NONE',
        handoverStatus: 'REQUIRED',
        note: 'Chấm công bằng nhận diện khuôn mặt',
        ...baseFaceData,
      },
      include: { employee: { include: { defaultShift: true } }, shift: true, handoverPhotos: true, approvals: true },
    });
    if (snapshot.approvalTypes.length) {
      await prisma.$transaction(async (tx) => {
        await ensureAttendanceApprovals(tx, attendance.id, employee.id, snapshot.approvalTypes, req.user?.id);
      });
    }
    res.status(201).json({ success: true, data: { attendanceType: 'CHECK_IN', attendance, employee, confidence: best.confidence, ruleSummary: snapshot.ruleSummary } });
  } catch (error: any) {
    const status = error.code === 'FACE_RECOGNITION_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ success: false, code: error.code || 'FACE_ATTENDANCE_FAILED', message: error.message || 'Không chấm công được bằng khuôn mặt.' });
  }
};
