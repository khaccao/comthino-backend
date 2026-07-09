import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { z } from 'zod';

const userCreateSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên'),
  email: z.string().email('Email không đúng định dạng'),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  role: z.string().default('STAFF'),
  roles: z.array(z.string()).optional(), // Role codes
  avatarUrl: z.string().optional().nullable(),
});

const userUpdateSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên').optional(),
  email: z.string().email('Email không đúng định dạng').optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên').optional(),
  role: z.string().optional(),
  roles: z.array(z.string()).optional(), // Role codes
  avatarUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const serializeUser = (user: any) => ({
  ...user,
  roles: (user.userRoles || []).map((item: any) => item.role.code),
  roleNames: (user.userRoles || []).map((item: any) => item.role.name),
});

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isSystemAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, items: users.map(serializeUser) });
  } catch (error) {
    res.status(500).json({ message: 'Không thể tải danh sách người dùng.' });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isSystemAdmin: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải thông tin người dùng.' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = userCreateSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      return res.status(400).json({ message: 'Email đã được sử dụng.' });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const createdBy = req.user?.email || 'System';
    const roleCodes = validated.roles && validated.roles.length > 0 ? validated.roles : [validated.role || 'STAFF'];

    // 1. Create User
    const newUser = await prisma.user.create({
      data: {
        fullName: validated.fullName,
        email: validated.email,
        phone: validated.phone,
        passwordHash,
        role: roleCodes[0] || 'STAFF',
        avatarUrl: validated.avatarUrl,
        createdBy,
        updatedBy: createdBy,
      },
    });

    // 2. Assign Roles if provided. Default new accounts to STAFF.
    if (roleCodes.length > 0) {
      const dbRoles = await prisma.role.findMany({
        where: { code: { in: roleCodes }, isActive: true },
      });

      const userRoleData = dbRoles.map((role) => ({
        userId: newUser.id,
        roleId: role.id,
      }));

      await prisma.userRole.createMany({ data: userRoleData });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE_USER',
        entity: 'Users',
        entityId: newUser.id,
        newValueJson: JSON.stringify({ email: newUser.email, role: newUser.role }),
      },
    });

    res.status(201).json({ success: true, message: 'Tạo tài khoản thành công.', id: newUser.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Lỗi tạo tài khoản.' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = userUpdateSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại.' });
    }

    // Protect superadmin from being updated in sensitive ways by others
    if (user.isSystemAdmin && req.user?.id !== user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa tài khoản Quản trị hệ thống.' });
    }

    const dataToUpdate: any = {};
    if (validated.email !== undefined && validated.email !== user.email) {
      const duplicated = await prisma.user.findUnique({ where: { email: validated.email } });
      if (duplicated) return res.status(400).json({ message: 'Email đã được sử dụng.' });
      dataToUpdate.email = validated.email;
    }
    if (validated.fullName !== undefined) dataToUpdate.fullName = validated.fullName;
    if (validated.phone !== undefined) dataToUpdate.phone = validated.phone;
    if (validated.avatarUrl !== undefined) dataToUpdate.avatarUrl = validated.avatarUrl;
    if (validated.role !== undefined) dataToUpdate.role = validated.role;
    if (validated.isActive !== undefined) {
      // Cannot deactivate admin
      if (user.email === 'admin@comthino.vn' || user.isSystemAdmin) {
        if (!validated.isActive) {
          return res.status(400).json({ message: 'Không thể khóa tài khoản Quản trị hệ thống.' });
        }
      }
      dataToUpdate.isActive = validated.isActive;
    }

    if (validated.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(validated.password, 10);
    }

    dataToUpdate.updatedBy = req.user?.email || 'System';

    // Update main user details
    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    // Update Roles if provided
    if (validated.roles !== undefined) {
      // Delete existing roles
      await prisma.userRole.deleteMany({ where: { userId: id } });

      // Create new ones
      const dbRoles = await prisma.role.findMany({
        where: { code: { in: validated.roles } },
      });

      const userRoleData = dbRoles.map((role) => ({
        userId: id,
        roleId: role.id,
      }));

      await prisma.userRole.createMany({ data: userRoleData });

      if (!user.isSystemAdmin) {
        await prisma.user.update({
          where: { id },
          data: { role: validated.roles[0] || 'STAFF' },
        });
      }
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_USER',
        entity: 'Users',
        entityId: id,
        newValueJson: JSON.stringify(dataToUpdate),
      },
    });

    res.json({ success: true, message: 'Cập nhật tài khoản thành công.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Lỗi cập nhật tài khoản.' });
  }
};

export const lockUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (user.email === 'admin@comthino.vn' || user.isSystemAdmin) {
      return res.status(400).json({ message: 'Không thể khóa tài khoản Quản trị hệ thống.' });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false, updatedBy: req.user?.email || 'System' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'LOCK_USER',
        entity: 'Users',
        entityId: id,
      },
    });

    res.json({ success: true, message: 'Đã khóa tài khoản.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khóa tài khoản.' });
  }
};

export const unlockUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: true, updatedBy: req.user?.email || 'System' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UNLOCK_USER',
        entity: 'Users',
        entityId: id,
      },
    });

    res.json({ success: true, message: 'Đã mở khóa tài khoản.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi mở khóa tài khoản.' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (user.email === 'admin@comthino.vn' || user.isSystemAdmin) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản Quản trị hệ thống.' });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'DELETE_USER',
        entity: 'Users',
        entityId: id,
      },
    });

    res.json({ success: true, message: 'Đã xóa người dùng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa người dùng.' });
  }
};

export const getUserRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    res.json({ success: true, roles: userRoles.map((ur) => ur.role) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách vai trò người dùng.' });
  }
};

export const updateUserRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body; // Array of role codes

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại.' });
    }

    if (user.isSystemAdmin && !roles.includes('SUPERADMIN')) {
      // Must have superadmin
      return res.status(400).json({ message: 'Tài khoản quản trị hệ thống bắt buộc phải có vai trò SUPERADMIN.' });
    }

    await prisma.userRole.deleteMany({ where: { userId } });

    const dbRoles = await prisma.role.findMany({
      where: { code: { in: roles } },
    });

    const userRoleData = dbRoles.map((role) => ({
      userId,
      roleId: role.id,
    }));

    await prisma.userRole.createMany({ data: userRoleData });

    if (!user.isSystemAdmin) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: roles[0] || 'STAFF', updatedBy: req.user?.email || 'System' },
      });
    }

    res.json({ success: true, message: 'Cập nhật vai trò người dùng thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật vai trò.' });
  }
};
