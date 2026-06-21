import prisma from '../config/prisma';

export async function logAudit({
  userId,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
}: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
}) {
  try {
    const stringify = (val: any) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'string') return val;
      return JSON.stringify(val);
    };

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValue: stringify(oldValue),
        newValue: stringify(newValue),
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
