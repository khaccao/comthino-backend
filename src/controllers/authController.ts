import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
});

export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Tài khoản không chính xác hoặc đã bị khóa.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không chính xác.' });
    }

    // Fetch user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
    const roles = userRoles.map(ur => ur.role.code);
    const roleIds = userRoles.map(ur => ur.role.id);

    // Build permissions list
    let permissions: any[] = [];
    if (user.isSystemAdmin || roles.includes('SUPERADMIN')) {
      const allMenus = await prisma.menu.findMany({ where: { isActive: true } });
      const allPerms = await prisma.permission.findMany();
      allMenus.forEach((menu) => {
        allPerms.forEach((perm) => {
          permissions.push({
            menuCode: menu.code,
            permissionCode: perm.code,
            isAllowed: true,
          });
        });
      });
    } else {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { roleId: { in: roleIds }, isAllowed: true },
        include: { menu: true, permission: true },
      });
      permissions = rolePerms.map((rp) => ({
        menuCode: rp.menu.code,
        permissionCode: rp.permission.code,
        isAllowed: true,
      }));
    }

    const jwtSecret = process.env.JWT_SECRET || 'comthino_super_secret_key_123456';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        isSystemAdmin: user.isSystemAdmin,
        roles,
      },
      jwtSecret,
      { expiresIn }
    );

    // Return user info, token, and permissions
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isSystemAdmin: user.isSystemAdmin,
        roles,
        permissions,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Đăng nhập thất bại. Vui lòng thử lại sau.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa đăng nhập.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa.' });
    }

    // Fetch user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
    const roles = userRoles.map(ur => ur.role.code);
    const roleIds = userRoles.map(ur => ur.role.id);

    // Build permissions list
    let permissions: any[] = [];
    if (user.isSystemAdmin || roles.includes('SUPERADMIN')) {
      const allMenus = await prisma.menu.findMany({ where: { isActive: true } });
      const allPerms = await prisma.permission.findMany();
      allMenus.forEach((menu) => {
        allPerms.forEach((perm) => {
          permissions.push({
            menuCode: menu.code,
            permissionCode: perm.code,
            isAllowed: true,
          });
        });
      });
    } else {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { roleId: { in: roleIds }, isAllowed: true },
        include: { menu: true, permission: true },
      });
      permissions = rolePerms.map((rp) => ({
        menuCode: rp.menu.code,
        permissionCode: rp.permission.code,
        isAllowed: true,
      }));
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isSystemAdmin: user.isSystemAdmin,
        roles,
        permissions,
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Đăng xuất thành công.',
  });
};
