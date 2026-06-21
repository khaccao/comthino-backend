import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../utils/auditLogger';
import {
  calculateReadingTime,
  createUniqueSlug,
  normalizeTags,
  parseBlogDate,
  parsePositiveInt,
  slugifyVietnamese,
} from '../utils/blog';

const statusValues = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const sortFields = ['publishedAt', 'createdAt', 'displayOrder'] as const;

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Ten danh muc la bat buoc'),
  slug: z.string().trim().optional().nullable(),
  description: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});

const postSchema = z.object({
  categoryId: z.string().min(1, 'Danh muc la bat buoc'),
  title: z.string().trim().min(1, 'Tieu de la bat buoc'),
  slug: z.string().trim().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1, 'Noi dung la bat buoc'),
  thumbnailUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  status: z.enum(statusValues).default('DRAFT'),
  publishedAt: z.any().optional().nullable(),
  tags: z.any().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImageUrl: z.string().optional().nullable(),
  schemaType: z.string().trim().default('BlogPosting'),
  isFeatured: z.coerce.boolean().default(false),
  displayOrder: z.coerce.number().int().default(0),
});

function blogError(res: Response, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ success: false, message: error.errors[0]?.message || fallback });
  }

  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
}

function buildPostData(input: z.infer<typeof postSchema>, slug: string) {
  const publishedAt = parseBlogDate(input.publishedAt);
  return {
    categoryId: input.categoryId,
    title: input.title,
    slug,
    excerpt: input.excerpt || null,
    content: input.content,
    thumbnailUrl: input.thumbnailUrl || null,
    coverImageUrl: input.coverImageUrl || null,
    authorName: input.authorName || 'Com Thi No',
    status: input.status,
    publishedAt: input.status === 'PUBLISHED' ? publishedAt || new Date() : publishedAt,
    readingTime: calculateReadingTime(input.content),
    tags: normalizeTags(input.tags),
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    seoKeywords: input.seoKeywords || null,
    canonicalUrl: input.canonicalUrl || null,
    ogTitle: input.ogTitle || null,
    ogDescription: input.ogDescription || null,
    ogImageUrl: input.ogImageUrl || null,
    schemaType: input.schemaType || 'BlogPosting',
    isFeatured: input.isFeatured,
    displayOrder: input.displayOrder,
  };
}

export const getBlogCategories = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.blogCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { posts: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    blogError(res, error, 'Khong tai duoc danh muc tin.');
  }
};

export const createBlogCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = categorySchema.parse(req.body);
    const slug = await createUniqueSlug('blogCategory', parsed.slug || parsed.name);
    const category = await prisma.blogCategory.create({
      data: {
        name: parsed.name,
        slug,
        description: parsed.description || null,
        displayOrder: parsed.displayOrder,
        isActive: parsed.isActive,
      },
    });

    await logAudit({ userId: req.user?.id, action: 'CREATE', entity: 'BlogCategory', entityId: category.id, oldValue: null, newValue: category });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    blogError(res, error, 'Tao danh muc tin that bai.');
  }
};

export const updateBlogCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await prisma.blogCategory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay danh muc tin.' });

    const parsed = categorySchema.parse(req.body);
    const slug = await createUniqueSlug('blogCategory', parsed.slug || parsed.name, req.params.id);
    const category = await prisma.blogCategory.update({
      where: { id: req.params.id },
      data: {
        name: parsed.name,
        slug,
        description: parsed.description || null,
        displayOrder: parsed.displayOrder,
        isActive: parsed.isActive,
      },
    });

    await logAudit({ userId: req.user?.id, action: 'UPDATE', entity: 'BlogCategory', entityId: category.id, oldValue: existing, newValue: category });
    res.json({ success: true, data: category });
  } catch (error) {
    blogError(res, error, 'Cap nhat danh muc tin that bai.');
  }
};

export const deleteBlogCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await prisma.blogCategory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay danh muc tin.' });

    await prisma.blogCategory.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user?.id, action: 'DELETE', entity: 'BlogCategory', entityId: req.params.id, oldValue: existing, newValue: null });
    res.json({ success: true, message: 'Da xoa danh muc tin.' });
  } catch (error) {
    blogError(res, error, 'Xoa danh muc tin that bai.');
  }
};

export const getBlogPosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 10000);
    const limit = parsePositiveInt(req.query.limit, 10, 100);
    const status = typeof req.query.status === 'string' && statusValues.includes(req.query.status as any)
      ? req.query.status
      : undefined;
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const sortBy = typeof req.query.sortBy === 'string' && sortFields.includes(req.query.sortBy as any)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { excerpt: { contains: keyword } },
        { tags: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: { category: true },
        orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    blogError(res, error, 'Khong tai duoc bai viet.');
  }
};

export const getBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!post) return res.status(404).json({ success: false, message: 'Khong tim thay bai viet.' });
    res.json({ success: true, data: post });
  } catch (error) {
    blogError(res, error, 'Khong tai duoc bai viet.');
  }
};

export const createBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = postSchema.parse(req.body);
    const category = await prisma.blogCategory.findUnique({ where: { id: parsed.categoryId } });
    if (!category) return res.status(400).json({ success: false, message: 'Danh muc tin khong hop le.' });

    const slug = await createUniqueSlug('blogPost', parsed.slug || parsed.title);
    const post = await prisma.blogPost.create({
      data: buildPostData(parsed, slug),
      include: { category: true },
    });

    await logAudit({ userId: req.user?.id, action: 'CREATE', entity: 'BlogPost', entityId: post.id, oldValue: null, newValue: post });
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    blogError(res, error, 'Tao bai viet that bai.');
  }
};

export const updateBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay bai viet.' });

    const parsed = postSchema.parse(req.body);
    const category = await prisma.blogCategory.findUnique({ where: { id: parsed.categoryId } });
    if (!category) return res.status(400).json({ success: false, message: 'Danh muc tin khong hop le.' });

    const slug = await createUniqueSlug('blogPost', parsed.slug || parsed.title, req.params.id);
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: buildPostData(parsed, slug),
      include: { category: true },
    });

    await logAudit({ userId: req.user?.id, action: 'UPDATE', entity: 'BlogPost', entityId: post.id, oldValue: existing, newValue: post });
    res.json({ success: true, data: post });
  } catch (error) {
    blogError(res, error, 'Cap nhat bai viet that bai.');
  }
};

export const deleteBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay bai viet.' });

    await prisma.blogPost.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user?.id, action: 'DELETE', entity: 'BlogPost', entityId: req.params.id, oldValue: existing, newValue: null });
    res.json({ success: true, message: 'Da xoa bai viet.' });
  } catch (error) {
    blogError(res, error, 'Xoa bai viet that bai.');
  }
};

export const publishBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay bai viet.' });

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: existing.publishedAt || new Date() },
      include: { category: true },
    });
    await logAudit({ userId: req.user?.id, action: 'PUBLISH', entity: 'BlogPost', entityId: post.id, oldValue: existing, newValue: post });
    res.json({ success: true, data: post });
  } catch (error) {
    blogError(res, error, 'Dang bai that bai.');
  }
};

export const unpublishBlogPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay bai viet.' });

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT' },
      include: { category: true },
    });
    await logAudit({ userId: req.user?.id, action: 'UNPUBLISH', entity: 'BlogPost', entityId: post.id, oldValue: existing, newValue: post });
    res.json({ success: true, data: post });
  } catch (error) {
    blogError(res, error, 'Go bai that bai.');
  }
};

export const previewBlogSlug = async (req: AuthenticatedRequest, res: Response) => {
  const raw = typeof req.query.title === 'string' ? req.query.title : '';
  res.json({ success: true, data: { slug: slugifyVietnamese(raw) } });
};
