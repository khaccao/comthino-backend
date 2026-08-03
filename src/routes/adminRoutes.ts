import { Router } from 'express';
import { authenticateJWT, requireAdmin, requirePayrollOtp, requirePermission, requireRevenueOtp } from '../middlewares/auth';
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
  updatePosPaymentSetting,
  updatePosOrder,
  updatePosOrderItem,
  updatePosTableLayout,
  updatePrintTemplate,
  upsertPosMenuCategory,
  upsertPosMenuItem,
  upsertPosTable,
} from '../controllers/posAdminController';
import {
  createKitchenStockEntry,
  deleteKitchenIngredient,
  deleteKitchenRecipe,
  deleteKitchenUnit,
  getKitchenInventoryBootstrap,
  upsertKitchenIngredient,
  upsertKitchenRecipe,
  upsertKitchenUnit,
} from '../controllers/kitchenInventoryController';

// Import New RBAC and Cash Payment controllers
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  lockUser,
  unlockUser,
  deleteUser,
  getUserRoles,
  updateUserRoles,
  setupUserTwoFactor,
  disableUserTwoFactor,
} from '../controllers/userController';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/roleController';
import {
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
} from '../controllers/permissionController';
import {
  getMenus,
} from '../controllers/menuController';
import {
  getPaymentMethods,
  getPaymentRequests,
  createPaymentRequest,
  approvePaymentRequest,
  deletePaymentRequest,
  getPaymentVouchers,
  createPaymentVoucher,
  postPaymentVoucher,
  deletePaymentVoucher,
  getPaymentDashboard,
  getExpenseCategories,
  getCashAccounts,
  getSuppliers,
  getSupplierDueAlerts,
  getSupplierDebts,
  getSupplierDebtSummary,
  createSupplier,
  createSupplierDebt,
  updateSupplier,
  updateSupplierDebt,
  deleteSupplier,
  deleteSupplierDebt,
} from '../controllers/paymentController';
import {
  createAttendance,
  createKpiLevel,
  createKpiRecord,
  createPayrollEmployee,
  createRewardPenalty,
  createRewardPenaltyCategory,
  createWorkShift,
  deleteAttendance,
  deleteKpiLevel,
  deleteKpiRecord,
  deletePayrollEmployee,
  deletePayrollRun,
  deleteRewardPenalty,
  deleteRewardPenaltyCategory,
  deleteWorkShift,
  generatePayrollRun,
  getAttendances,
  getKpiLevels,
  getKpiRecords,
  getPayrollBootstrap,
  getPayrollEmployees,
  getPayrollRuns,
  getRewardPenalties,
  getRewardPenaltyCategories,
  getWorkShifts,
  updateAttendance,
  updateKpiLevel,
  updateKpiRecord,
  updatePayrollEmployee,
  updateRewardPenalty,
  updateRewardPenaltyCategory,
  updateWorkShift,
} from '../controllers/payrollController';
import { getAuditLogs } from '../controllers/auditController';

const router = Router();

// Apply JWT Authentication globally on admin router
router.use(authenticateJWT);

// Dashboard
router.get('/dashboard', requireRevenueOtp, getDashboard);

// POS
router.get('/pos/bootstrap', getPosBootstrap);
router.post('/pos/tables', upsertPosTable);
router.put('/pos/tables/layout', updatePosTableLayout);
router.put('/pos/tables/:id', upsertPosTable);
router.post('/pos/menu-categories', upsertPosMenuCategory);
router.put('/pos/menu-categories/:id', upsertPosMenuCategory);
router.post('/pos/menu-items', upsertPosMenuItem);
router.put('/pos/menu-items/:id', upsertPosMenuItem);
router.post('/pos/orders/open', openPosOrder);
router.get('/pos/orders/history', requireRevenueOtp, getPosHistory);
router.get('/pos/orders/:id', getPosOrderDetail);
router.put('/pos/orders/:id', updatePosOrder);
router.post('/pos/orders/:id/items', addPosOrderItem);
router.put('/pos/orders/:id/items/:itemId', updatePosOrderItem);
router.delete('/pos/orders/:id/items/:itemId', deletePosOrderItem);
router.post('/pos/orders/:id/confirm-kitchen', confirmKitchen);
router.post('/pos/orders/:id/pay', payPosOrder);
router.get('/pos/dashboard', requireRevenueOtp, getPosDashboard);
router.put('/pos/payment-setting', updatePosPaymentSetting);
router.put('/pos/print-templates/:code', updatePrintTemplate);

// Kitchen inventory
router.get('/kitchen-inventory/bootstrap', requirePermission('KITCHEN_INVENTORY', 'VIEW'), getKitchenInventoryBootstrap);
router.post('/kitchen-inventory/units', requirePermission('KITCHEN_INVENTORY', 'CREATE'), upsertKitchenUnit);
router.put('/kitchen-inventory/units/:id', requirePermission('KITCHEN_INVENTORY', 'EDIT'), upsertKitchenUnit);
router.delete('/kitchen-inventory/units/:id', requirePermission('KITCHEN_INVENTORY', 'DELETE'), deleteKitchenUnit);
router.post('/kitchen-inventory/ingredients', requirePermission('KITCHEN_INVENTORY', 'CREATE'), upsertKitchenIngredient);
router.put('/kitchen-inventory/ingredients/:id', requirePermission('KITCHEN_INVENTORY', 'EDIT'), upsertKitchenIngredient);
router.delete('/kitchen-inventory/ingredients/:id', requirePermission('KITCHEN_INVENTORY', 'DELETE'), deleteKitchenIngredient);
router.post('/kitchen-inventory/stock-entries', requirePermission('KITCHEN_INVENTORY', 'CREATE'), createKitchenStockEntry);
router.post('/kitchen-inventory/recipes', requirePermission('KITCHEN_INVENTORY', 'CREATE'), upsertKitchenRecipe);
router.put('/kitchen-inventory/recipes/:id', requirePermission('KITCHEN_INVENTORY', 'EDIT'), upsertKitchenRecipe);
router.delete('/kitchen-inventory/recipes/:id', requirePermission('KITCHEN_INVENTORY', 'DELETE'), deleteKitchenRecipe);

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

// --- USER MANAGEMENT ENDPOINTS ---
router.get('/users', requirePermission('USER_MANAGEMENT', 'VIEW'), getUsers);
router.get('/users/:id', requirePermission('USER_MANAGEMENT', 'VIEW'), getUserById);
router.post('/users', requirePermission('USER_MANAGEMENT', 'CREATE'), createUser);
router.put('/users/:id', requirePermission('USER_MANAGEMENT', 'EDIT'), updateUser);
router.patch('/users/:id/lock', requirePermission('USER_MANAGEMENT', 'EDIT'), lockUser);
router.patch('/users/:id/unlock', requirePermission('USER_MANAGEMENT', 'EDIT'), unlockUser);
router.delete('/users/:id', requirePermission('USER_MANAGEMENT', 'DELETE'), deleteUser);
router.post('/users/:id/2fa/setup', requirePermission('USER_MANAGEMENT', 'EDIT'), setupUserTwoFactor);
router.delete('/users/:id/2fa', requirePermission('USER_MANAGEMENT', 'EDIT'), disableUserTwoFactor);
router.get('/users/:userId/roles', requirePermission('USER_MANAGEMENT', 'VIEW'), getUserRoles);
router.put('/users/:userId/roles', requirePermission('USER_MANAGEMENT', 'EDIT'), updateUserRoles);

// --- ROLE MANAGEMENT ENDPOINTS ---
router.get('/roles', requirePermission('ROLE_MANAGEMENT', 'VIEW'), getRoles);
router.get('/roles/:id', requirePermission('ROLE_MANAGEMENT', 'VIEW'), getRoleById);
router.post('/roles', requirePermission('ROLE_MANAGEMENT', 'CREATE'), createRole);
router.put('/roles/:id', requirePermission('ROLE_MANAGEMENT', 'EDIT'), updateRole);
router.delete('/roles/:id', requirePermission('ROLE_MANAGEMENT', 'DELETE'), deleteRole);

// --- PERMISSION MATRIX ENDPOINTS ---
router.get('/permissions', requirePermission('PERMISSION_MANAGEMENT', 'VIEW'), getPermissions);
router.get('/menus', requirePermission('PERMISSION_MANAGEMENT', 'VIEW'), getMenus);
router.get('/roles/:roleId/permissions', requirePermission('PERMISSION_MANAGEMENT', 'VIEW'), getRolePermissions);
router.put('/roles/:roleId/permissions', requirePermission('PERMISSION_MANAGEMENT', 'EDIT'), updateRolePermissions);

// --- CASH PAYMENT MANAGEMENT WORKFLOW ---
// Expense Categories, Payment Methods, Cash Accounts
router.get('/payments/categories', getExpenseCategories); // selection helper, open for authenticated users
router.get('/payments/methods', getPaymentMethods); // selection helper, open
router.get('/payments/cash-accounts', getCashAccounts); // selection helper for payment vouchers

// Suppliers
router.get('/suppliers', requirePermission('SUPPLIER_CATEGORY', 'VIEW'), getSuppliers);
router.get('/suppliers/due-alerts', requirePermission('SUPPLIER_CATEGORY', 'VIEW'), getSupplierDueAlerts);
router.post('/suppliers', requirePermission('SUPPLIER_CATEGORY', 'CREATE'), createSupplier);
router.put('/suppliers/:id', requirePermission('SUPPLIER_CATEGORY', 'EDIT'), updateSupplier);
router.delete('/suppliers/:id', requirePermission('SUPPLIER_CATEGORY', 'DELETE'), deleteSupplier);
router.get('/supplier-debts', requirePermission('SUPPLIER_DEBT', 'VIEW'), getSupplierDebts);
router.get('/supplier-debts/summary', requirePermission('SUPPLIER_DEBT', 'VIEW'), getSupplierDebtSummary);
router.post('/supplier-debts', requirePermission('SUPPLIER_DEBT', 'CREATE'), createSupplierDebt);
router.put('/supplier-debts/:id', requirePermission('SUPPLIER_DEBT', 'EDIT'), updateSupplierDebt);
router.delete('/supplier-debts/:id', requirePermission('SUPPLIER_DEBT', 'DELETE'), deleteSupplierDebt);

// Payment Requests
router.get('/payments/requests', requirePermission('PAYMENT_REQUEST', 'VIEW'), getPaymentRequests);
router.post('/payments/requests', requirePermission('PAYMENT_REQUEST', 'CREATE'), createPaymentRequest);
router.patch('/payments/requests/:id/approve', requirePermission('PAYMENT_REQUEST_APPROVAL', 'APPROVE'), approvePaymentRequest);
router.delete('/payments/requests/:id', requirePermission('PAYMENT_REQUEST', 'DELETE'), deletePaymentRequest);

// Payment Vouchers
router.get('/payments/vouchers', requirePermission('PAYMENT_VOUCHER', 'VIEW'), getPaymentVouchers);
router.post('/payments/vouchers', requirePermission('PAYMENT_VOUCHER', 'CREATE'), createPaymentVoucher);
router.post('/payments/vouchers/:id/post', requirePermission('PAYMENT_VOUCHER', 'POST_ACCOUNTING'), postPaymentVoucher);
router.delete('/payments/vouchers/:id', requirePermission('PAYMENT_VOUCHER', 'DELETE'), deletePaymentVoucher);

// Dashboard
router.get('/payments/dashboard', requirePermission('CASH_BOOK', 'VIEW'), getPaymentDashboard);

// Payroll / Attendance
router.get('/payroll/bootstrap', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getPayrollBootstrap);
router.get('/payroll/shifts', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getWorkShifts);
router.post('/payroll/shifts', requirePermission('PAYROLL', 'CREATE'), createWorkShift);
router.put('/payroll/shifts/:id', requirePermission('PAYROLL', 'EDIT'), updateWorkShift);
router.delete('/payroll/shifts/:id', requirePermission('PAYROLL', 'DELETE'), deleteWorkShift);
router.get('/payroll/employees', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getPayrollEmployees);
router.post('/payroll/employees', requirePermission('PAYROLL', 'CREATE'), createPayrollEmployee);
router.put('/payroll/employees/:id', requirePermission('PAYROLL', 'EDIT'), updatePayrollEmployee);
router.delete('/payroll/employees/:id', requirePermission('PAYROLL', 'DELETE'), deletePayrollEmployee);
router.get('/payroll/attendance', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getAttendances);
router.post('/payroll/attendance', requirePermission('PAYROLL', 'CREATE'), createAttendance);
router.put('/payroll/attendance/:id', requirePermission('PAYROLL', 'EDIT'), updateAttendance);
router.delete('/payroll/attendance/:id', requirePermission('PAYROLL', 'DELETE'), deleteAttendance);
router.get('/payroll/runs', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getPayrollRuns);
router.post('/payroll/runs/generate', requirePermission('PAYROLL', 'CREATE'), requirePayrollOtp, generatePayrollRun);
router.delete('/payroll/runs/:id', requirePermission('PAYROLL', 'DELETE'), deletePayrollRun);
router.get('/payroll/kpi-levels', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getKpiLevels);
router.post('/payroll/kpi-levels', requirePermission('PAYROLL', 'CREATE'), createKpiLevel);
router.put('/payroll/kpi-levels/:id', requirePermission('PAYROLL', 'EDIT'), updateKpiLevel);
router.delete('/payroll/kpi-levels/:id', requirePermission('PAYROLL', 'DELETE'), deleteKpiLevel);
router.get('/payroll/kpi-records', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getKpiRecords);
router.post('/payroll/kpi-records', requirePermission('PAYROLL', 'CREATE'), createKpiRecord);
router.put('/payroll/kpi-records/:id', requirePermission('PAYROLL', 'EDIT'), updateKpiRecord);
router.delete('/payroll/kpi-records/:id', requirePermission('PAYROLL', 'DELETE'), deleteKpiRecord);
router.get('/payroll/adjustment-categories', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getRewardPenaltyCategories);
router.post('/payroll/adjustment-categories', requirePermission('PAYROLL', 'CREATE'), createRewardPenaltyCategory);
router.put('/payroll/adjustment-categories/:id', requirePermission('PAYROLL', 'EDIT'), updateRewardPenaltyCategory);
router.delete('/payroll/adjustment-categories/:id', requirePermission('PAYROLL', 'DELETE'), deleteRewardPenaltyCategory);
router.get('/payroll/adjustments', requirePermission('PAYROLL', 'VIEW'), requirePayrollOtp, getRewardPenalties);
router.post('/payroll/adjustments', requirePermission('PAYROLL', 'CREATE'), createRewardPenalty);
router.put('/payroll/adjustments/:id', requirePermission('PAYROLL', 'EDIT'), updateRewardPenalty);
router.delete('/payroll/adjustments/:id', requirePermission('PAYROLL', 'DELETE'), deleteRewardPenalty);

// System logs
router.get('/audit-logs', requirePermission('AUDIT_LOG', 'VIEW'), getAuditLogs);

export default router;

