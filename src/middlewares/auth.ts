import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    isSystemAdmin?: boolean;
    roles?: string[];
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Expecting "Bearer <token>"
    const jwtSecret = process.env.JWT_SECRET || 'comthino_super_secret_key_123456';

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
      }

      req.user = decoded as AuthenticatedRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ message: 'Tiêu đề Authorization bị thiếu.' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN' || req.user.isSystemAdmin)) {
    next();
  } else {
    res.status(403).json({ message: 'Truy cập bị từ chối. Quyền quản trị viên được yêu cầu.' });
  }
};

export const requirePermission = (menuCode: string, permissionCode: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa đăng nhập.' });
    }

    // 1. System Admin or SUPERADMIN role bypasses all checks
    if (req.user.isSystemAdmin || req.user.role === 'SUPERADMIN' || req.user.roles?.includes('SUPERADMIN')) {
      return next();
    }

    try {
      // 2. Fetch the roles for this user
      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });

      const roleIds = userRoles.map(ur => ur.roleId);
      const roleCodes = userRoles.map(ur => ur.role.code);

      // If one of the roles is SUPERADMIN, bypass
      if (roleCodes.includes('SUPERADMIN')) {
        return next();
      }

      // 3. Find if any of these roles are allowed for the menu and permission
      const allowed = await prisma.rolePermission.findFirst({
        where: {
          roleId: { in: roleIds },
          menu: { code: menuCode },
          permission: { code: permissionCode },
          isAllowed: true,
        },
      });

      if (allowed) {
        return next();
      }

      return res.status(403).json({
        message: `Bạn không có quyền thực hiện hành động này (${menuCode}:${permissionCode}).`
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      return res.status(500).json({ message: 'Lỗi kiểm tra quyền hạn.' });
    }
  };
};
