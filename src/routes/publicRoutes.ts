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

export default router;
