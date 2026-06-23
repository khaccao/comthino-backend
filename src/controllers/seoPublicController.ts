import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seo Pages
export const getPublicSeoPages = async (req: Request, res: Response) => {
  try {
    const pages = await prisma.seoPage.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải SeoPages.' });
  }
};

export const getPublicSeoPageBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = await prisma.seoPage.findUnique({
      where: { slug, isPublished: true },
    });
    if (!page) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy trang.' });
    }
    res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết SeoPage.' });
  }
};

// FAQs
export const getPublicFAQs = async (req: Request, res: Response) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải FAQs.' });
  }
};

// Reviews
export const getPublicReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.customerReview.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải Reviews.' });
  }
};
