import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { z } from 'zod';

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, items: permissions });
  } catch (error) {
    res.status(500).json({ message: 'Không thể tải danh sách quyền.' });
  }
};

export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò.' });
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
    });

    res.json({ success: true, items: rolePermissions });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải quyền hạn của vai trò.' });
  }
};

const permissionMatrixSchema = z.object({
  permissions: z.array(z.object({
    menuId: z.string(),
    permissionId: z.string(),
    isAllowed: z.boolean(),
  })),
});

export const updateRolePermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roleId } = req.params;
    const validated = permissionMatrixSchema.parse(req.body);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: 'Không tìm thấy vai trò.' });
    }

    if (role.code === 'SUPERADMIN') {
      return res.status(400).json({ message: 'Không thể thay đổi quyền hạn của Quản trị tối cao (SUPERADMIN).' });
    }

    // Use transaction to clean and insert role permissions
    await prisma.$transaction(async (tx) => {
      // 1. Delete all current role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // 2. Create new permissions
      if (validated.permissions.length > 0) {
        const data = validated.permissions.map((p) => ({
          roleId,
          menuId: p.menuId,
          permissionId: p.permissionId,
          isAllowed: p.isAllowed,
        }));

        await tx.rolePermission.createMany({ data });
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_ROLE_PERMISSIONS',
        entity: 'RolePermissions',
        entityId: roleId,
        newValueJson: JSON.stringify(validated.permissions),
      },
    });

    res.json({ success: true, message: 'Cập nhật phân quyền thành công.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Lỗi cập nhật phân quyền.' });
  }
};
