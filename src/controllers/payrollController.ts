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

const money = (value: any) => Number(value || 0);
const round2 = (value: number) => Math.round(value * 100) / 100;

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
    return new Date(`${workDate}T${time}.000+07:00`);
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
  lines: (item.lines || []).map((line: any) => ({
    ...line,
    totalHours: money(line.totalHours),
    hourlyRate: money(line.hourlyRate),
    grossAmount: money(line.grossAmount),
  })),
});

const getRateForAttendance = async (employeeId: string, shiftId?: string | null, explicitRate?: number | null) => {
  if (explicitRate !== null && explicitRate !== undefined) return explicitRate;
  const employee = await prisma.payrollEmployee.findUnique({ where: { id: employeeId }, include: { defaultShift: true } });
  const shift = shiftId ? await prisma.workShift.findUnique({ where: { id: shiftId } }) : employee?.defaultShift;
  return money(employee?.hourlyRate ?? shift?.hourlyRate ?? 0);
};

export const getPayrollBootstrap = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [shifts, employees, attendances, runs] = await Promise.all([
      prisma.workShift.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
      prisma.payrollEmployee.findMany({ include: { defaultShift: true }, orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }] }),
      prisma.attendanceRecord.findMany({
        where: { workDate: { gte: today } },
        include: { employee: { include: { defaultShift: true } }, shift: true },
        orderBy: [{ workDate: 'desc' }, { clockIn: 'desc' }],
      }),
      prisma.payrollRun.findMany({ include: { lines: true }, orderBy: { createdAt: 'desc' }, take: 12 }),
    ]);
    res.json({
      success: true,
      data: {
        shifts: shifts.map(serializeShift),
        employees: employees.map(serializeEmployee),
        attendances: attendances.map(serializeAttendance),
        runs: runs.map(serializeRun),
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
  const from = parseDateOnly(String(req.query.from || new Date().toISOString().slice(0, 10)));
  const to = parseDateOnly(String(req.query.to || req.query.from || new Date().toISOString().slice(0, 10)), true);
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
    const workDate = parseDateOnly(data.workDate);
    const clockIn = combineWorkDateAndTime(data.workDate, data.clockIn);
    const clockOut = data.clockOut ? combineWorkDateAndTime(data.workDate, data.clockOut) : null;
    const hourlyRate = await getRateForAttendance(data.employeeId, data.shiftId, data.hourlyRate);
    const totals = calcAttendance(clockIn, clockOut, data.breakMinutes, hourlyRate);
    const item = await prisma.attendanceRecord.create({
      data: { ...data, workDate, clockIn, clockOut, hourlyRate, ...totals },
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
    const clockOut = data.clockOut !== undefined
      ? (data.clockOut ? combineWorkDateAndTime(workDateText, data.clockOut) : null)
      : current.clockOut;
    const breakMinutes = data.breakMinutes ?? current.breakMinutes;
    const employeeId = data.employeeId || current.employeeId;
    const shiftId = data.shiftId !== undefined ? data.shiftId : current.shiftId;
    const hourlyRate = data.hourlyRate !== undefined && data.hourlyRate !== null
      ? data.hourlyRate
      : money(current.hourlyRate) || await getRateForAttendance(employeeId, shiftId);
    const totals = calcAttendance(clockIn, clockOut, breakMinutes, hourlyRate);
    const item = await prisma.attendanceRecord.update({
      where: { id: req.params.id },
      data: { ...data, employeeId, shiftId, workDate, clockIn, clockOut, breakMinutes, hourlyRate, ...totals },
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

const buildPayrollLines = async (periodStart: Date, periodEnd: Date) => {
  const attendances = await prisma.attendanceRecord.findMany({
    where: { workDate: { gte: periodStart, lte: periodEnd }, clockOut: { not: null } },
    include: { employee: true, shift: true },
    orderBy: [{ employee: { fullName: 'asc' } }, { workDate: 'asc' }],
  });
  const map = new Map<string, any>();
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
    };
    current.attendanceCount += 1;
    current.totalHours += money(row.totalHours);
    current.grossAmount += money(row.grossAmount);
    current.rates.push(money(row.hourlyRate));
    map.set(key, current);
  }
  return Array.from(map.values()).map((line) => ({
    ...line,
    totalHours: round2(line.totalHours),
    grossAmount: Math.round(line.grossAmount),
    hourlyRate: line.totalHours > 0 ? Math.round(line.grossAmount / line.totalHours) : (line.rates[0] || 0),
    rates: undefined,
  }));
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
