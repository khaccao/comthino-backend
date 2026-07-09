import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { z } from 'zod';

// Zod schemas
const supplierSchema = z.object({
  name: z.string().min(1, 'Tên nhà cung cấp không được để trống'),
  phone: z.string().optional().nullable(),
  taxCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  paymentTerm: z.string().optional().nullable(),
  currentDebt: z.number().default(0),
});

const paymentRequestSchema = z.object({
  department: z.string().min(1, 'Bộ phận không được để trống'),
  expenseCategoryId: z.string().uuid('Danh mục khoản chi không hợp lệ'),
  supplierId: z.string().uuid('Nhà cung cấp không hợp lệ').optional().nullable(),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  reason: z.string().min(1, 'Lý do chi không được để trống'),
  attachmentUrl: z.string().optional().nullable(),
});

const paymentVoucherSchema = z.object({
  paymentRequestId: z.string().uuid().optional().nullable(),
  recipientName: z.string().min(1, 'Người nhận tiền không được để trống'),
  reason: z.string().min(1, 'Lý do chi không được để trống'),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  paymentMethodId: z.string().uuid('Phương thức chi không hợp lệ'),
  cashAccountId: z.string().uuid('Tài khoản tiền không hợp lệ'),
  expenseCategoryId: z.string().uuid('Danh mục khoản chi không hợp lệ'),
  attachmentUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const normalizePaymentRequestBody = (body: any) => ({
  ...body,
  expenseCategoryId: body.expenseCategoryId || body.categoryId,
});

const normalizePaymentVoucherBody = (body: any) => ({
  ...body,
  paymentRequestId: body.paymentRequestId || body.requestId || undefined,
  recipientName: body.recipientName || body.receiverName,
  expenseCategoryId: body.expenseCategoryId || body.categoryId,
});

const serializeRequest = (item: any) => ({
  ...item,
  amount: Number(item.amount || 0),
  categoryId: item.expenseCategoryId,
  category: item.expenseCategory,
});

const serializeVoucher = (item: any) => ({
  ...item,
  amount: Number(item.amount || 0),
  paymentRequestId: item.paymentRequestId,
  requestId: item.paymentRequestId,
  receiverName: item.recipientName,
  expenseCategoryId: item.expenseCategoryId,
  categoryId: item.expenseCategoryId,
  category: item.expenseCategory,
});

const serializeCashAccount = (item: any) => ({
  ...item,
  balance: Number(item.balance || 0),
  currentBalance: Number(item.balance || 0),
  type: item.code,
});

// SUPPLIERS
export const getSuppliers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, items: suppliers });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh mục nhà cung cấp.' });
  }
};

export const createSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = supplierSchema.parse(req.body);
    const item = await prisma.supplier.create({ data: validated });
    res.status(201).json({ success: true, item });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Lỗi thêm nhà cung cấp.' });
  }
};

export const updateSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = supplierSchema.partial().parse(req.body);
    await prisma.supplier.update({ where: { id }, data: validated });
    res.json({ success: true, message: 'Cập nhật thành công.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Lỗi cập nhật.' });
  }
};

export const deleteSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'Đã xóa nhà cung cấp.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa.' });
  }
};

// MASTER DATA FOR SELECTION
export const getExpenseCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.expenseCategory.findMany({ where: { isActive: true }, orderBy: { group: 'asc' } });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh mục khoản chi.' });
  }
};

export const getPaymentMethods = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.paymentMethod.findMany({ where: { isActive: true } });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải phương thức chi.' });
  }
};

export const getCashAccounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.cashAccount.findMany({ where: { isActive: true } });
    res.json({ success: true, items: items.map(serializeCashAccount) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải tài khoản tiền.' });
  }
};

// PAYMENT REQUESTS (ĐỀ NGHỊ CHI)
export const getPaymentRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.paymentRequest.findMany({
      include: {
        requester: { select: { fullName: true, email: true } },
        approver: { select: { fullName: true } },
        expenseCategory: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, items: items.map(serializeRequest) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải đề nghị chi.' });
  }
};

export const createPaymentRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = paymentRequestSchema.parse(normalizePaymentRequestBody(req.body));
    const count = await prisma.paymentRequest.count();
    const code = `DNC${String(count + 1).padStart(4, '0')}`;

    const item = await prisma.paymentRequest.create({
      data: {
        code,
        requesterId: req.user!.id,
        department: validated.department,
        expenseCategoryId: validated.expenseCategoryId,
        supplierId: validated.supplierId,
        amount: validated.amount,
        reason: validated.reason,
        attachmentUrl: validated.attachmentUrl,
        status: 'PENDING',
      },
    });

    res.status(201).json({ success: true, item: serializeRequest(item) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Lỗi tạo đề nghị chi.' });
  }
};

export const approvePaymentRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const item = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy đề nghị chi.' });

    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status,
        approvedById: req.user!.id,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: status === 'APPROVED' ? 'APPROVE_PAYMENT_REQUEST' : 'REJECT_PAYMENT_REQUEST',
        entity: 'PaymentRequests',
        entityId: id,
      },
    });

    res.json({ success: true, item: serializeRequest(updated) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xử lý phê duyệt.' });
  }
};

export const deletePaymentRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Không thấy đề nghị chi.' });
    if (item.status === 'APPROVED' || item.status === 'PAID') {
      return res.status(400).json({ message: 'Không thể xóa đề nghị chi đã duyệt hoặc đã thanh toán.' });
    }

    await prisma.paymentRequest.delete({ where: { id } });
    res.json({ success: true, message: 'Đã xóa đề nghị chi.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa đề nghị.' });
  }
};

// PAYMENT VOUCHERS (PHIẾU CHI)
export const getPaymentVouchers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.paymentVoucher.findMany({
      include: {
        paymentRequest: true,
        paymentMethod: true,
        cashAccount: true,
        expenseCategory: true,
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, items: items.map(serializeVoucher) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải phiếu chi.' });
  }
};

export const createPaymentVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = paymentVoucherSchema.parse(normalizePaymentVoucherBody(req.body));
    const count = await prisma.paymentVoucher.count();
    const code = `PC${String(count + 1).padStart(4, '0')}`;

    const voucher = await prisma.$transaction(async (tx) => {
      // 1. Create voucher
      const v = await tx.paymentVoucher.create({
        data: {
          code,
          paymentRequestId: validated.paymentRequestId,
          recipientName: validated.recipientName,
          reason: validated.reason,
          amount: validated.amount,
          paymentMethodId: validated.paymentMethodId,
          cashAccountId: validated.cashAccountId,
          expenseCategoryId: validated.expenseCategoryId,
          attachmentUrl: validated.attachmentUrl,
          notes: validated.notes,
          status: 'UNPOSTED',
          createdById: req.user!.id,
        },
      });

      // 2. If linked to payment request, update request status to PAID
      if (validated.paymentRequestId) {
        await tx.paymentRequest.update({
          where: { id: validated.paymentRequestId },
          data: { status: 'PAID' },
        });
      }

      return v;
    });

    res.status(201).json({ success: true, item: serializeVoucher(voucher) });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Lỗi tạo phiếu chi.' });
  }
};

// GHI SỔ / HẠCH TOÁN PHIẾU CHI
export const postPaymentVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id },
      include: { paymentRequest: true },
    });

    if (!voucher) return res.status(404).json({ message: 'Không tìm thấy phiếu chi.' });
    if (voucher.status === 'POSTED') return res.status(400).json({ message: 'Phiếu chi này đã được ghi sổ.' });

    // Update account balances & supplier debt inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Subtract amount from cash account
      const account = await tx.cashAccount.findUnique({ where: { id: voucher.cashAccountId } });
      if (!account) throw new Error('Không tìm thấy tài khoản quỹ.');
      
      await tx.cashAccount.update({
        where: { id: voucher.cashAccountId },
        data: { balance: { decrement: voucher.amount } },
      });

      // 2. Update Supplier Debt if paymentRequest has a supplier
      if (voucher.paymentRequest && voucher.paymentRequest.supplierId) {
        await tx.supplier.update({
          where: { id: voucher.paymentRequest.supplierId },
          data: { currentDebt: { decrement: voucher.amount } },
        });
      }

      // 3. Mark voucher as POSTED
      await tx.paymentVoucher.update({
        where: { id },
        data: { status: 'POSTED' },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'POST_ACCOUNTING_PAYMENT_VOUCHER',
        entity: 'PaymentVouchers',
        entityId: id,
      },
    });

    res.json({ success: true, message: 'Đã ghi sổ phiếu chi và cập nhật quỹ tiền thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Lỗi ghi sổ phiếu chi.' });
  }
};

export const deletePaymentVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const voucher = await prisma.paymentVoucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ message: 'Không thấy phiếu chi.' });
    if (voucher.status === 'POSTED') {
      return res.status(400).json({ message: 'Không thể xóa phiếu chi đã ghi sổ kế toán.' });
    }

    await prisma.$transaction(async (tx) => {
      // If linked to request, restore request status back to APPROVED
      if (voucher.paymentRequestId) {
        await tx.paymentRequest.update({
          where: { id: voucher.paymentRequestId },
          data: { status: 'APPROVED' },
        });
      }
      await tx.paymentVoucher.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Đã xóa phiếu chi.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa phiếu chi.' });
  }
};

// DASHBOARD CHI TIỀN
export const getPaymentDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Total expense today (POSTED vouchers only)
    const todayExpenses = await prisma.paymentVoucher.aggregate({
      where: {
        status: 'POSTED',
        paymentDate: { gte: startOfToday },
      },
      _sum: { amount: true },
    });

    // 2. Total expense this month (POSTED vouchers only)
    const monthExpenses = await prisma.paymentVoucher.aggregate({
      where: {
        status: 'POSTED',
        paymentDate: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    // 3. Unposted vouchers count
    const unpostedCount = await prisma.paymentVoucher.count({
      where: { status: 'UNPOSTED' },
    });

    // 4. Pending payment requests count
    const pendingRequestsCount = await prisma.paymentRequest.count({
      where: { status: 'PENDING' },
    });

    // 5. Total supplier debt
    const supplierDebt = await prisma.supplier.aggregate({
      where: { isActive: true },
      _sum: { currentDebt: true },
    });

    // 6. Expense by category group
    const vouchersThisMonth = await prisma.paymentVoucher.findMany({
      where: {
        status: 'POSTED',
        paymentDate: { gte: startOfMonth },
      },
      include: { expenseCategory: true },
    });

    const groupExpenses: Record<string, number> = {};
    vouchersThisMonth.forEach((v) => {
      const grp = v.expenseCategory.group;
      const amt = Number(v.amount);
      groupExpenses[grp] = (groupExpenses[grp] || 0) + amt;
    });

    // 7. Balance summary for Cash accounts
    const cashAccounts = await prisma.cashAccount.findMany({ where: { isActive: true } });

    const accounts = cashAccounts.map(serializeCashAccount);
    const byGroup = Object.entries(groupExpenses).map(([name, value]) => ({ name, value }));
    const legacyExpenseByGroup = byGroup.map((group) => ({
      categoryId: group.name,
      category: { name: group.name },
      _sum: { amount: group.value },
    }));

    res.json({
      success: true,
      data: {
        totalPaidToday: Number(todayExpenses._sum.amount || 0),
        totalPaidThisMonth: Number(monthExpenses._sum.amount || 0),
        totalDebt: Number(supplierDebt._sum.currentDebt || 0),
        accountsBalance: accounts,
        expenseByGroup: legacyExpenseByGroup,
        todayTotal: Number(todayExpenses._sum.amount || 0),
        monthTotal: Number(monthExpenses._sum.amount || 0),
        unpostedCount,
        pendingRequestsCount,
        totalSupplierDebt: Number(supplierDebt._sum.currentDebt || 0),
        byCategoryGroup: byGroup,
        cashAccounts: accounts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải thống kê thu chi.' });
  }
};
