import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const scheduleSchema = z.object({
  employeeId: z.string().min(1),
  shiftId: z.string().min(1),
  workDate: z.string().min(1),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  source: z.enum(['MANAGER_PLAN', 'STAFF_REQUEST']).optional(),
  note: z.string().optional().nullable(),
});

const assignmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  note: z.string().optional().nullable(),
});

const ruleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['LATE', 'EARLY_LEAVE', 'EARLY_IN', 'OVERTIME', 'MISSING_CHECKOUT', 'MISSING_SHIFT']),
  thresholdMinutes: z.coerce.number().min(0).default(0),
  amount: z.coerce.number().min(0).default(0),
  rateMultiplier: z.coerce.number().min(0).default(1),
  requiresApproval: z.boolean().optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const approvalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional().nullable(),
});

const money = (value: unknown) => Number(value || 0);

const isSuperAdmin = (req: AuthenticatedRequest) =>
  Boolean(req.user?.isSystemAdmin || req.user?.role === 'SUPERADMIN' || req.user?.roles?.includes('SUPERADMIN'));

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

const parseDateOnly = (value: string, endOfDay = false) => {
  const normalized = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`)
    : new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error('Ngày không hợp lệ.');
  return date;
};

const getDefaultWeek = () => {
  const today = parseDateOnly(vietnamDateKey());
  const day = today.getDay() || 7;
  const start = new Date(today);
  start.setDate(today.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end: parseDateOnly(end.toISOString().slice(0, 10), true) };
};

const minutesFromTime = (value?: string | null) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const shiftWindow = (shift: any) => {
  const start = minutesFromTime(shift?.startTime);
  const end = minutesFromTime(shift?.endTime);
  if (start === null || end === null) return null;
  return { start, end: end <= start ? end + 24 * 60 : end };
};

const overlaps = (a: any, b: any) => {
  const first = shiftWindow(a);
  const second = shiftWindow(b);
  if (!first || !second) return true;
  return first.start < second.end && second.start < first.end;
};

const serializeShift = (item: any) => ({ ...item, hourlyRate: money(item.hourlyRate) });
const serializeEmployee = (item: any) => ({
  ...item,
  hourlyRate: item.hourlyRate === null || item.hourlyRate === undefined ? null : money(item.hourlyRate),
  defaultShift: item.defaultShift ? serializeShift(item.defaultShift) : item.defaultShift,
});
const serializeRule = (item: any) => ({
  ...item,
  amount: money(item.amount),
  rateMultiplier: money(item.rateMultiplier),
});
const serializeAssignment = (item: any) => ({
  ...item,
  employee: item.employee ? serializeEmployee(item.employee) : item.employee,
  shift: item.shift ? serializeShift(item.shift) : item.shift,
});
const serializeAttendance = (item: any) => ({
  ...item,
  hourlyRate: money(item.hourlyRate),
  totalHours: money(item.totalHours),
  grossAmount: money(item.grossAmount),
  autoPenaltyAmount: money(item.autoPenaltyAmount),
  overtimeAmount: money(item.overtimeAmount),
  employee: item.employee ? serializeEmployee(item.employee) : item.employee,
  shift: item.shift ? serializeShift(item.shift) : item.shift,
  handoverPhotos: item.handoverPhotos || [],
  approvals: item.approvals || [],
});

const buildConflictWarning = async (employeeId: string, shiftId: string, workDate: Date, excludeId?: string) => {
  const shift = await prisma.workShift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error('Ca làm không tồn tại.');

  const existing = await prisma.workShiftAssignment.findMany({
    where: {
      employeeId,
      workDate,
      status: { in: ['PENDING', 'APPROVED'] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { shift: true },
  });

  const conflicts = existing.filter((item) => overlaps(shift, item.shift));
  if (conflicts.length) {
    throw new Error(`Nhân viên đã có ca ${conflicts[0].shift.name} trong ngày này.`);
  }

  const sameShiftCount = await prisma.workShiftAssignment.count({
    where: { shiftId, workDate, status: { in: ['PENDING', 'APPROVED'] }, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });

  return sameShiftCount > 0 ? `Ca này đã có ${sameShiftCount} nhân viên được xếp trước.` : null;
};

const ensureDefaultAttendanceRules = async () => {
  const defaults = [
    { code: 'LATE_10', name: 'Đi muộn quá 10 phút', type: 'LATE', thresholdMinutes: 10, amount: 20000, rateMultiplier: 1, requiresApproval: false },
    { code: 'EARLY_LEAVE_10', name: 'Về sớm quá 10 phút', type: 'EARLY_LEAVE', thresholdMinutes: 10, amount: 20000, rateMultiplier: 1, requiresApproval: false },
    { code: 'EARLY_IN_30', name: 'Đến sớm quá 30 phút', type: 'EARLY_IN', thresholdMinutes: 30, amount: 0, rateMultiplier: 1, requiresApproval: true },
    { code: 'OT_30', name: 'Tăng ca quá 30 phút', type: 'OVERTIME', thresholdMinutes: 30, amount: 0, rateMultiplier: 1.5, requiresApproval: true },
    { code: 'MISSING_SHIFT', name: 'Chấm công khi chưa có ca duyệt', type: 'MISSING_SHIFT', thresholdMinutes: 0, amount: 0, rateMultiplier: 1, requiresApproval: true },
  ];
  for (const item of defaults) {
    await prisma.attendanceRule.upsert({
      where: { code: item.code },
      update: {},
      create: { ...item, description: 'Rule mặc định của hệ thống HRM Cơm Thị Nở.' },
    });
  }
};

export const getHrmBootstrap = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureDefaultAttendanceRules();
    const defaultWeek = getDefaultWeek();
    const from = parseDateOnly(String(req.query.from || defaultWeek.start.toISOString().slice(0, 10)));
    const to = parseDateOnly(String(req.query.to || defaultWeek.end.toISOString().slice(0, 10)), true);

    const [employees, shifts, assignments, rules, attendances, approvalRequests] = await Promise.all([
      prisma.payrollEmployee.findMany({ where: { isActive: true }, include: { defaultShift: true }, orderBy: { fullName: 'asc' } }),
      prisma.workShift.findMany({ where: { isActive: true }, orderBy: [{ name: 'asc' }] }),
      prisma.workShiftAssignment.findMany({
        where: { workDate: { gte: from, lte: to } },
        include: { employee: { include: { defaultShift: true } }, shift: true },
        orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.attendanceRule.findMany({ orderBy: [{ isActive: 'desc' }, { type: 'asc' }, { thresholdMinutes: 'asc' }] }),
      prisma.attendanceRecord.findMany({
        where: { workDate: { gte: from, lte: to } },
        include: {
          employee: { include: { defaultShift: true } },
          shift: true,
          handoverPhotos: true,
          approvals: true,
        },
        orderBy: [{ workDate: 'desc' }, { clockIn: 'desc' }],
      }),
      prisma.attendanceApprovalRequest.findMany({
        where: { status: 'PENDING' },
        include: { attendance: { include: { employee: { include: { defaultShift: true } }, shift: true, handoverPhotos: true, approvals: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const pendingAssignments = assignments.filter((item) => item.status === 'PENDING').length;
    const pendingApprovals = approvalRequests.length;
    const missingHandover = attendances.filter((item) => item.handoverStatus === 'MISSING').length;

    res.json({
      success: true,
      data: {
        range: { from: from.toISOString(), to: to.toISOString() },
        employees: employees.map(serializeEmployee),
        shifts: shifts.map(serializeShift),
        assignments: assignments.map(serializeAssignment),
        rules: rules.map(serializeRule),
        attendances: attendances.map(serializeAttendance),
        approvalRequests,
        summary: {
          activeEmployees: employees.length,
          activeShifts: shifts.length,
          pendingAssignments,
          pendingApprovals,
          missingHandover,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được dữ liệu HRM.' });
  }
};

export const createShiftAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = scheduleSchema.parse(req.body);
    const workDate = parseDateOnly(data.workDate);
    const conflictWarning = await buildConflictWarning(data.employeeId, data.shiftId, workDate);
    const canApprove = isSuperAdmin(req);
    const status = data.status || (canApprove && data.source !== 'STAFF_REQUEST' ? 'APPROVED' : 'PENDING');

    const item = await prisma.workShiftAssignment.create({
      data: {
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        workDate,
        status,
        source: data.source || 'MANAGER_PLAN',
        note: data.note || null,
        requestedById: req.user?.id,
        approvedById: status === 'APPROVED' ? req.user?.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        conflictWarning,
      },
      include: { employee: { include: { defaultShift: true } }, shift: true },
    });
    res.status(201).json({ success: true, item: serializeAssignment(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: error.errors[0].message });
    res.status(400).json({ success: false, message: error.message || 'Không xếp được ca.' });
  }
};

export const updateShiftAssignmentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = assignmentStatusSchema.parse(req.body);
    const item = await prisma.workShiftAssignment.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        note: data.note ?? undefined,
        approvedById: ['APPROVED', 'REJECTED'].includes(data.status) ? req.user?.id : undefined,
        approvedAt: ['APPROVED', 'REJECTED'].includes(data.status) ? new Date() : undefined,
      },
      include: { employee: { include: { defaultShift: true } }, shift: true },
    });
    res.json({ success: true, item: serializeAssignment(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: error.errors[0].message });
    res.status(400).json({ success: false, message: error.message || 'Không cập nhật được ca.' });
  }
};

export const upsertAttendanceRule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = ruleSchema.parse(req.body);
    const payload = {
      code: data.code.toUpperCase(),
      name: data.name,
      type: data.type,
      thresholdMinutes: data.thresholdMinutes,
      amount: data.amount,
      rateMultiplier: data.rateMultiplier,
      requiresApproval: data.requiresApproval ?? false,
      description: data.description || null,
      isActive: data.isActive ?? true,
    };
    const item = req.params.id
      ? await prisma.attendanceRule.update({ where: { id: req.params.id }, data: payload })
      : await prisma.attendanceRule.upsert({
        where: { code: payload.code },
        update: payload,
        create: payload,
      });
    res.json({ success: true, item: serializeRule(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: error.errors[0].message });
    res.status(400).json({ success: false, message: error.message || 'Không lưu được rule chấm công.' });
  }
};

export const deleteAttendanceRule = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.attendanceRule.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Đã ẩn rule chấm công.' });
};

export const decideAttendanceApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = approvalSchema.parse(req.body);
    const item = await prisma.attendanceApprovalRequest.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        reason: data.reason || null,
        approvedById: req.user?.id,
        approvedAt: new Date(),
      },
      include: { attendance: true },
    });

    const pending = await prisma.attendanceApprovalRequest.count({
      where: { attendanceRecordId: item.attendanceRecordId, status: 'PENDING' },
    });

    await prisma.attendanceRecord.update({
      where: { id: item.attendanceRecordId },
      data: { approvalStatus: pending > 0 ? 'PENDING' : 'APPROVED' },
    });

    res.json({ success: true, item });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: error.errors[0].message });
    res.status(400).json({ success: false, message: error.message || 'Không duyệt được ngoại lệ chấm công.' });
  }
};
