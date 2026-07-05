import { Router } from 'express';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import {
  getDashboard,
  getSiteSettings,
  updateSiteSettings,
  getNavItems,
  createNavItem,
  updateNavItem,
  deleteNavItem,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getHomeSections,
  createHomeSection,
  updateHomeSection,
  deleteHomeSection,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getContacts,
  updateContactStatus,
  deleteContact,
  getMediaFiles,
  uploadMedia,
  updateMedia,
  deleteMedia,
} from '../controllers/adminController';
import {
  getBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  previewBlogSlug,
} from '../controllers/blogAdminController';
import {
  getSeoPages,
  getSeoPage,
  createSeoPage,
  updateSeoPage,
  deleteSeoPage,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/seoAdminController';
import {
  addPosOrderItem,
  confirmKitchen,
  deletePosOrderItem,
  getPosBootstrap,
  getPosDashboard,
  getPosHistory,
  getPosOrderDetail,
  openPosOrder,
  payPosOrder,
  updatePosOrder,
  updatePosOrderItem,
  updatePrintTemplate,
  upsertPosMenuCategory,
  upsertPosMenuItem,
  upsertPosTable,
} from '../controllers/posAdminController';

const router = Router();

// Apply JWT Authentication and Admin Authorization to all admin routes
router.use(authenticateJWT);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getDashboard);

// POS
router.get('/pos/bootstrap', getPosBootstrap);
router.post('/pos/tables', upsertPosTable);
router.put('/pos/tables/:id', upsertPosTable);
router.post('/pos/menu-categories', upsertPosMenuCategory);
router.put('/pos/menu-categories/:id', upsertPosMenuCategory);
router.post('/pos/menu-items', upsertPosMenuItem);
router.put('/pos/menu-items/:id', upsertPosMenuItem);
router.post('/pos/orders/open', openPosOrder);
router.get('/pos/orders/history', getPosHistory);
router.get('/pos/orders/:id', getPosOrderDetail);
router.put('/pos/orders/:id', updatePosOrder);
router.post('/pos/orders/:id/items', addPosOrderItem);
router.put('/pos/orders/:id/items/:itemId', updatePosOrderItem);
router.delete('/pos/orders/:id/items/:itemId', deletePosOrderItem);
router.post('/pos/orders/:id/confirm-kitchen', confirmKitchen);
router.post('/pos/orders/:id/pay', payPosOrder);
router.get('/pos/dashboard', getPosDashboard);
router.put('/pos/print-templates/:code', updatePrintTemplate);

// Site Settings (There's only 1 settings record, so GET & PUT are enough)
router.get('/site-settings', getSiteSettings);
router.put('/site-settings', updateSiteSettings);
router.post('/site-settings', updateSiteSettings); // For compatibility with generic CRUD route paths
router.delete('/site-settings', (req, res) => res.status(400).json({ message: 'Không thể xóa cấu hình hệ thống.' }));

// Navigation Items
router.get('/navigation-items', getNavItems);
router.post('/navigation-items', createNavItem);
router.put('/navigation-items/:id', updateNavItem);
router.delete('/navigation-items/:id', deleteNavItem);

// Banners
router.get('/banners', getBanners);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Home Sections
router.get('/home-sections', getHomeSections);
router.post('/home-sections', createHomeSection);
router.put('/home-sections/:id', updateHomeSection);
router.delete('/home-sections/:id', deleteHomeSection);

// Menu Categories
router.get('/menu-categories', getCategories);
router.post('/menu-categories', createCategory);
router.put('/menu-categories/:id', updateCategory);
router.delete('/menu-categories/:id', deleteCategory);

// Menu Items
router.get('/menu-items', getMenuItems);
router.post('/menu-items', createMenuItem);
router.put('/menu-items/:id', updateMenuItem);
router.delete('/menu-items/:id', deleteMenuItem);

// Promotions
router.get('/promotions', getPromotions);
router.post('/promotions', createPromotion);
router.put('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deletePromotion);

// Gallery Images
router.get('/gallery-images', getGalleryImages);
router.post('/gallery-images', createGalleryImage);
router.put('/gallery-images/:id', updateGalleryImage);
router.delete('/gallery-images/:id', deleteGalleryImage);

// Testimonials
router.get('/testimonials', getTestimonials);
router.post('/testimonials', createTestimonial);
router.put('/testimonials/:id', updateTestimonial);
router.delete('/testimonials/:id', deleteTestimonial);

// Contact Messages
router.get('/contact-messages', getContacts);
router.put('/contact-messages/:id', updateContactStatus);
router.delete('/contact-messages/:id', deleteContact);

// Media Manager
router.get('/media', getMediaFiles);
router.post('/media', upload.single('image'), uploadMedia);
router.put('/media/:id', updateMedia);
router.delete('/media/:id', deleteMedia);

// Standalone Upload Endpoint
router.post('/upload/image', upload.single('image'), uploadMedia);

// Blog / News
router.get('/blog/slug-preview', previewBlogSlug);
router.get('/blog/categories', getBlogCategories);
router.post('/blog/categories', createBlogCategory);
router.put('/blog/categories/:id', updateBlogCategory);
router.delete('/blog/categories/:id', deleteBlogCategory);

router.get('/blog/posts', getBlogPosts);
router.get('/blog/posts/:id', getBlogPost);
router.post('/blog/posts', createBlogPost);
router.put('/blog/posts/:id', updateBlogPost);
router.delete('/blog/posts/:id', deleteBlogPost);
router.post('/blog/posts/:id/publish', publishBlogPost);
router.post('/blog/posts/:id/unpublish', unpublishBlogPost);

// SEO Manager
// Seo Pages
router.get('/seo-pages', getSeoPages);
router.get('/seo-pages/:id', getSeoPage);
router.post('/seo-pages', createSeoPage);
router.put('/seo-pages/:id', updateSeoPage);
router.delete('/seo-pages/:id', deleteSeoPage);

// FAQs
router.get('/faqs', getFAQs);
router.post('/faqs', createFAQ);
router.put('/faqs/:id', updateFAQ);
router.delete('/faqs/:id', deleteFAQ);

// Reviews
router.get('/reviews', getReviews);
router.post('/reviews', createReview);
router.put('/reviews/:id', updateReview);
router.delete('/reviews/:id', deleteReview);

export default router;
