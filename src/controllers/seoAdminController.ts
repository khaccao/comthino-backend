import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAudit } from '../utils/auditLogger';

// Define a type for AuthenticatedRequest if not globally available
interface AuthenticatedRequest extends Request {
  user?: any;
}

const prisma = new PrismaClient();

// --- Seo Pages ---
export const getSeoPages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pages = await prisma.seoPage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải SeoPages.' });
  }
};

export const getSeoPage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await prisma.seoPage.findUnique({ where: { id } });
    if (!page) return res.status(404).json({ success: false, message: 'Không tìm thấy trang.' });
    res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết SeoPage.' });
  }
};

export const createSeoPage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    // Check slug uniqueness
    const existing = await prisma.seoPage.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Slug đã tồn tại.' });
    }

    const page = await prisma.seoPage.create({ data });
    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'SeoPage',
      entityId: page.id,
      newValue: page,
    });
    res.status(201).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo SeoPage.' });
  }
};

export const updateSeoPage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Check slug uniqueness if changed
    if (data.slug) {
      const existing = await prisma.seoPage.findFirst({
        where: { slug: data.slug, id: { not: id } }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Slug đã tồn tại.' });
      }
    }

    const oldVal = await prisma.seoPage.findUnique({ where: { id } });
    const page = await prisma.seoPage.update({ where: { id }, data });
    
    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'SeoPage',
      entityId: page.id,
      oldValue: oldVal,
      newValue: page,
    });
    res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật SeoPage.' });
  }
};

export const deleteSeoPage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.seoPage.findUnique({ where: { id } });
    await prisma.seoPage.delete({ where: { id } });
    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'SeoPage',
      entityId: id,
      oldValue: oldVal,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa SeoPage.' });
  }
};

// --- FAQs ---
export const getFAQs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải FAQs.' });
  }
};

export const createFAQ = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const faq = await prisma.fAQ.create({ data });
    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'FAQ',
      entityId: faq.id,
      newValue: faq,
    });
    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo FAQ.' });
  }
};

export const updateFAQ = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const oldVal = await prisma.fAQ.findUnique({ where: { id } });
    const faq = await prisma.fAQ.update({ where: { id }, data });
    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'FAQ',
      entityId: faq.id,
      oldValue: oldVal,
      newValue: faq,
    });
    res.json({ success: true, data: faq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật FAQ.' });
  }
};

export const deleteFAQ = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.fAQ.findUnique({ where: { id } });
    await prisma.fAQ.delete({ where: { id } });
    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'FAQ',
      entityId: id,
      oldValue: oldVal,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa FAQ.' });
  }
};

// --- Customer Reviews ---
export const getReviews = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reviews = await prisma.customerReview.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải Reviews.' });
  }
};

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const review = await prisma.customerReview.create({ data });
    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'CustomerReview',
      entityId: review.id,
      newValue: review,
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo Review.' });
  }
};

export const updateReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const oldVal = await prisma.customerReview.findUnique({ where: { id } });
    const review = await prisma.customerReview.update({ where: { id }, data });
    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'CustomerReview',
      entityId: review.id,
      oldValue: oldVal,
      newValue: review,
    });
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật Review.' });
  }
};

export const deleteReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldVal = await prisma.customerReview.findUnique({ where: { id } });
    await prisma.customerReview.delete({ where: { id } });
    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'CustomerReview',
      entityId: id,
      oldValue: oldVal,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa Review.' });
  }
};
