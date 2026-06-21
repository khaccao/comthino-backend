import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../utils/auditLogger';
import path from 'path';
import fs from 'fs';

// --- Dashboard ---
export const getDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalItems = await prisma.menuItem.count();
    const totalCategories = await prisma.menuCategory.count();
    
    const now = new Date();
    const activePromotions = await prisma.promotion.count({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    const newMessages = await prisma.contactMessage.count({
      where: { status: 'NEW' },
    });

    const visibleItems = await prisma.menuItem.count({ where: { isAvailable: true } });
    const hiddenItems = await prisma.menuItem.count({ where: { isAvailable: false } });

    // Recent activity (audit logs)
    const recentLogs = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        totalItems,
        totalCategories,
        activePromotions,
        newMessages,
        visibleItems,
        hiddenItems,
        recentLogs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải thống kê dashboard.' });
  }
};

// --- Site Settings ---
export const getSiteSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let settings = await prisma.siteSettings.findFirst();
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { siteName: 'Cơm Thị Nở' },
      });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải cài đặt website.' });
  }
};

export const updateSiteSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    let settings = await prisma.siteSettings.findFirst();

    let oldVal = settings ? { ...settings } : null;
    let newVal;

    if (!settings) {
      newVal = await prisma.siteSettings.create({ data: body });
    } else {
      newVal = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: body,
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'SiteSettings',
      entityId: newVal.id,
      oldValue: oldVal,
      newValue: newVal,
    });

    res.json({ success: true, data: newVal, message: 'Cập nhật cài đặt website thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật cài đặt website.' });
  }
};

// --- Navigation Items ---
export const getNavItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.navigationItem.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải menu điều hướng.' });
  }
};

export const createNavItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const item = await prisma.navigationItem.create({ data: body });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'NavigationItem',
      entityId: item.id,
      newValue: item,
    });

    res.status(201).json({ success: true, data: item, message: 'Tạo menu điều hướng thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo menu điều hướng.' });
  }
};

export const updateNavItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.navigationItem.findUnique({ where: { id } });
    const item = await prisma.navigationItem.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'NavigationItem',
      entityId: item.id,
      oldValue: oldVal,
      newValue: item,
    });

    res.json({ success: true, data: item, message: 'Cập nhật menu điều hướng thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật menu điều hướng.' });
  }
};

export const deleteNavItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.navigationItem.findUnique({ where: { id } });
    await prisma.navigationItem.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'NavigationItem',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa menu điều hướng thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa menu điều hướng.' });
  }
};

// --- Banners ---
export const getBanners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải banners.' });
  }
};

export const createBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const banner = await prisma.banner.create({ data: req.body });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Banner',
      entityId: banner.id,
      newValue: banner,
    });

    res.status(201).json({ success: true, data: banner, message: 'Tạo banner thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo banner.' });
  }
};

export const updateBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.banner.findUnique({ where: { id } });
    const banner = await prisma.banner.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Banner',
      entityId: banner.id,
      oldValue: oldVal,
      newValue: banner,
    });

    res.json({ success: true, data: banner, message: 'Cập nhật banner thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật banner.' });
  }
};

export const deleteBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.banner.findUnique({ where: { id } });
    await prisma.banner.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Banner',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa banner thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa banner.' });
  }
};

// --- Home Sections ---
export const getHomeSections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sections = await prisma.homeSection.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải home sections.' });
  }
};

export const createHomeSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const section = await prisma.homeSection.create({ data: req.body });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'HomeSection',
      entityId: section.id,
      newValue: section,
    });

    res.status(201).json({ success: true, data: section, message: 'Tạo home section thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo home section.' });
  }
};

export const updateHomeSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.homeSection.findUnique({ where: { id } });
    const section = await prisma.homeSection.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'HomeSection',
      entityId: section.id,
      oldValue: oldVal,
      newValue: section,
    });

    res.json({ success: true, data: section, message: 'Cập nhật section thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật section.' });
  }
};

export const deleteHomeSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.homeSection.findUnique({ where: { id } });
    await prisma.homeSection.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'HomeSection',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa section thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa section.' });
  }
};

// --- Menu Categories ---
export const getCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh mục món.' });
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = await prisma.menuCategory.create({ data: req.body });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'MenuCategory',
      entityId: category.id,
      newValue: category,
    });

    res.status(201).json({ success: true, data: category, message: 'Tạo danh mục món ăn thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo danh mục món.' });
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.menuCategory.findUnique({ where: { id } });
    const category = await prisma.menuCategory.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'MenuCategory',
      entityId: category.id,
      oldValue: oldVal,
      newValue: category,
    });

    res.json({ success: true, data: category, message: 'Cập nhật danh mục thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật danh mục.' });
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.menuCategory.findUnique({ where: { id } });
    await prisma.menuCategory.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'MenuCategory',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa danh mục thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa danh mục.' });
  }
};

// --- Menu Items ---
export const getMenuItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { category: true },
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách món ăn.' });
  }
};

export const createMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await prisma.menuItem.create({ data: req.body });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'MenuItem',
      entityId: item.id,
      newValue: item,
    });

    res.status(201).json({ success: true, data: item, message: 'Tạo món ăn thành công.' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Slug này đã tồn tại, vui lòng đổi tên hoặc slug.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi tạo món ăn.' });
  }
};

export const updateMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.menuItem.findUnique({ where: { id } });
    const item = await prisma.menuItem.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'MenuItem',
      entityId: item.id,
      oldValue: oldVal,
      newValue: item,
    });

    res.json({ success: true, data: item, message: 'Cập nhật món ăn thành công.' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Slug này đã tồn tại, vui lòng chọn slug khác.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi cập nhật món ăn.' });
  }
};

export const deleteMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.menuItem.findUnique({ where: { id } });
    await prisma.menuItem.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'MenuItem',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa món ăn thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa món ăn.' });
  }
};

// --- Promotions ---
export const getPromotions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải khuyến mãi.' });
  }
};

export const createPromotion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = {
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    };
    const promotion = await prisma.promotion.create({ data });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Promotion',
      entityId: promotion.id,
      newValue: promotion,
    });

    res.status(201).json({ success: true, data: promotion, message: 'Tạo chương trình khuyến mãi thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo khuyến mãi.' });
  }
};

export const updatePromotion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.promotion.findUnique({ where: { id } });
    const data = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    };
    const promotion = await prisma.promotion.update({
      where: { id },
      data,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Promotion',
      entityId: promotion.id,
      oldValue: oldVal,
      newValue: promotion,
    });

    res.json({ success: true, data: promotion, message: 'Cập nhật khuyến mãi thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật khuyến mãi.' });
  }
};

export const deletePromotion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.promotion.findUnique({ where: { id } });
    await prisma.promotion.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Promotion',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa khuyến mãi thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa khuyến mãi.' });
  }
};

// --- Gallery Images ---
export const getGalleryImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải thư viện ảnh.' });
  }
};

export const createGalleryImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const image = await prisma.galleryImage.create({ data: req.body });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'GalleryImage',
      entityId: image.id,
      newValue: image,
    });

    res.status(201).json({ success: true, data: image, message: 'Thêm ảnh thư viện thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải ảnh vào thư viện.' });
  }
};

export const updateGalleryImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.galleryImage.findUnique({ where: { id } });
    const image = await prisma.galleryImage.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'GalleryImage',
      entityId: image.id,
      oldValue: oldVal,
      newValue: image,
    });

    res.json({ success: true, data: image, message: 'Cập nhật ảnh thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật ảnh.' });
  }
};

export const deleteGalleryImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.galleryImage.findUnique({ where: { id } });
    await prisma.galleryImage.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'GalleryImage',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa ảnh thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa ảnh.' });
  }
};

// --- Testimonials ---
export const getTestimonials = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách phản hồi.' });
  }
};

export const createTestimonial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tm = await prisma.testimonial.create({ data: req.body });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Testimonial',
      entityId: tm.id,
      newValue: tm,
    });

    res.status(201).json({ success: true, data: tm, message: 'Tạo phản hồi khách hàng thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo phản hồi.' });
  }
};

export const updateTestimonial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.testimonial.findUnique({ where: { id } });
    const tm = await prisma.testimonial.update({
      where: { id },
      data: req.body,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Testimonial',
      entityId: tm.id,
      oldValue: oldVal,
      newValue: tm,
    });

    res.json({ success: true, data: tm, message: 'Cập nhật phản hồi thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật phản hồi.' });
  }
};

export const deleteTestimonial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.testimonial.findUnique({ where: { id } });
    await prisma.testimonial.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Testimonial',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa phản hồi thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa phản hồi.' });
  }
};

// --- Contact Messages ---
export const getContacts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách liên hệ.' });
  }
};

export const updateContactStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // NEW, CONTACTED, DONE
    const oldVal = await prisma.contactMessage.findUnique({ where: { id } });
    const contact = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE_STATUS',
      entity: 'ContactMessage',
      entityId: id,
      oldValue: oldVal,
      newValue: contact,
    });

    res.json({ success: true, data: contact, message: 'Cập nhật trạng thái liên hệ thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật liên hệ.' });
  }
};

export const deleteContact = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.contactMessage.findUnique({ where: { id } });
    await prisma.contactMessage.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'ContactMessage',
      entityId: id,
      oldValue: oldVal,
    });

    res.json({ success: true, message: 'Xóa liên hệ thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa liên hệ.' });
  }
};

// --- Media Files Manager ---
export const getMediaFiles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.mediaFile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách file media.' });
  }
};

export const uploadMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy file tải lên.' });
    }

    const { filename, originalname, mimetype, size } = req.file;
    // Serve static files via url. Since our Nginx proxy serves static uploads on /uploads
    const fileUrl = `/uploads/${filename}`;

    const media = await prisma.mediaFile.create({
      data: {
        fileName: filename,
        originalName: originalname,
        fileUrl,
        mimeType: mimetype,
        size,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPLOAD_MEDIA',
      entity: 'MediaFile',
      entityId: media.id,
      newValue: media,
    });

    res.status(201).json({
      success: true,
      message: 'Tải file lên thành công.',
      url: fileUrl,
      data: media,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải ảnh lên server.' });
  }
};

export const deleteMedia = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const media = await prisma.mediaFile.findUnique({ where: { id } });

    if (!media) {
      return res.status(404).json({ success: false, message: 'File không tồn tại trên hệ thống.' });
    }

    // Try deleting file from disk
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const filePath = path.isAbsolute(uploadDir)
      ? path.join(uploadDir, media.fileName)
      : path.join(__dirname, '../../', uploadDir, media.fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.mediaFile.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE_MEDIA',
      entity: 'MediaFile',
      entityId: id,
      oldValue: media,
    });

    res.json({ success: true, message: 'Xóa tệp media thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa tệp media.' });
  }
};
