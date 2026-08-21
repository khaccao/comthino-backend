import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { ensureDefaultBranch } from './branchController';

const customerSchema = z.object({
  code: z.string().optional().nullable(),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  birthday: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  tierId: z.string().optional().nullable(),
  registeredBranchId: z.string().optional().nullable(),
  status: z.string().optional(),
  note: z.string().optional().nullable(),
});

const voucherSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  discountType: z.enum(['AMOUNT', 'PERCENT']).default('AMOUNT'),
  discountValue: z.coerce.number().min(0).default(0),
  minOrderAmount: z.coerce.number().min(0).default(0),
  maxDiscount: z.coerce.number().min(0).optional().nullable(),
  scope: z.enum(['ALL_BRANCHES', 'SELECTED_BRANCHES', 'SELECTED_CUSTOMERS', 'TIER']).default('ALL_BRANCHES'),
  tierId: z.string().optional().nullable(),
  branchIds: z.array(z.string()).optional().default([]),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  usageLimit: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

const pointSchema = z.object({
  customerId: z.string().min(1),
  branchId: z.string().optional().nullable(),
  type: z.enum(['EARN', 'REDEEM', 'ADJUST', 'EXPIRE', 'REFUND']),
  points: z.coerce.number().int(),
  amount: z.coerce.number().min(0).default(0),
  orderNo: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const money = (value: any) => Number(value || 0);
const dateOrNull = (value?: string | null) => value ? new Date(value) : null;

const serializeCustomer = (item: any) => ({
  ...item,
  totalSpent: money(item.totalSpent),
  tier: item.tier ? { ...item.tier, minSpent: money(item.tier.minSpent), discountPercent: money(item.tier.discountPercent) } : item.tier,
});

const serializeVoucher = (item: any) => ({
  ...item,
  discountValue: money(item.discountValue),
  minOrderAmount: money(item.minOrderAmount),
  maxDiscount: item.maxDiscount === null || item.maxDiscount === undefined ? null : money(item.maxDiscount),
});

const nextCustomerCode = async () => {
  const count = await prisma.customer.count();
  return `KH${String(count + 1).padStart(6, '0')}`;
};

export const ensureLoyaltyDefaults = async () => {
  const branch = await ensureDefaultBranch();
  await prisma.loyaltySetting.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      code: 'DEFAULT',
      pointsPerAmount: 10000,
      pointsEarned: 1,
      minOrderAmount: 0,
      maxRedeemPercent: 30,
      pointValueAmount: 1000,
    },
  });

  const tiers = [
    { code: 'STANDARD', name: 'Thành viên', minSpent: 0, minPoints: 0 },
    { code: 'SILVER', name: 'Bạc', minSpent: 3000000, minPoints: 300 },
    { code: 'GOLD', name: 'Vàng', minSpent: 8000000, minPoints: 800 },
  ];
  for (const tier of tiers) {
    await prisma.membershipTier.upsert({ where: { code: tier.code }, update: tier, create: tier });
  }
  return branch;
};

export const getCustomerBootstrap = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureLoyaltyDefaults();
    const [branches, tiers, setting, vouchers] = await Promise.all([
      prisma.branch.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
      prisma.membershipTier.findMany({ where: { isActive: true }, orderBy: [{ minSpent: 'asc' }] }),
      prisma.loyaltySetting.findUnique({ where: { code: 'DEFAULT' } }),
      prisma.voucher.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }], take: 80 }),
    ]);
    res.json({
      success: true,
      data: {
        branches,
        tiers: tiers.map((item) => serializeCustomer({ tier: item }).tier),
        setting: setting ? {
          ...setting,
          pointsPerAmount: money(setting.pointsPerAmount),
          minOrderAmount: money(setting.minOrderAmount),
          maxRedeemPercent: money(setting.maxRedeemPercent),
          pointValueAmount: money(setting.pointValueAmount),
        } : null,
        vouchers: vouchers.map(serializeVoucher),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được dữ liệu khách hàng.' });
  }
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureLoyaltyDefaults();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 20)));
    const keyword = String(req.query.keyword || '').trim();
    const tierId = String(req.query.tierId || '').trim();
    const branchId = String(req.query.branchId || '').trim();
    const status = String(req.query.status || '').trim();

    const where: any = {
      ...(keyword ? {
        OR: [
          { code: { contains: keyword } },
          { fullName: { contains: keyword } },
          { phone: { contains: keyword } },
          { email: { contains: keyword } },
        ],
      } : {}),
      ...(tierId ? { tierId } : {}),
      ...(branchId ? { registeredBranchId: branchId } : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { tier: true, registeredBranch: true },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, data: { items: items.map(serializeCustomer), total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được danh sách khách hàng.' });
  }
};

export const getCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        tier: true,
        registeredBranch: true,
        points: { orderBy: { createdAt: 'desc' }, take: 100 },
        vouchers: { include: { voucher: true, branch: true }, orderBy: { assignedAt: 'desc' }, take: 100 },
        notes: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!item) {
      res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng.' });
      return;
    }
    res.json({ success: true, data: serializeCustomer(item) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được khách hàng.' });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = customerSchema.parse(req.body);
    const defaultBranch = await ensureLoyaltyDefaults();
    const item = await prisma.customer.create({
      data: {
        code: (data.code || await nextCustomerCode()).trim().toUpperCase(),
        fullName: data.fullName.trim(),
        phone: data.phone || null,
        email: data.email || null,
        birthday: dateOrNull(data.birthday),
        gender: data.gender || null,
        tierId: data.tierId || null,
        registeredBranchId: data.registeredBranchId || defaultBranch.id,
        status: data.status || 'ACTIVE',
        note: data.note || null,
      },
      include: { tier: true, registeredBranch: true },
    });
    res.status(201).json({ success: true, data: serializeCustomer(item) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không tạo được khách hàng.' });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = customerSchema.partial().parse(req.body);
    const item = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...data,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        fullName: data.fullName ? data.fullName.trim() : undefined,
        email: data.email === '' ? null : data.email,
        birthday: data.birthday === undefined ? undefined : dateOrNull(data.birthday),
      },
      include: { tier: true, registeredBranch: true },
    });
    res.json({ success: true, data: serializeCustomer(item) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không cập nhật được khách hàng.' });
  }
};

export const addCustomerPointTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = pointSchema.parse(req.body);
    await prisma.$transaction(async (tx) => {
      await tx.customerPointTransaction.create({
        data: {
          ...data,
          createdBy: req.user?.id,
        },
      });
      await tx.customer.update({
        where: { id: data.customerId },
        data: { currentPoints: { increment: data.points } },
      });
    });
    res.status(201).json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không ghi được giao dịch điểm.' });
  }
};

export const upsertVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = voucherSchema.parse(req.body);
    const voucherId = String(req.params.id || req.body.id || '').trim();
    const payload = {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description || null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount,
      maxDiscount: data.maxDiscount,
      scope: data.scope,
      tierId: data.tierId || null,
      startAt: dateOrNull(data.startAt),
      endAt: dateOrNull(data.endAt),
      usageLimit: data.usageLimit || null,
      isActive: data.isActive ?? true,
    };

    const item = await prisma.$transaction(async (tx) => {
      const voucher = voucherId
        ? await tx.voucher.update({ where: { id: voucherId }, data: payload })
        : await tx.voucher.create({ data: payload });
      await tx.voucherBranch.deleteMany({ where: { voucherId: voucher.id } });
      if (data.scope === 'SELECTED_BRANCHES' && data.branchIds.length) {
        await tx.voucherBranch.createMany({
          data: data.branchIds.map((branchId) => ({ voucherId: voucher.id, branchId })),
        });
      }
      return voucher;
    });

    res.json({ success: true, data: serializeVoucher(item) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không lưu được voucher.' });
  }
};

export const validateVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const branchId = String(req.body.branchId || '').trim();
    const customerId = String(req.body.customerId || '').trim();
    const orderAmount = Number(req.body.orderAmount || 0);
    const voucher = await prisma.voucher.findUnique({
      where: { code },
      include: { branches: true, customers: true },
    });
    const now = new Date();
    let reason = '';
    if (!voucher || !voucher.isActive) reason = 'Voucher không tồn tại hoặc đã tắt.';
    else if (voucher.startAt && voucher.startAt > now) reason = 'Voucher chưa đến thời gian sử dụng.';
    else if (voucher.endAt && voucher.endAt < now) reason = 'Voucher đã hết hạn.';
    else if (money(voucher.minOrderAmount) > orderAmount) reason = 'Đơn hàng chưa đạt giá trị tối thiểu.';
    else if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) reason = 'Voucher đã hết lượt sử dụng.';
    else if (voucher.scope === 'SELECTED_BRANCHES' && !voucher.branches.some((item) => item.branchId === branchId)) reason = 'Voucher không áp dụng cho chi nhánh này.';
    else if (voucher.scope === 'SELECTED_CUSTOMERS' && !voucher.customers.some((item) => item.customerId === customerId)) reason = 'Voucher không áp dụng cho khách hàng này.';

    if (reason || !voucher) {
      res.json({ success: true, data: { valid: false, reason } });
      return;
    }

    let discount = voucher.discountType === 'PERCENT'
      ? Math.round(orderAmount * money(voucher.discountValue) / 100)
      : money(voucher.discountValue);
    if (voucher.maxDiscount !== null && voucher.maxDiscount !== undefined) {
      discount = Math.min(discount, money(voucher.maxDiscount));
    }
    res.json({ success: true, data: { valid: true, discountAmount: Math.max(0, discount), voucher: serializeVoucher(voucher) } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không kiểm tra được voucher.' });
  }
};
