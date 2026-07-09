import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getMenus = async (req: Request, res: Response) => {
  try {
    const menus = await prisma.menu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, items: menus });
  } catch (error) {
    res.status(500).json({ message: 'Không thể tải danh sách menu.' });
  }
};
