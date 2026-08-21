import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const branchSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(180),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  managerName: z.string().optional().nullable(),
  openingTime: z.string().optional().nullable(),
  closingTime: z.string().optional().nullable(),
  status: z.string().optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  taxCode: z.string().optional().nullable(),
  invoiceName: z.string().optional().nullable(),
});

export const ensureDefaultBranch = async () => {
  const existing = await prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.branch.create({
    data: {
      code: 'CTN-HQ',
      name: 'Cơm Thị Nở - Văn Quán',
      address: 'Văn Quán, Hà Đông, Hà Nội',
      phone: '0987654321',
      status: 'ACTIVE',
    },
  });
};

const serializeBranch = (item: any) => ({
  ...item,
  latitude: item.latitude === null || item.latitude === undefined ? null : Number(item.latitude),
  longitude: item.longitude === null || item.longitude === undefined ? null : Number(item.longitude),
});

export const getBranches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureDefaultBranch();
    const keyword = String(req.query.keyword || '').trim();
    const status = String(req.query.status || '').trim();
    const items = await prisma.branch.findMany({
      where: {
        ...(keyword
          ? {
              OR: [
                { code: { contains: keyword } },
                { name: { contains: keyword } },
                { phone: { contains: keyword } },
                { address: { contains: keyword } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: { items: items.map(serializeBranch) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được danh sách chi nhánh.' });
  }
};

export const getBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await prisma.branch.findUnique({
      where: { id: req.params.id },
      include: {
        userBranches: { include: { user: { select: { id: true, fullName: true, email: true, isActive: true } } } },
        payrollEmployees: { select: { id: true, code: true, fullName: true, position: true, isActive: true } },
        _count: { select: { customers: true, pointTransactions: true } },
      },
    });
    if (!item) {
      res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh.' });
      return;
    }
    res.json({ success: true, data: serializeBranch(item) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được chi nhánh.' });
  }
};

export const createBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = branchSchema.parse(req.body);
    const item = await prisma.branch.create({
      data: {
        ...data,
        code: data.code.trim().toUpperCase(),
        email: data.email || null,
        status: data.status || 'ACTIVE',
      },
    });
    res.status(201).json({ success: true, data: serializeBranch(item) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không tạo được chi nhánh.' });
  }
};

export const updateBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = branchSchema.partial().parse(req.body);
    const item = await prisma.branch.update({
      where: { id: req.params.id },
      data: {
        ...data,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        email: data.email === '' ? null : data.email,
      },
    });
    res.json({ success: true, data: serializeBranch(item) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không cập nhật được chi nhánh.' });
  }
};

export const assignUserBranches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = String(req.params.userId || req.body.userId || '').trim();
    const branchIds = Array.isArray(req.body.branchIds) ? req.body.branchIds.map(String) : [];
    const defaultBranchId = String(req.body.defaultBranchId || branchIds[0] || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, message: 'Thiếu userId.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.userBranch.deleteMany({ where: { userId } });
      if (branchIds.length) {
        await tx.userBranch.createMany({
          data: branchIds.map((branchId: string) => ({
            userId,
            branchId,
            isDefault: branchId === defaultBranchId,
          })),
        });
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không gán được chi nhánh cho user.' });
  }
};
