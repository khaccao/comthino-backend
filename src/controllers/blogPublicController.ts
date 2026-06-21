import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { parsePositiveInt, stripHtml } from '../utils/blog';

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://comthino.com';

function publicError(res: Response, error: unknown, fallback: string) {
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
}

function blogImage(post: any) {
  return post.ogImageUrl || post.coverImageUrl || post.thumbnailUrl || '/images/favicon.png';
}

function publishedWhere(extra: Record<string, unknown> = {}) {
  return {
    status: 'PUBLISHED',
    publishedAt: { not: null },
    ...extra,
  };
}

function blogOrder(sortBy: string, sortOrder: string) {
  const safeSortBy = ['publishedAt', 'createdAt', 'displayOrder'].includes(sortBy) ? sortBy : 'publishedAt';
  const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  return [{ [safeSortBy]: safeOrder }, { displayOrder: 'asc' }, { createdAt: 'desc' }] as any;
}

export const getPublicBlogCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    publicError(res, error, 'Khong tai duoc danh muc tin.');
  }
};

export const getPublicBlogPosts = async (req: Request, res: Response) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 10000);
    const limit = parsePositiveInt(req.query.limit, 9, 50);
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'publishedAt';
    const sortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : 'desc';

    const where: any = publishedWhere();
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
        orderBy: blogOrder(sortBy, sortOrder),
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
    publicError(res, error, 'Khong tai duoc bai viet.');
  }
};

export const getFeaturedBlogPosts = async (_req: Request, res: Response) => {
  try {
    const featured = await prisma.blogPost.findMany({
      where: publishedWhere({ isFeatured: true }),
      include: { category: true },
      orderBy: [{ displayOrder: 'asc' }, { publishedAt: 'desc' }],
      take: 3,
    });

    const items = featured.length > 0 ? featured : await prisma.blogPost.findMany({
      where: publishedWhere(),
      include: { category: true },
      orderBy: [{ publishedAt: 'desc' }],
      take: 3,
    });

    res.json({ success: true, data: items });
  } catch (error) {
    publicError(res, error, 'Khong tai duoc bai viet noi bat.');
  }
};

export const getPublicBlogPostBySlug = async (req: Request, res: Response) => {
  try {
    const post = await prisma.blogPost.findFirst({
      where: publishedWhere({ slug: req.params.slug }),
      include: { category: true },
    });

    if (!post) return res.status(404).json({ success: false, message: 'Khong tim thay bai viet.' });

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    const relatedPosts = await prisma.blogPost.findMany({
      where: publishedWhere({
        categoryId: post.categoryId,
        id: { not: post.id },
      }),
      include: { category: true },
      orderBy: [{ publishedAt: 'desc' }],
      take: 3,
    });

    res.json({ success: true, data: { ...post, viewCount: post.viewCount + 1, relatedPosts } });
  } catch (error) {
    publicError(res, error, 'Khong tai duoc bai viet.');
  }
};

export const getPublicBlogPostsByCategory = async (req: Request, res: Response) => {
  try {
    const category = await prisma.blogCategory.findFirst({
      where: { slug: req.params.slug, isActive: true },
    });
    if (!category) return res.status(404).json({ success: false, message: 'Khong tim thay danh muc tin.' });

    const page = parsePositiveInt(req.query.page, 1, 10000);
    const limit = parsePositiveInt(req.query.limit, 9, 50);
    const where = publishedWhere({ categoryId: category.id });

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: { category: true },
        orderBy: [{ publishedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        category,
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    publicError(res, error, 'Khong tai duoc bai viet theo danh muc.');
  }
};

export const getSitemapXml = async (_req: Request, res: Response) => {
  try {
    const [posts, categories] = await Promise.all([
      prisma.blogPost.findMany({
        where: publishedWhere(),
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: [{ publishedAt: 'desc' }],
      }),
      prisma.blogCategory.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: [{ displayOrder: 'asc' }],
      }),
    ]);

    const staticUrls = ['/', '/tin-tuc'];
    const urls = [
      ...staticUrls.map((path) => ({
        loc: `${SITE_URL}${path}`,
        lastmod: new Date(),
        priority: path === '/' ? '1.0' : '0.8',
      })),
      ...categories.map((category) => ({
        loc: `${SITE_URL}/tin-tuc/danh-muc/${category.slug}`,
        lastmod: category.updatedAt,
        priority: '0.7',
      })),
      ...posts.map((post) => ({
        loc: `${SITE_URL}/tin-tuc/${post.slug}`,
        lastmod: post.updatedAt || post.publishedAt || new Date(),
        priority: '0.8',
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${new Date(url.lastmod).toISOString()}</lastmod>\n    <priority>${url.priority}</priority>\n  </url>`)
      .join('\n')}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    publicError(res, error, 'Khong tao duoc sitemap.');
  }
};

export const getRobotsTxt = (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`User-agent: *\nAllow: /\nAllow: /tin-tuc\nSitemap: ${SITE_URL}/sitemap.xml\n`);
};

export function buildBlogJsonLd(post: any) {
  return {
    '@context': 'https://schema.org',
    '@type': post.schemaType || 'BlogPosting',
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || stripHtml(post.content).slice(0, 155),
    image: [`${SITE_URL}${blogImage(post).startsWith('/') ? blogImage(post) : `/${blogImage(post)}`}`],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.authorName || 'Com Thi No' },
    mainEntityOfPage: `${SITE_URL}/tin-tuc/${post.slug}`,
  };
}
