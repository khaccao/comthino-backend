import { Router } from 'express';
import {
  getSiteSettings,
  getNavigation,
  getBanners,
  getHomeSections,
  getMenuCategories,
  getMenuItems,
  getMenuBook,
  getPromotions,
  getGallery,
  getTestimonials,
  postContact,
} from '../controllers/publicController';
import {
  getFeaturedBlogPosts,
  getPublicBlogCategories,
  getPublicBlogPostBySlug,
  getPublicBlogPosts,
  getPublicBlogPostsByCategory,
  getRobotsTxt,
  getSitemapXml,
} from '../controllers/blogPublicController';

const router = Router();

router.get('/site-settings', getSiteSettings);
router.get('/navigation', getNavigation);
router.get('/banners', getBanners);
router.get('/home-sections', getHomeSections);
router.get('/menu-categories', getMenuCategories);
router.get('/menu-items', getMenuItems);
router.get('/menu-book', getMenuBook);
router.get('/promotions', getPromotions);
router.get('/gallery', getGallery);
router.get('/testimonials', getTestimonials);
router.post('/contact', postContact);

router.get('/blog/categories', getPublicBlogCategories);
router.get('/blog/posts', getPublicBlogPosts);
router.get('/blog/posts/featured', getFeaturedBlogPosts);
router.get('/blog/posts/category/:slug', getPublicBlogPostsByCategory);
router.get('/blog/posts/:slug', getPublicBlogPostBySlug);
router.get('/sitemap.xml', getSitemapXml);
router.get('/robots.txt', getRobotsTxt);

export default router;
