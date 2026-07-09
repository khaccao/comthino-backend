import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 logs for performance
      include: {
        user: {
          select: { fullName: true, email: true },
        },
      },
    });
    // map fields to match frontend expectations if necessary, or just return them
    const formattedLogs = logs.map((l: any) => ({
      ...l,
      tableName: l.entityName || l.entity,
      recordId: l.entityId,
    }));
    res.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Lỗi tải nhật ký hệ thống' });
  }
};
