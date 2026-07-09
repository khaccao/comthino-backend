import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { z } from 'zod';

const roleSchema = z.object({
  code: z.string().min(2, 'Mã vai trò phải từ 2 ký tự').toUpperCase(),
  name: z.string().min(2, 'Tên vai trò phải từ 2 ký tự'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, items: roles });
  } catch (error) {
    res.status(500).json({ message: 'Không thể tải danh sách vai trò.' });
  }
};

export const getRoleById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({
      where: { id },
    });
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò.' });
    }
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải thông tin vai trò.' });
  }
};

export const createRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = roleSchema.parse(req.body);
    const existing = await prisma.role.findUnique({ where: { code: validated.code } });
    if (existing) {
      return res.status(400).json({ message: 'Mã vai trò đã tồn tại.' });
    }

    const newRole = await prisma.role.create({
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE_ROLE',
        entity: 'Roles',
        entityId: newRole.id,
        newValueJson: JSON.stringify(newRole),
      },
    });

    res.status(201).json({ success: true, message: 'Tạo vai trò thành công.', id: newRole.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Lỗi tạo vai trò.' });
  }
};

export const updateRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = roleSchema.partial().parse(req.body);

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò.' });
    }

    if (role.isSystemRole && validated.code && validated.code !== role.code) {
      return res.status(400).json({ message: 'Không thể thay đổi mã của vai trò hệ thống.' });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_ROLE',
        entity: 'Roles',
        entityId: id,
        newValueJson: JSON.stringify(updated),
      },
    });

    res.json({ success: true, message: 'Cập nhật vai trò thành công.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Lỗi cập nhật vai trò.' });
  }
};

export const deleteRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò.' });
    }

    if (role.isSystemRole || role.code === 'SUPERADMIN') {
      return res.status(400).json({ message: 'Không thể xóa vai trò hệ thống.' });
    }

    await prisma.role.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'DELETE_ROLE',
        entity: 'Roles',
        entityId: id,
      },
    });

    res.json({ success: true, message: 'Xóa vai trò thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa vai trò.' });
  }
};
