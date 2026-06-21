import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

export const getSiteSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.siteSettings.findFirst();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải thông tin cấu hình.' });
  }
};

export const getNavigation = async (req: Request, res: Response) => {
  try {
    const navItems = await prisma.navigationItem.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: navItems });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải menu điều hướng.' });
  }
};

export const getBanners = async (req: Request, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải banner.' });
  }
};

export const getHomeSections = async (req: Request, res: Response) => {
  try {
    const sections = await prisma.homeSection.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải các section trang chủ.' });
  }
};

export const getMenuCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh mục.' });
  }
};

export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: { displayOrder: 'asc' },
      include: { category: true },
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách món ăn.' });
  }
};

// Gets only categories and menu items selected/structured for the Menu Book.
export const getMenuBook = async (req: Request, res: Response) => {
  try {
    // We return active categories with their available menu items, ordered properly
    const menuBook = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    res.json({ success: true, data: menuBook });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải menu quyển sách.' });
  }
};

export const getPromotions = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    // Fetch promotions that are active and within the date range
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải chương trình khuyến mãi.' });
  }
};

export const getGallery = async (req: Request, res: Response) => {
  try {
    const images = await prisma.galleryImage.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải thư viện ảnh.' });
  }
};

export const getTestimonials = async (req: Request, res: Response) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải đánh giá của khách hàng.' });
  }
};

const contactSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại không đúng định dạng Việt Nam'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  message: z.string().min(5, 'Nội dung tin nhắn phải từ 5 ký tự trở lên'),
});

export const postContact = async (req: Request, res: Response) => {
  try {
    const validatedData = contactSchema.parse(req.body);
    const { fullName, phone, email, message } = validatedData;

    const contact = await prisma.contactMessage.create({
      data: {
        fullName,
        phone,
        email: email || null,
        message,
        status: 'NEW',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Gửi liên hệ thành công. Chúng tôi sẽ phản hồi lại sớm nhất!',
      data: contact,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: 'Lỗi khi gửi liên hệ. Vui lòng thử lại sau.' });
  }
};
