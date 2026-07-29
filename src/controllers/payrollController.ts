import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const shiftSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  hourlyRate: z.coerce.number().min(0).default(0),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const employeeSchema = z.object({
  code: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  defaultShiftId: z.string().optional().nullable(),
  hourlyRate: z.coerce.number().min(0).optional().nullable(),
  note: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  shiftId: z.string().optional().nullable(),
  workDate: z.string().min(1),
  clockIn: z.string().min(1),
  clockOut: z.string().optional().nullable(),
  breakMinutes: z.coerce.number().min(0).default(0),
  hourlyRate: z.coerce.number().min(0).optional().nullable(),
  note: z.string().optional().nullable(),
  status: z.string().optional(),
});

const runSchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  note: z.string().optional().nullable(),
});

const kpiLevelSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  minScore: z.coerce.number().min(0).default(0),
  maxScore: z.coerce.number().min(0).optional().nullable(),
  rewardAmount: z.coerce.number().min(0).default(0),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const kpiRecordSchema = z.object({
  employeeId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  score: z.coerce.number().min(0).default(0),
  levelId: z.string().optional().nullable(),
  rewardAmount: z.coerce.number().min(0).optional().nullable(),
  note: z.string().optional().nullable(),
  status: z.string().optional(),
});

const rewardPenaltyCategorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['BONUS', 'PENALTY']).default('BONUS'),
  severity: z.string().optional().nullable(),
  defaultAmount: z.coerce.number().min(0).default(0),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const rewardPenaltySchema = z.object({
  employeeId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  type: z.enum(['BONUS', 'PENALTY']).default('BONUS'),
  severity: z.string().optional().nullable(),
  incidentDate: z.string().min(1),
  amount: z.coerce.number().min(0).default(0),
  reason: z.string().min(1),
  status: z.string().optional(),
  note: z.string().optional().nullable(),
});

const money = (value: any) => Number(value || 0);
const round2 = (value: number) => Math.round(value * 100) / 100;

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

const combineWorkDateAndTime = (workDate: string, value: string) => {
  const raw = String(value).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const time = raw.length === 5 ? `${raw}:00` : raw;
    const date = new Date(`${workDate}T${time}.000+07:00`);
    if (Number.isNaN(date.getTime())) throw new Error('Giờ chấm công không hợp lệ.');
    return date;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error('Giờ chấm công không hợp lệ.');
  return date;
};

const calcAttendance = (clockIn: Date, clockOut: Date | null, breakMinutes: number, hourlyRate: number) => {
  if (!clockOut) return { totalHours: 0, grossAmount: 0 };
  const minutes = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 60000 - breakMinutes);
  const totalHours = round2(minutes / 60);
  return { totalHours, grossAmount: Math.round(totalHours * hourlyRate) };
};

const serializeShift = (item: any) => ({
  ...item,
  hourlyRate: money(item.hourlyRate),
});

const serializeEmployee = (item: any) => ({
  ...item,
  hourlyRate: item.hourlyRate === null || item.hourlyRate === undefined ? null : money(item.hourlyRate),
  defaultShift: item.defaultShift ? serializeShift(item.defaultShift) : item.defaultShift,
});

const serializeAttendance = (item: any) => ({
  ...item,
  hourlyRate: money(item.hourlyRate),
  totalHours: money(item.totalHours),
  grossAmount: money(item.grossAmount),
  employee: item.employee ? serializeEmployee(item.employee) : item.employee,
  shift: item.shift ? serializeShift(item.shift) : item.shift,
});

const serializeRun = (item: any) => ({
  ...item,
  totalHours: money(item.totalHours),
  totalAmount: money(item.totalAmount),
  totalKpiReward: money(item.totalKpiReward),
  totalBonus: money(item.totalBonus),
  totalPenalty: money(item.totalPenalty),
  netAmount: money(item.netAmount),
  lines: (item.lines || []).map((line: any) => ({
    ...line,
    totalHours: money(line.totalHours),
    hourlyRate: money(line.hourlyRate),
    grossAmount: money(line.grossAmount),
    kpiScore: line.kpiScore === null || line.kpiScore === undefined ? null : money(line.kpiScore),
    kpiRewardAmount: money(line.kpiRewardAmount),
    bonusAmount: money(line.bonusAmount),
    penaltyAmount: money(line.penaltyAmount),
    netAmount: money(line.netAmount),
  })),
});

const serializeKpiLevel = (item: any) => ({
  ...item,
  minScore: money(item.minScore),
  maxScore: item.maxScore === null || item.maxScore === undefined ? null : money(item.maxScore),
  rewardAmount: money(item.rewardAmount),
});

const serializeKpiRecord = (item: any) => ({
  ...item,
  score: money(item.score),
  rewardAmount: money(item.rewardAmount),
  employee: item.employee ? serializeEmployee(item.employee) : item.employee,
  level: item.level ? serializeKpiLevel(item.level) : item.level,
});

const serializeRewardPenaltyCategory = (item: any) => ({
  ...item,
  defaultAmount: money(item.defaultAmount),
});

const serializeRewardPenalty = (item: any) => ({
  ...item,
  amount: money(item.amount),
  employee: item.employee ? serializeEmployee(item.employee) : item.employee,
  category: item.category ? serializeRewardPenaltyCategory(item.category) : item.category,
});

const getRateForAttendance = async (employeeId: string, shiftId?: string | null, explicitRate?: number | null) => {
  if (explicitRate !== null && explicitRate !== undefined) return explicitRate;
  const employee = await prisma.payrollEmployee.findUnique({ where: { id: employeeId }, include: { defaultShift: true } });
  const shift = shiftId ? await prisma.workShift.findUnique({ where: { id: shiftId } }) : employee?.defaultShift;
  return money(employee?.hourlyRate ?? shift?.hourlyRate ?? 0);
};

const resolveAttendanceMasterData = async (employeeId: string, shiftId?: string | null) => {
  const employee = await prisma.payrollEmployee.findUnique({ where: { id: employeeId }, include: { defaultShift: true } });
  if (!employee) throw new Error('Không tìm thấy nhân viên chấm công.');
  const finalShiftId = shiftId || employee.defaultShiftId || null;
  const shift = finalShiftId ? await prisma.workShift.findUnique({ where: { id: finalShiftId } }) : employee.defaultShift;
  if (finalShiftId && !shift) throw new Error('Ca làm không hợp lệ hoặc đã bị xóa.');
  return { employee, shift, shiftId: shift?.id || null };
};

const normalizeClockOut = (clockIn: Date, clockOut: Date | null) => {
  if (!clockOut) return null;
  if (clockOut.getTime() < clockIn.getTime()) {
    const next = new Date(clockOut);
    next.setDate(next.getDate() + 1);
    return next;
  }
  return clockOut;
};

const resolveKpiLevel = async (score: number, explicitLevelId?: string | null) => {
  if (explicitLevelId) {
    const level = await prisma.kpiLevel.findUnique({ where: { id: explicitLevelId } });
    if (!level) throw new Error('Cấp KPI không hợp lệ.');
    return level;
  }

  const levels = await prisma.kpiLevel.findMany({
    where: { isActive: true },
    orderBy: [{ minScore: 'desc' }],
  });
  return levels.find((level) => score >= money(level.minScore) && (level.maxScore === null || score <= money(level.maxScore))) || null;
};

export const getPayrollBootstrap = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStart = parseDateOnly(vietnamDateKey());
    const todayEnd = parseDateOnly(vietnamDateKey(), true);
    const monthStartDate = parseDateOnly(vietnamDateKey().slice(0, 8) + '01');
    const [shifts, employees, attendances, runs, kpiLevels, kpiRecords, adjustmentCategories, adjustments] = await Promise.all([
      prisma.workShift.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
      prisma.payrollEmployee.findMany({ include: { defaultShift: true }, orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }] }),
      prisma.attendanceRecord.findMany({
        where: { workDate: { gte: todayStart, lte: todayEnd } },
        include: { employee: { include: { defaultShift: true } }, shift: true },
        orderBy: [{ workDate: 'desc' }, { clockIn: 'desc' }],
      }),
      prisma.payrollRun.findMany({ include: { lines: true }, orderBy: { createdAt: 'desc' }, take: 12 }),
      prisma.kpiLevel.findMany({ orderBy: [{ isActive: 'desc' }, { minScore: 'asc' }] }),
      prisma.employeeKpiRecord.findMany({
        where: { periodEnd: { gte: monthStartDate } },
        include: { employee: { include: { defaultShift: true } }, level: true },
        orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
        take: 80,
      }),
      prisma.rewardPenaltyCategory.findMany({ orderBy: [{ isActive: 'desc' }, { type: 'asc' }, { name: 'asc' }] }),
      prisma.employeeRewardPenalty.findMany({
        where: { incidentDate: { gte: monthStartDate } },
        include: { employee: { include: { defaultShift: true } }, category: true },
        orderBy: [{ incidentDate: 'desc' }, { createdAt: 'desc' }],
        take: 120,
      }),
    ]);
    res.json({
      success: true,
      data: {
        shifts: shifts.map(serializeShift),
        employees: employees.map(serializeEmployee),
        attendances: attendances.map(serializeAttendance),
        runs: runs.map(serializeRun),
        kpiLevels: kpiLevels.map(serializeKpiLevel),
        kpiRecords: kpiRecords.map(serializeKpiRecord),
        adjustmentCategories: adjustmentCategories.map(serializeRewardPenaltyCategory),
        adjustments: adjustments.map(serializeRewardPenalty),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Không tải được dữ liệu chấm công lương.' });
  }
};

export const getWorkShifts = async (_req: AuthenticatedRequest, res: Response) => {
  const items = await prisma.workShift.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  res.json({ success: true, items: items.map(serializeShift) });
};

export const createWorkShift = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = shiftSchema.parse(req.body);
    const item = await prisma.workShift.create({ data });
    res.status(201).json({ success: true, item: serializeShift(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.code === 'P2002' ? 'Mã ca đã tồn tại.' : 'Không tạo được ca làm.' });
  }
};

export const updateWorkShift = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = shiftSchema.partial().parse(req.body);
    const item = await prisma.workShift.update({ where: { id: req.params.id }, data });
    res.json({ success: true, item: serializeShift(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Không cập nhật được ca làm.' });
  }
};

export const deleteWorkShift = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.workShift.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Đã ẩn ca làm.' });
};

export const getPayrollEmployees = async (_req: AuthenticatedRequest, res: Response) => {
  const items = await prisma.payrollEmployee.findMany({ include: { defaultShift: true }, orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }] });
  res.json({ success: true, items: items.map(serializeEmployee) });
};

export const createPayrollEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = employeeSchema.parse(req.body);
    const item = await prisma.payrollEmployee.create({ data, include: { defaultShift: true } });
    res.status(201).json({ success: true, item: serializeEmployee(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.code === 'P2002' ? 'Mã nhân viên đã tồn tại.' : 'Không tạo được nhân viên.' });
  }
};

export const updatePayrollEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = employeeSchema.partial().parse(req.body);
    const item = await prisma.payrollEmployee.update({ where: { id: req.params.id }, data, include: { defaultShift: true } });
    res.json({ success: true, item: serializeEmployee(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Không cập nhật được nhân viên.' });
  }
};

export const deletePayrollEmployee = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.payrollEmployee.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Đã ẩn nhân viên.' });
};

export const getAttendances = async (req: AuthenticatedRequest, res: Response) => {
  const defaultDate = vietnamDateKey();
  const from = parseDateOnly(String(req.query.from || defaultDate));
  const to = parseDateOnly(String(req.query.to || req.query.from || defaultDate), true);
  const items = await prisma.attendanceRecord.findMany({
    where: { workDate: { gte: from, lte: to } },
    include: { employee: { include: { defaultShift: true } }, shift: true },
    orderBy: [{ workDate: 'desc' }, { clockIn: 'desc' }],
  });
  res.json({ success: true, items: items.map(serializeAttendance) });
};

export const createAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = attendanceSchema.parse(req.body);
    const master = await resolveAttendanceMasterData(data.employeeId, data.shiftId);
    const workDate = parseDateOnly(data.workDate);
    const clockIn = combineWorkDateAndTime(data.workDate, data.clockIn);
    const clockOut = normalizeClockOut(clockIn, data.clockOut ? combineWorkDateAndTime(data.workDate, data.clockOut) : null);
    const hourlyRate = data.hourlyRate !== null && data.hourlyRate !== undefined
      ? data.hourlyRate
      : money(master.employee.hourlyRate ?? master.shift?.hourlyRate ?? 0);
    const totals = calcAttendance(clockIn, clockOut, data.breakMinutes, hourlyRate);
    const item = await prisma.attendanceRecord.create({
      data: {
        employeeId: data.employeeId,
        shiftId: master.shiftId,
        workDate,
        clockIn,
        clockOut,
        breakMinutes: data.breakMinutes,
        hourlyRate,
        totalHours: totals.totalHours,
        grossAmount: totals.grossAmount,
        note: data.note || null,
        status: data.status || 'RECORDED',
      },
      include: { employee: { include: { defaultShift: true } }, shift: true },
    });
    res.status(201).json({ success: true, item: serializeAttendance(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.message || 'Không tạo được bản chấm công.' });
  }
};

export const updateAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = attendanceSchema.partial().parse(req.body);
    const current = await prisma.attendanceRecord.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy bản chấm công.' });
    const workDateText = data.workDate || current.workDate.toISOString().slice(0, 10);
    const workDate = data.workDate ? parseDateOnly(data.workDate) : current.workDate;
    const clockIn = data.clockIn ? combineWorkDateAndTime(workDateText, data.clockIn) : current.clockIn;
    const rawClockOut = data.clockOut !== undefined
      ? (data.clockOut ? combineWorkDateAndTime(workDateText, data.clockOut) : null)
      : current.clockOut;
    const clockOut = normalizeClockOut(clockIn, rawClockOut);
    const breakMinutes = data.breakMinutes ?? current.breakMinutes;
    const employeeId = data.employeeId || current.employeeId;
    const shiftId = data.shiftId !== undefined ? data.shiftId : current.shiftId;
    const master = await resolveAttendanceMasterData(employeeId, shiftId);
    const hourlyRate = data.hourlyRate !== undefined && data.hourlyRate !== null
      ? data.hourlyRate
      : money(current.hourlyRate) || money(master.employee.hourlyRate ?? master.shift?.hourlyRate ?? 0);
    const totals = calcAttendance(clockIn, clockOut, breakMinutes, hourlyRate);
    const item = await prisma.attendanceRecord.update({
      where: { id: req.params.id },
      data: {
        employeeId,
        shiftId: master.shiftId,
        workDate,
        clockIn,
        clockOut,
        breakMinutes,
        hourlyRate,
        totalHours: totals.totalHours,
        grossAmount: totals.grossAmount,
        note: data.note !== undefined ? data.note : current.note,
        status: data.status || current.status,
      },
      include: { employee: { include: { defaultShift: true } }, shift: true },
    });
    res.json({ success: true, item: serializeAttendance(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.message || 'Không cập nhật được chấm công.' });
  }
};

export const deleteAttendance = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.attendanceRecord.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Đã xóa bản chấm công.' });
};

export const getKpiLevels = async (_req: AuthenticatedRequest, res: Response) => {
  const items = await prisma.kpiLevel.findMany({ orderBy: [{ isActive: 'desc' }, { minScore: 'asc' }] });
  res.json({ success: true, items: items.map(serializeKpiLevel) });
};

export const createKpiLevel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = kpiLevelSchema.parse(req.body);
    const item = await prisma.kpiLevel.create({ data });
    res.status(201).json({ success: true, item: serializeKpiLevel(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.code === 'P2002' ? 'Mã cấp KPI đã tồn tại.' : 'Không tạo được cấp KPI.' });
  }
};

export const updateKpiLevel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = kpiLevelSchema.partial().parse(req.body);
    const item = await prisma.kpiLevel.update({ where: { id: req.params.id }, data });
    res.json({ success: true, item: serializeKpiLevel(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Không cập nhật được cấp KPI.' });
  }
};

export const deleteKpiLevel = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.kpiLevel.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Đã ẩn cấp KPI.' });
};

export const getKpiRecords = async (req: AuthenticatedRequest, res: Response) => {
  const defaultDate = vietnamDateKey();
  const from = parseDateOnly(String(req.query.from || defaultDate.slice(0, 8) + '01'));
  const to = parseDateOnly(String(req.query.to || defaultDate), true);
  const items = await prisma.employeeKpiRecord.findMany({
    where: { periodEnd: { gte: from }, periodStart: { lte: to } },
    include: { employee: { include: { defaultShift: true } }, level: true },
    orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, items: items.map(serializeKpiRecord) });
};

export const createKpiRecord = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = kpiRecordSchema.parse(req.body);
    const level = await resolveKpiLevel(data.score, data.levelId);
    const item = await prisma.employeeKpiRecord.create({
      data: {
        employeeId: data.employeeId,
        periodStart: parseDateOnly(data.periodStart),
        periodEnd: parseDateOnly(data.periodEnd, true),
        score: data.score,
        levelId: level?.id || null,
        rewardAmount: data.rewardAmount ?? money(level?.rewardAmount),
        note: data.note || null,
        status: data.status || 'APPROVED',
        createdBy: req.user?.email,
      },
      include: { employee: { include: { defaultShift: true } }, level: true },
    });
    res.status(201).json({ success: true, item: serializeKpiRecord(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.message || 'Không tạo được KPI nhân viên.' });
  }
};

export const updateKpiRecord = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = kpiRecordSchema.partial().parse(req.body);
    const current = await prisma.employeeKpiRecord.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy KPI nhân viên.' });
    const score = data.score ?? money(current.score);
    const level = await resolveKpiLevel(score, data.levelId !== undefined ? data.levelId : current.levelId);
    const shouldRecalculateReward = data.score !== undefined || data.levelId !== undefined;
    const rewardAmount = data.rewardAmount !== undefined && data.rewardAmount !== null
      ? data.rewardAmount
      : shouldRecalculateReward
        ? money(level?.rewardAmount)
        : money(current.rewardAmount);
    const item = await prisma.employeeKpiRecord.update({
      where: { id: req.params.id },
      data: {
        employeeId: data.employeeId || current.employeeId,
        periodStart: data.periodStart ? parseDateOnly(data.periodStart) : current.periodStart,
        periodEnd: data.periodEnd ? parseDateOnly(data.periodEnd, true) : current.periodEnd,
        score,
        levelId: level?.id || null,
        rewardAmount,
        note: data.note !== undefined ? data.note : current.note,
        status: data.status || current.status,
      },
      include: { employee: { include: { defaultShift: true } }, level: true },
    });
    res.json({ success: true, item: serializeKpiRecord(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.message || 'Không cập nhật được KPI nhân viên.' });
  }
};

export const deleteKpiRecord = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.employeeKpiRecord.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Đã xóa KPI nhân viên.' });
};

export const getRewardPenaltyCategories = async (_req: AuthenticatedRequest, res: Response) => {
  const items = await prisma.rewardPenaltyCategory.findMany({ orderBy: [{ isActive: 'desc' }, { type: 'asc' }, { name: 'asc' }] });
  res.json({ success: true, items: items.map(serializeRewardPenaltyCategory) });
};

export const createRewardPenaltyCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = rewardPenaltyCategorySchema.parse(req.body);
    const item = await prisma.rewardPenaltyCategory.create({ data });
    res.status(201).json({ success: true, item: serializeRewardPenaltyCategory(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.code === 'P2002' ? 'Mã hạng mục đã tồn tại.' : 'Không tạo được hạng mục thưởng/phạt.' });
  }
};

export const updateRewardPenaltyCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = rewardPenaltyCategorySchema.partial().parse(req.body);
    const item = await prisma.rewardPenaltyCategory.update({ where: { id: req.params.id }, data });
    res.json({ success: true, item: serializeRewardPenaltyCategory(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Không cập nhật được hạng mục thưởng/phạt.' });
  }
};

export const deleteRewardPenaltyCategory = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.rewardPenaltyCategory.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Đã ẩn hạng mục thưởng/phạt.' });
};

export const getRewardPenalties = async (req: AuthenticatedRequest, res: Response) => {
  const defaultDate = vietnamDateKey();
  const from = parseDateOnly(String(req.query.from || defaultDate.slice(0, 8) + '01'));
  const to = parseDateOnly(String(req.query.to || defaultDate), true);
  const items = await prisma.employeeRewardPenalty.findMany({
    where: { incidentDate: { gte: from, lte: to } },
    include: { employee: { include: { defaultShift: true } }, category: true },
    orderBy: [{ incidentDate: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, items: items.map(serializeRewardPenalty) });
};

export const createRewardPenalty = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = rewardPenaltySchema.parse(req.body);
    const item = await prisma.employeeRewardPenalty.create({
      data: {
        employeeId: data.employeeId,
        categoryId: data.categoryId || null,
        type: data.type,
        severity: data.severity || null,
        incidentDate: parseDateOnly(data.incidentDate),
        amount: data.amount,
        reason: data.reason,
        status: data.status || 'PENDING',
        appliedAt: data.status === 'APPLIED' ? new Date() : null,
        note: data.note || null,
        createdBy: req.user?.email,
      },
      include: { employee: { include: { defaultShift: true } }, category: true },
    });
    res.status(201).json({ success: true, item: serializeRewardPenalty(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.message || 'Không tạo được thưởng/phạt.' });
  }
};

export const updateRewardPenalty = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = rewardPenaltySchema.partial().parse(req.body);
    const current = await prisma.employeeRewardPenalty.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy thưởng/phạt.' });
    const nextStatus = data.status || current.status;
    const item = await prisma.employeeRewardPenalty.update({
      where: { id: req.params.id },
      data: {
        employeeId: data.employeeId || current.employeeId,
        categoryId: data.categoryId !== undefined ? data.categoryId : current.categoryId,
        type: data.type || current.type,
        severity: data.severity !== undefined ? data.severity : current.severity,
        incidentDate: data.incidentDate ? parseDateOnly(data.incidentDate) : current.incidentDate,
        amount: data.amount ?? money(current.amount),
        reason: data.reason || current.reason,
        status: nextStatus,
        appliedAt: nextStatus === 'APPLIED' && !current.appliedAt ? new Date() : current.appliedAt,
        note: data.note !== undefined ? data.note : current.note,
      },
      include: { employee: { include: { defaultShift: true } }, category: true },
    });
    res.json({ success: true, item: serializeRewardPenalty(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.message || 'Không cập nhật được thưởng/phạt.' });
  }
};

export const deleteRewardPenalty = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.employeeRewardPenalty.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Đã xóa thưởng/phạt.' });
};

const buildPayrollLines = async (periodStart: Date, periodEnd: Date) => {
  const [employees, attendances, kpiRecords, adjustments] = await Promise.all([
    prisma.payrollEmployee.findMany({ where: { isActive: true }, orderBy: { fullName: 'asc' } }),
    prisma.attendanceRecord.findMany({
      where: { workDate: { gte: periodStart, lte: periodEnd }, clockOut: { not: null } },
      include: { employee: true, shift: true },
      orderBy: [{ employee: { fullName: 'asc' } }, { workDate: 'asc' }],
    }),
    prisma.employeeKpiRecord.findMany({
      where: {
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        status: { in: ['APPROVED', 'APPLIED'] },
      },
      include: { level: true },
      orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.employeeRewardPenalty.findMany({
      where: {
        incidentDate: { gte: periodStart, lte: periodEnd },
        status: 'APPLIED',
      },
      include: { category: true },
    }),
  ]);
  const map = new Map<string, any>();
  for (const employee of employees) {
    map.set(employee.id, {
      employeeId: employee.id,
      employeeCode: employee.code,
      employeeName: employee.fullName,
      position: employee.position,
      shiftName: employee.position || '',
      attendanceCount: 0,
      totalHours: 0,
      grossAmount: 0,
      rates: [] as number[],
      kpiScore: null as number | null,
      kpiLevelName: null as string | null,
      kpiRewardAmount: 0,
      bonusAmount: 0,
      penaltyAmount: 0,
    });
  }

  for (const row of attendances) {
    const key = row.employeeId;
    const current = map.get(key) || {
      employeeId: row.employeeId,
      employeeCode: row.employee.code,
      employeeName: row.employee.fullName,
      position: row.employee.position,
      shiftName: row.shift?.name || row.employee.position || '',
      attendanceCount: 0,
      totalHours: 0,
      grossAmount: 0,
      rates: [] as number[],
      kpiScore: null as number | null,
      kpiLevelName: null as string | null,
      kpiRewardAmount: 0,
      bonusAmount: 0,
      penaltyAmount: 0,
    };
    current.attendanceCount += 1;
    current.totalHours += money(row.totalHours);
    current.grossAmount += money(row.grossAmount);
    current.rates.push(money(row.hourlyRate));
    map.set(key, current);
  }

  for (const record of kpiRecords) {
    const current = map.get(record.employeeId);
    if (!current) continue;
    current.kpiScore = current.kpiScore === null ? money(record.score) : Math.max(current.kpiScore, money(record.score));
    current.kpiLevelName = record.level?.name || current.kpiLevelName;
    current.kpiRewardAmount += money(record.rewardAmount);
  }

  for (const adjustment of adjustments) {
    const current = map.get(adjustment.employeeId);
    if (!current) continue;
    if (adjustment.type === 'PENALTY') current.penaltyAmount += money(adjustment.amount);
    else current.bonusAmount += money(adjustment.amount);
  }

  return Array.from(map.values()).map((line) => ({
    ...line,
    totalHours: round2(line.totalHours),
    grossAmount: Math.round(line.grossAmount),
    hourlyRate: line.totalHours > 0 ? Math.round(line.grossAmount / line.totalHours) : (line.rates[0] || 0),
    kpiRewardAmount: Math.round(line.kpiRewardAmount),
    bonusAmount: Math.round(line.bonusAmount),
    penaltyAmount: Math.round(line.penaltyAmount),
    netAmount: Math.round(line.grossAmount + line.kpiRewardAmount + line.bonusAmount - line.penaltyAmount),
    rates: undefined,
  })).filter((line) => line.attendanceCount > 0 || line.kpiRewardAmount > 0 || line.bonusAmount > 0 || line.penaltyAmount > 0);
};

export const getPayrollRuns = async (_req: AuthenticatedRequest, res: Response) => {
  const items = await prisma.payrollRun.findMany({ include: { lines: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, items: items.map(serializeRun) });
};

export const generatePayrollRun = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = runSchema.parse(req.body);
    const periodStart = parseDateOnly(data.periodStart);
    const periodEnd = parseDateOnly(data.periodEnd, true);
    const lines = await buildPayrollLines(periodStart, periodEnd);
    const totalHours = round2(lines.reduce((sum, line) => sum + line.totalHours, 0));
    const totalAmount = Math.round(lines.reduce((sum, line) => sum + line.grossAmount, 0));
    const totalKpiReward = Math.round(lines.reduce((sum, line) => sum + line.kpiRewardAmount, 0));
    const totalBonus = Math.round(lines.reduce((sum, line) => sum + line.bonusAmount, 0));
    const totalPenalty = Math.round(lines.reduce((sum, line) => sum + line.penaltyAmount, 0));
    const netAmount = Math.round(lines.reduce((sum, line) => sum + line.netAmount, 0));
    const count = await prisma.payrollRun.count();
    const code = `BL${String(count + 1).padStart(4, '0')}`;
    const item = await prisma.payrollRun.create({
      data: {
        code,
        periodStart,
        periodEnd,
        note: data.note,
        totalHours,
        totalAmount,
        totalKpiReward,
        totalBonus,
        totalPenalty,
        netAmount,
        createdBy: req.user?.email,
        lines: { create: lines.map((line) => ({ ...line })) },
      },
      include: { lines: true },
    });
    res.status(201).json({ success: true, item: serializeRun(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: error?.message || 'Không tính được bảng lương.' });
  }
};

export const deletePayrollRun = async (req: AuthenticatedRequest, res: Response) => {
  await prisma.payrollRun.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Đã xóa bảng lương.' });
};
