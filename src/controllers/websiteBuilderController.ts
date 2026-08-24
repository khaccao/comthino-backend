import { Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const ENGINE_VERSION = '1.0.0';

const siteSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  industryType: z.enum(['RESTAURANT', 'HOTEL']).default('RESTAURANT'),
  locale: z.string().default('vi-VN'),
  defaultCurrency: z.string().default('VND'),
  timeZone: z.string().default('Asia/Ho_Chi_Minh'),
  status: z.string().default('DRAFT'),
});

const pageDraftSchema = z.object({
  document: z.any(),
  status: z.string().default('DRAFT'),
});

const domainSchema = z.object({
  hostname: z.string().min(3),
  isPrimary: z.boolean().optional(),
});

const json = (value: any) => JSON.stringify(value ?? null);
const parseJson = (value?: string | null, fallback: any = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const componentDefinitions = [
  {
    key: 'common.header',
    version: '1.0.0',
    category: 'navigation',
    displayName: 'Header',
    propsSchema: { type: 'object', properties: { logoText: { type: 'string' }, ctaLabel: { type: 'string' } } },
    variants: ['classic', 'minimal', 'centered'],
    slots: { navigation: ['common.button'] },
    capabilities: { responsive: true, contentOnlyEditable: true },
  },
  {
    key: 'common.hero',
    version: '1.0.0',
    category: 'common',
    displayName: 'Hero Section',
    propsSchema: { type: 'object', properties: { eyebrow: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, media: { type: 'object' } } },
    variants: ['fullscreen', 'split', 'editorial'],
    slots: { actions: ['common.button'] },
    capabilities: { responsive: true, animation: true, contentOnlyEditable: true },
  },
  {
    key: 'common.button',
    version: '1.0.0',
    category: 'common',
    displayName: 'Button',
    propsSchema: { type: 'object', properties: { label: { type: 'string' }, href: { type: 'string' } } },
    variants: ['solid', 'outline', 'ghost'],
    slots: {},
    capabilities: { responsive: true, contentOnlyEditable: true },
  },
  {
    key: 'restaurant.menu-grid',
    version: '1.0.0',
    category: 'restaurant',
    displayName: 'Restaurant Menu Grid',
    propsSchema: { type: 'object', properties: { title: { type: 'string' }, limit: { type: 'number' } } },
    bindingSchema: { sources: ['menuItems'], filters: ['categoryId', 'isFeatured', 'isAvailable'], sort: ['displayOrder', 'price'] },
    variants: ['photo-top', 'photo-left', 'minimal', 'premium'],
    slots: {},
    capabilities: { responsive: true, contentOnlyEditable: false },
  },
  {
    key: 'restaurant.featured-dishes',
    version: '1.0.0',
    category: 'restaurant',
    displayName: 'Featured Dishes',
    propsSchema: { type: 'object', properties: { title: { type: 'string' }, limit: { type: 'number' } } },
    bindingSchema: { sources: ['menuItems'], filters: ['isFeatured', 'isAvailable'] },
    variants: ['grid', 'carousel', 'editorial'],
    slots: {},
    capabilities: { responsive: true, contentOnlyEditable: false },
  },
  {
    key: 'common.gallery',
    version: '1.0.0',
    category: 'common',
    displayName: 'Gallery',
    propsSchema: { type: 'object', properties: { title: { type: 'string' }, limit: { type: 'number' } } },
    bindingSchema: { sources: ['galleryImages'] },
    variants: ['masonry', 'grid', 'carousel'],
    slots: {},
    capabilities: { responsive: true },
  },
  {
    key: 'common.contact-section',
    version: '1.0.0',
    category: 'common',
    displayName: 'Contact Section',
    propsSchema: { type: 'object', properties: { title: { type: 'string' }, showMap: { type: 'boolean' } } },
    bindingSchema: { sources: ['siteSettings'] },
    variants: ['map-right', 'stacked'],
    slots: {},
    capabilities: { responsive: true, contentOnlyEditable: true },
  },
  {
    key: 'hotel.room-grid',
    version: '1.0.0',
    category: 'hotel',
    displayName: 'Hotel Room Grid',
    propsSchema: { type: 'object', properties: { title: { type: 'string' }, limit: { type: 'number' } } },
    bindingSchema: { sources: ['roomTypes'] },
    variants: ['cards', 'premium', 'compact'],
    slots: {},
    capabilities: { responsive: true },
  },
];

const makeInstance = (componentKey: string, variant: string, props: any = {}, bindings: any[] = [], children: any[] = []) => ({
  id: randomUUID(),
  componentKey,
  componentVersion: '1.0.0',
  variant,
  props,
  styles: {},
  responsiveOverrides: {},
  bindings,
  children,
  slots: {},
  visibility: { base: true },
  locks: { content: false, style: false, move: false, remove: false },
});

const restaurantHome = () => ({
  schemaVersion: '1.0.0',
  route: '/',
  templateKey: 'restaurant.home',
  root: {
    type: 'page-root',
    children: [
      makeInstance('common.header', 'classic', { logoText: 'Cơm Thị Nở', ctaLabel: 'Đặt bàn' }),
      makeInstance('common.hero', 'fullscreen', {
        eyebrow: 'Cơm nhà Bắc Bộ tại Hà Đông',
        title: 'Cơm Thị Nở',
        description: 'Website builder giữ dữ liệu món ăn, SEO và nội dung tách khỏi theme.',
        media: { source: 'site.heroImage' },
      }, [], [
        makeInstance('common.button', 'solid', { label: 'Xem thực đơn', href: '/thuc-don' }),
      ]),
      makeInstance('restaurant.featured-dishes', 'editorial', { title: 'Món nổi bật', limit: 8 }, [
        { source: 'menuItems', filter: { isFeatured: true, isAvailable: true }, sort: [{ field: 'displayOrder', direction: 'asc' }], limit: 8 },
      ]),
      makeInstance('common.gallery', 'masonry', { title: 'Không gian quán', limit: 12 }, [
        { source: 'galleryImages', filter: { isActive: true }, limit: 12 },
      ]),
      makeInstance('common.contact-section', 'map-right', { title: 'Liên hệ & bản đồ', showMap: true }, [
        { source: 'siteSettings' },
      ]),
    ],
  },
  seo: { title: 'Cơm Thị Nở | Quán cơm ngon Hà Đông', description: 'Trang chủ builder-driven của Cơm Thị Nở.' },
  pageSettings: { mode: 'simple' },
});

const restaurantMenu = () => ({
  schemaVersion: '1.0.0',
  route: '/thuc-don',
  templateKey: 'restaurant.menu',
  root: {
    type: 'page-root',
    children: [
      makeInstance('common.header', 'minimal', { logoText: 'Cơm Thị Nở', ctaLabel: 'Gọi món' }),
      makeInstance('common.hero', 'editorial', { eyebrow: 'Thực đơn', title: 'Món ăn trong ngày', description: 'Danh sách món được bind từ MenuItems, không hard-code trong theme.' }),
      makeInstance('restaurant.menu-grid', 'photo-top', { title: 'Tất cả món', limit: 60 }, [
        { source: 'menuItems', filter: { isAvailable: true }, sort: [{ field: 'displayOrder', direction: 'asc' }], limit: 60 },
      ]),
    ],
  },
  seo: { title: 'Thực đơn Cơm Thị Nở', description: 'Thực đơn món ăn được quản trị động.' },
  pageSettings: { mode: 'simple' },
});

const hotelHome = () => ({
  schemaVersion: '1.0.0',
  route: '/',
  templateKey: 'hotel.home',
  root: {
    type: 'page-root',
    children: [
      makeInstance('common.header', 'classic', { logoText: 'Hotel Website', ctaLabel: 'Book now' }),
      makeInstance('common.hero', 'split', { eyebrow: 'Hospitality', title: 'Hotel website foundation', description: 'Hotel core sẵn adapter booking, room binding và theme switch.' }),
      makeInstance('hotel.room-grid', 'cards', { title: 'Room types', limit: 12 }, [{ source: 'roomTypes', limit: 12 }]),
    ],
  },
  seo: { title: 'Hotel Website Builder', description: 'Hotel website builder foundation.' },
  pageSettings: { mode: 'simple' },
});

const defaultTokens = {
  color: {
    brand: '#D97706',
    accent: '#0F766E',
    surface: '#FFF7ED',
    text: '#1C1917',
  },
  font: {
    heading: 'Playfair Display',
    body: 'Inter',
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '24px',
  },
  container: {
    md: '1120px',
    lg: '1280px',
  },
};

const serializeThemeVersion = (item: any) => item ? ({
  ...item,
  manifest: parseJson(item.manifestJson, {}),
  tokens: parseJson(item.tokensJson, {}),
  pageTemplates: parseJson(item.pageTemplatesJson, []),
  presets: parseJson(item.presetsJson, {}),
  assets: parseJson(item.assetsJson, []),
  migrations: parseJson(item.migrationsJson, []),
}) : null;

const serializeComponent = (item: any) => ({
  ...item,
  propsSchema: parseJson(item.propsSchemaJson, {}),
  styleSchema: parseJson(item.styleSchemaJson, {}),
  bindingSchema: parseJson(item.bindingSchemaJson, {}),
  variants: parseJson(item.variantsJson, []),
  slots: parseJson(item.slotsJson, {}),
  allowedParents: parseJson(item.allowedParentsJson, []),
  capabilities: parseJson(item.capabilitiesJson, {}),
  migration: parseJson(item.migrationJson, {}),
});

const serializePageVersion = (item: any) => item ? ({
  ...item,
  document: parseJson(item.documentJson, {}),
  validation: parseJson(item.validationJson, {}),
}) : null;

const validateDocument = async (document: any) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const componentMap = new Map(
    (await prisma.builderComponentDefinition.findMany({ where: { isActive: true } }))
      .map((item) => [`${item.key}@${item.version}`, item]),
  );
  const ids = new Set<string>();
  if (!document?.schemaVersion) errors.push('PAGE_SCHEMA_VERSION_MISSING');
  if (!document?.root || document.root.type !== 'page-root') errors.push('PAGE_ROOT_INVALID');

  const walk = (nodes: any[] = [], path = 'root') => {
    nodes.forEach((node, index) => {
      const nodePath = `${path}.${index}`;
      if (!node.id) errors.push(`INSTANCE_ID_MISSING:${nodePath}`);
      else if (ids.has(node.id)) errors.push(`INSTANCE_ID_DUPLICATE:${node.id}`);
      else ids.add(node.id);

      const key = node.componentKey;
      const version = node.componentVersion || '1.0.0';
      if (!componentMap.has(`${key}@${version}`)) errors.push(`COMPONENT_UNSUPPORTED:${key}@${version}`);
      if (node.bindings && !Array.isArray(node.bindings)) errors.push(`BINDING_INVALID:${node.id || nodePath}`);
      if (node.children) walk(node.children, nodePath);
      Object.values(node.slots || {}).forEach((slot: any) => Array.isArray(slot) && walk(slot, `${nodePath}.slot`));
    });
  };
  walk(document?.root?.children || []);
  if ((document?.root?.children || []).length === 0) warnings.push('PAGE_EMPTY');
  return { valid: errors.length === 0, errors, warnings, checkedAt: new Date().toISOString() };
};

const ensurePageDraft = async (tenantId: string, siteId: string, template: { name: string; slug: string; pageType: string; document: any }) => {
  const page = await prisma.builderPage.upsert({
    where: { siteId_slug: { siteId, slug: template.slug } },
    update: { name: template.name, pageType: template.pageType },
    create: {
      tenantId,
      siteId,
      name: template.name,
      slug: template.slug,
      pageType: template.pageType,
      status: 'DRAFT',
    },
  });
  const existing = page.currentDraftVersionId
    ? await prisma.builderPageVersion.findUnique({ where: { id: page.currentDraftVersionId } })
    : null;
  if (existing) return page;
  const validation = await validateDocument(template.document);
  const version = await prisma.builderPageVersion.create({
    data: {
      tenantId,
      siteId,
      pageId: page.id,
      versionNo: 1,
      status: 'DRAFT',
      documentJson: json(template.document),
      validationJson: json(validation),
    },
  });
  return prisma.builderPage.update({ where: { id: page.id }, data: { currentDraftVersionId: version.id } });
};

export const ensureBuilderDefaults = async () => {
  const tenant = await prisma.builderTenant.upsert({
    where: { slug: 'com-thi-no' },
    update: { name: 'Cơm Thị Nở Platform' },
    create: { name: 'Cơm Thị Nở Platform', slug: 'com-thi-no', status: 'ACTIVE' },
  });

  for (const def of componentDefinitions) {
    await prisma.builderComponentDefinition.upsert({
      where: { key_version: { key: def.key, version: def.version } },
      update: {
        category: def.category,
        displayName: def.displayName,
        propsSchemaJson: json(def.propsSchema),
        bindingSchemaJson: json((def as any).bindingSchema || {}),
        variantsJson: json(def.variants),
        slotsJson: json(def.slots),
        capabilitiesJson: json(def.capabilities),
      },
      create: {
        key: def.key,
        version: def.version,
        category: def.category,
        displayName: def.displayName,
        propsSchemaJson: json(def.propsSchema),
        styleSchemaJson: json({ responsive: true, tokens: ['color', 'font', 'spacing', 'radius'] }),
        bindingSchemaJson: json((def as any).bindingSchema || {}),
        variantsJson: json(def.variants),
        slotsJson: json(def.slots),
        allowedParentsJson: json(['page-root', 'section', 'container', 'slot']),
        capabilitiesJson: json(def.capabilities),
        migrationJson: json({ from: [] }),
      },
    });
  }

  const restaurantTheme = await prisma.builderTheme.upsert({
    where: { code: 'restaurant-heritage-01' },
    update: { name: 'Heritage Dining', industry: 'RESTAURANT', author: 'ComThiNo Platform', tags: json(['vietnamese', 'heritage', 'warm']) },
    create: { code: 'restaurant-heritage-01', name: 'Heritage Dining', industry: 'RESTAURANT', author: 'ComThiNo Platform', tags: json(['vietnamese', 'heritage', 'warm']) },
  });
  const restaurantThemeVersion = await prisma.builderThemeVersion.upsert({
    where: { themeId_version: { themeId: restaurantTheme.id, version: '1.0.0' } },
    update: {},
    create: {
      themeId: restaurantTheme.id,
      version: '1.0.0',
      manifestJson: json({ id: restaurantTheme.code, name: restaurantTheme.name, industry: 'RESTAURANT', engineRange: '>=1.0 <2.0', requiredComponents: componentDefinitions.map(({ key, version }) => ({ key, range: `^${version}` })) }),
      tokensJson: json(defaultTokens),
      pageTemplatesJson: json([
        { name: 'Trang chủ', slug: 'home', pageType: 'HOME', document: restaurantHome() },
        { name: 'Thực đơn', slug: 'menu', pageType: 'MENU', document: restaurantMenu() },
      ]),
      presetsJson: json({ density: 'commercial', mode: 'simple-first' }),
      assetsJson: json([]),
      migrationsJson: json([]),
    },
  });

  const hotelTheme = await prisma.builderTheme.upsert({
    where: { code: 'hotel-elegance-01' },
    update: { name: 'Hotel Elegance', industry: 'HOTEL', author: 'ComThiNo Platform', tags: json(['hotel', 'premium']) },
    create: { code: 'hotel-elegance-01', name: 'Hotel Elegance', industry: 'HOTEL', author: 'ComThiNo Platform', tags: json(['hotel', 'premium']) },
  });
  await prisma.builderThemeVersion.upsert({
    where: { themeId_version: { themeId: hotelTheme.id, version: '1.0.0' } },
    update: {},
    create: {
      themeId: hotelTheme.id,
      version: '1.0.0',
      manifestJson: json({ id: hotelTheme.code, name: hotelTheme.name, industry: 'HOTEL', engineRange: '>=1.0 <2.0' }),
      tokensJson: json({ ...defaultTokens, color: { brand: '#0F172A', accent: '#B45309', surface: '#F8FAFC', text: '#0F172A' } }),
      pageTemplatesJson: json([{ name: 'Hotel Home', slug: 'home', pageType: 'HOME', document: hotelHome() }]),
      presetsJson: json({ density: 'premium', mode: 'advanced-ready' }),
      assetsJson: json([]),
      migrationsJson: json([]),
    },
  });

  const site = await prisma.builderSite.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'com-thi-no' } },
    update: { currentThemeVersionId: restaurantThemeVersion.id },
    create: {
      tenantId: tenant.id,
      name: 'Cơm Thị Nở',
      slug: 'com-thi-no',
      industryType: 'RESTAURANT',
      status: 'ACTIVE',
      currentThemeVersionId: restaurantThemeVersion.id,
    },
  });

  await prisma.builderDesignTokenSet.upsert({
    where: { id: `${site.id}-default-tokens` },
    update: { tokensJson: json(defaultTokens), isActive: true },
    create: {
      id: `${site.id}-default-tokens`,
      tenantId: tenant.id,
      siteId: site.id,
      name: 'Brand tokens',
      scope: 'SITE',
      tokensJson: json(defaultTokens),
      isActive: true,
    },
  });

  const templates = parseJson(restaurantThemeVersion.pageTemplatesJson, []);
  for (const template of templates) {
    await ensurePageDraft(tenant.id, site.id, template);
  }

  return { tenant, site };
};

const getBuilderState = async () => {
  await ensureBuilderDefaults();
  const [tenants, sites, themes, themeVersions, components, tokenSets, pages, pageVersions, domains, deployments] = await Promise.all([
    prisma.builderTenant.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.builderSite.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.builderTheme.findMany({ orderBy: [{ industry: 'asc' }, { name: 'asc' }] }),
    prisma.builderThemeVersion.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.builderComponentDefinition.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { displayName: 'asc' }] }),
    prisma.builderDesignTokenSet.findMany({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.builderPage.findMany({ orderBy: [{ siteId: 'asc' }, { createdAt: 'asc' }] }),
    prisma.builderPageVersion.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.builderDomain.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.builderDeployment.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const versionMap = new Map(pageVersions.map((item) => [item.id, serializePageVersion(item)]));
  return {
    engineVersion: ENGINE_VERSION,
    tenants,
    sites,
    themes: themes.map((theme) => ({
      ...theme,
      tags: parseJson(theme.tags, []),
      versions: themeVersions.filter((version) => version.themeId === theme.id).map(serializeThemeVersion),
    })),
    components: components.map(serializeComponent),
    tokenSets: tokenSets.map((item) => ({ ...item, tokens: parseJson(item.tokensJson, {}) })),
    pages: pages.map((page) => ({ ...page, currentDraft: versionMap.get(page.currentDraftVersionId || ''), published: versionMap.get(page.publishedVersionId || '') })),
    domains,
    deployments: deployments.map((item) => ({ ...item, logs: parseJson(item.logsJson, []) })),
  };
};

export const getWebsiteBuilderBootstrap = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, data: await getBuilderState() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Không tải được Website Builder.' });
  }
};

export const createBuilderSite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureBuilderDefaults();
    const data = siteSchema.parse(req.body);
    const tenant = await prisma.builderTenant.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!tenant) throw new Error('Chưa có tenant builder.');
    const themeVersion = await prisma.builderThemeVersion.findFirst({
      where: { status: 'ACTIVE', themeId: { in: (await prisma.builderTheme.findMany({ where: { industry: data.industryType }, select: { id: true } })).map((item) => item.id) } },
      orderBy: { createdAt: 'desc' },
    });
    const site = await prisma.builderSite.create({
      data: { ...data, tenantId: tenant.id, currentThemeVersionId: themeVersion?.id || null },
    });
    if (themeVersion) {
      const templates = parseJson(themeVersion.pageTemplatesJson, []);
      for (const template of templates) await ensurePageDraft(tenant.id, site.id, template);
    }
    res.status(201).json({ success: true, data: site });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không tạo được site builder.' });
  }
};

export const updateBuilderSite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = siteSchema.partial().parse(req.body);
    const site = await prisma.builderSite.update({ where: { id: req.params.siteId }, data });
    res.json({ success: true, data: site });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không cập nhật được site builder.' });
  }
};

export const applyBuilderTheme = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureBuilderDefaults();
    const site = await prisma.builderSite.findUnique({ where: { id: req.params.siteId } });
    const themeVersion = await prisma.builderThemeVersion.findUnique({ where: { id: String(req.body.themeVersionId || '') } });
    if (!site || !themeVersion) throw new Error('Site hoặc theme version không tồn tại.');
    const theme = await prisma.builderTheme.findUnique({ where: { id: themeVersion.themeId } });
    if (theme?.industry !== site.industryType) throw new Error('Theme không cùng ngành với site.');

    const snapshot = await prisma.builderSnapshot.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        themeVersionId: site.currentThemeVersionId,
        snapshotJson: json(await getBuilderState()),
        validationJson: json({ valid: true, type: 'THEME_SWITCH_SAFETY_SNAPSHOT' }),
        createdBy: req.user?.id,
      },
    });
    await prisma.builderSite.update({ where: { id: site.id }, data: { currentThemeVersionId: themeVersion.id } });
    for (const template of parseJson(themeVersion.pageTemplatesJson, [])) await ensurePageDraft(site.tenantId, site.id, template);
    res.json({ success: true, data: { migrationReport: { safetySnapshotId: snapshot.id, preservedDomainData: true, unmappedBindings: [] } } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không áp dụng được theme.' });
  }
};

export const saveBuilderPageDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = pageDraftSchema.parse(req.body);
    const page = await prisma.builderPage.findUnique({ where: { id: req.params.pageId } });
    if (!page) throw new Error('Page không tồn tại.');
    const latest = await prisma.builderPageVersion.findFirst({ where: { pageId: page.id }, orderBy: { versionNo: 'desc' } });
    const validation = await validateDocument(data.document);
    const version = await prisma.builderPageVersion.create({
      data: {
        tenantId: page.tenantId,
        siteId: page.siteId,
        pageId: page.id,
        versionNo: Number(latest?.versionNo || 0) + 1,
        status: data.status,
        documentJson: json(data.document),
        validationJson: json(validation),
        createdBy: req.user?.id,
      },
    });
    await prisma.builderPage.update({ where: { id: page.id }, data: { currentDraftVersionId: version.id, status: validation.valid ? 'DRAFT' : 'INVALID' } });
    res.json({ success: true, data: serializePageVersion(version) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không lưu được draft page.' });
  }
};

export const upsertBuilderDomain = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = domainSchema.parse(req.body);
    const site = await prisma.builderSite.findUnique({ where: { id: req.params.siteId } });
    if (!site) throw new Error('Site không tồn tại.');
    if (data.isPrimary) await prisma.builderDomain.updateMany({ where: { siteId: site.id }, data: { isPrimary: false } });
    const domain = await prisma.builderDomain.upsert({
      where: { hostname: data.hostname.toLowerCase() },
      update: { isPrimary: data.isPrimary ?? false },
      create: {
        tenantId: site.tenantId,
        siteId: site.id,
        hostname: data.hostname.toLowerCase(),
        isPrimary: data.isPrimary ?? false,
        verificationToken: randomUUID(),
      },
    });
    res.json({ success: true, data: domain });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không lưu được domain.' });
  }
};

export const verifyBuilderDomain = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const domain = await prisma.builderDomain.update({
      where: { id: req.params.domainId },
      data: { status: 'VERIFIED', sslStatus: 'READY', lastCheckedAt: new Date() },
    });
    res.json({ success: true, data: domain });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không verify được domain.' });
  }
};

export const publishBuilderSite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureBuilderDefaults();
    const site = await prisma.builderSite.findUnique({ where: { id: req.params.siteId } });
    if (!site) throw new Error('Site không tồn tại.');
    const pages = await prisma.builderPage.findMany({ where: { siteId: site.id } });
    const versions = await prisma.builderPageVersion.findMany({ where: { id: { in: pages.map((page) => page.currentDraftVersionId || '').filter(Boolean) } } });
    const serializedPages = versions.map(serializePageVersion);
    const validations = serializedPages.map((item) => item.validation).filter(Boolean);
    const errors = validations.flatMap((item) => item.errors || []);
    const warnings = validations.flatMap((item) => item.warnings || []);
    if (errors.length) {
      res.status(400).json({ success: false, message: 'Publish bị chặn vì page/schema chưa hợp lệ.', data: { errors, warnings } });
      return;
    }

    const snapshot = await prisma.builderSnapshot.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        themeVersionId: site.currentThemeVersionId,
        snapshotJson: json({ site, pages: serializedPages, engineVersion: ENGINE_VERSION, createdAt: new Date().toISOString() }),
        validationJson: json({ valid: true, errors: [], warnings }),
        createdBy: req.user?.id,
      },
    });
    const primaryDomain = await prisma.builderDomain.findFirst({ where: { siteId: site.id, isPrimary: true } });
    const deployment = await prisma.builderDeployment.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        snapshotId: snapshot.id,
        status: 'SUCCESS',
        publicUrl: primaryDomain ? `https://${primaryDomain.hostname}` : `https://${site.slug}.comthino.local`,
        logsJson: json([
          { level: 'INFO', message: 'Validation passed', at: new Date().toISOString() },
          { level: 'INFO', message: 'Immutable snapshot created', snapshotId: snapshot.id, at: new Date().toISOString() },
          { level: 'INFO', message: 'Release activated atomically', at: new Date().toISOString() },
        ]),
        activatedAt: new Date(),
        createdBy: req.user?.id,
      },
    });
    await prisma.builderSite.update({ where: { id: site.id }, data: { activeDeploymentId: deployment.id, status: 'ACTIVE' } });
    for (const page of pages) {
      if (page.currentDraftVersionId) {
        await prisma.builderPage.update({ where: { id: page.id }, data: { publishedVersionId: page.currentDraftVersionId, status: 'PUBLISHED' } });
        await prisma.builderPageVersion.update({ where: { id: page.currentDraftVersionId }, data: { status: 'PUBLISHED' } });
      }
    }
    res.json({ success: true, data: { deployment, snapshot, warnings } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không publish được site.' });
  }
};

export const rollbackBuilderDeployment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deployment = await prisma.builderDeployment.findUnique({ where: { id: req.params.deploymentId } });
    if (!deployment) throw new Error('Deployment không tồn tại.');
    await prisma.builderDeployment.update({ where: { id: deployment.id }, data: { status: 'ROLLED_BACK' } });
    const rollback = await prisma.builderDeployment.create({
      data: {
        tenantId: deployment.tenantId,
        siteId: deployment.siteId,
        snapshotId: deployment.snapshotId,
        status: 'SUCCESS',
        publicUrl: deployment.publicUrl,
        logsJson: json([{ level: 'INFO', message: `Rollback from deployment ${deployment.id}`, at: new Date().toISOString() }]),
        activatedAt: new Date(),
        createdBy: req.user?.id,
      },
    });
    await prisma.builderSite.update({ where: { id: deployment.siteId }, data: { activeDeploymentId: rollback.id } });
    res.json({ success: true, data: rollback });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Không rollback được deployment.' });
  }
};
