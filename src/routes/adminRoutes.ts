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
  getPosPrintContext,
  getPosRunnerOrders,
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
  saveKitchenRecipeSet,
  upsertKitchenIngredient,
  upsertKitchenRecipe,
  upsertKitchenUnit,
} from '../controllers/kitchenInventoryController';
import {
  assignUserBranches,
  createBranch,
  getBranch,
  getBranches,
  updateBranch,
} from '../controllers/branchController';
import {
  addCustomerPointTransaction,
  createCustomer,
  getCustomer,
  getCustomerBootstrap,
  getCustomers,
  updateCustomer,
  upsertVoucher,
  validateVoucher,
} from '../controllers/customerController';
import { getImageKitAuth } from '../controllers/imageKitController';
import {
  getFaceRegistrationBootstrap,
  recognizeFaceAttendance,
  registerEmployeeFace,
} from '../controllers/faceAttendanceController';

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
  paySupplierDebt,
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
router.get('/dashboard', requirePermission('DASHBOARD', 'VIEW'), requireRevenueOtp, getDashboard);

// Shared ImageKit upload auth for face attendance photos
router.get('/imagekit/auth', requirePermission('FACE_ATTENDANCE', 'CREATE'), getImageKitAuth);

// Branch / chain management
router.get('/branches', requirePermission('BRANCH_MANAGEMENT', 'VIEW'), getBranches);
router.get('/branches/:id', requirePermission('BRANCH_MANAGEMENT', 'VIEW'), getBranch);
router.post('/branches', requirePermission('BRANCH_MANAGEMENT', 'CREATE'), createBranch);
router.put('/branches/:id', requirePermission('BRANCH_MANAGEMENT', 'EDIT'), updateBranch);
router.put('/users/:userId/branches', requirePermission('BRANCH_MANAGEMENT', 'EDIT'), assignUserBranches);

// Customers / loyalty
router.get('/customers/bootstrap', requirePermission('CUSTOMER_MANAGEMENT', 'VIEW'), getCustomerBootstrap);
router.get('/customers', requirePermission('CUSTOMER_MANAGEMENT', 'VIEW'), getCustomers);
router.post('/customers', requirePermission('CUSTOMER_MANAGEMENT', 'CREATE'), createCustomer);
router.post('/customers/points', requirePermission('CUSTOMER_MANAGEMENT', 'EDIT'), addCustomerPointTransaction);
router.post('/customers/vouchers/validate', requirePermission('CUSTOMER_MANAGEMENT', 'VIEW'), validateVoucher);
router.post('/customers/vouchers', requirePermission('CUSTOMER_MANAGEMENT', 'CREATE'), upsertVoucher);
router.put('/customers/vouchers/:id', requirePermission('CUSTOMER_MANAGEMENT', 'EDIT'), upsertVoucher);
router.get('/customers/:id', requirePermission('CUSTOMER_MANAGEMENT', 'VIEW'), getCustomer);
router.put('/customers/:id', requirePermission('CUSTOMER_MANAGEMENT', 'EDIT'), updateCustomer);

// Face registration / face attendance
router.get('/face-registration/bootstrap', requirePermission('FACE_ATTENDANCE', 'VIEW'), requirePayrollOtp, getFaceRegistrationBootstrap);
router.post('/face-registration', requirePermission('FACE_ATTENDANCE', 'EDIT'), registerEmployeeFace);
router.post('/face-attendance/recognize', requirePermission('FACE_ATTENDANCE', 'CREATE'), recognizeFaceAttendance);

// POS
router.get('/pos/bootstrap', requirePermission('ORDER_POS', 'VIEW'), getPosBootstrap);
router.get('/pos/runner', requirePermission('POS_RUNNER', 'VIEW'), getPosRunnerOrders);
router.post('/pos/tables', requirePermission('ORDER_POS', 'EDIT'), upsertPosTable);
router.put('/pos/tables/layout', requirePermission('ORDER_POS', 'EDIT'), updatePosTableLayout);
router.put('/pos/tables/:id', requirePermission('ORDER_POS', 'EDIT'), upsertPosTable);
router.post('/pos/menu-categories', requirePermission('ORDER_POS', 'EDIT'), upsertPosMenuCategory);
router.put('/pos/menu-categories/:id', requirePermission('ORDER_POS', 'EDIT'), upsertPosMenuCategory);
router.post('/pos/menu-items', requirePermission('ORDER_POS', 'EDIT'), upsertPosMenuItem);
router.put('/pos/menu-items/:id', requirePermission('ORDER_POS', 'EDIT'), upsertPosMenuItem);
router.post('/pos/orders/open', requirePermission('ORDER_POS', 'CREATE'), openPosOrder);
router.get('/pos/orders/history', requirePermission('ORDER_POS', 'VIEW'), requireRevenueOtp, getPosHistory);
router.get('/pos/orders/:id/print-context', requirePermission('ORDER_POS', 'VIEW'), getPosPrintContext);
router.get('/pos/orders/:id', requirePermission('ORDER_POS', 'VIEW'), getPosOrderDetail);
router.put('/pos/orders/:id', requirePermission('ORDER_POS', 'EDIT'), updatePosOrder);
router.post('/pos/orders/:id/items', requirePermission('ORDER_POS', 'CREATE'), addPosOrderItem);
router.put('/pos/orders/:id/items/:itemId', requirePermission('ORDER_POS', 'EDIT'), updatePosOrderItem);
router.delete('/pos/orders/:id/items/:itemId', requirePermission('ORDER_POS', 'DELETE'), deletePosOrderItem);
router.post('/pos/orders/:id/confirm-kitchen', requirePermission('ORDER_POS', 'PRINT'), confirmKitchen);
router.post('/pos/orders/:id/pay', requirePermission('ORDER_POS', 'PAY'), payPosOrder);
router.get('/pos/dashboard', requirePermission('ORDER_POS', 'VIEW'), requireRevenueOtp, getPosDashboard);
router.put('/pos/payment-setting', requirePermission('ORDER_POS', 'EDIT'), updatePosPaymentSetting);
router.put('/pos/print-templates/:code', requirePermission('ORDER_POS', 'EDIT'), updatePrintTemplate);

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
router.put('/kitchen-inventory/recipes/by-menu/:menuItemId', requirePermission('KITCHEN_INVENTORY', 'EDIT'), saveKitchenRecipeSet);
router.put('/kitchen-inventory/recipes/:id', requirePermission('KITCHEN_INVENTORY', 'EDIT'), upsertKitchenRecipe);
router.delete('/kitchen-inventory/recipes/:id', requirePermission('KITCHEN_INVENTORY', 'DELETE'), deleteKitchenRecipe);

// Site Settings (There's only 1 settings record, so GET & PUT are enough)
router.get('/site-settings', requirePermission('SYSTEM_CONFIG', 'VIEW'), getSiteSettings);
router.put('/site-settings', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateSiteSettings);
router.post('/site-settings', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateSiteSettings); // For compatibility with generic CRUD route paths
router.delete('/site-settings', (req, res) => res.status(400).json({ message: 'Không thể xóa cấu hình hệ thống.' }));

// Navigation Items
router.get('/navigation-items', requirePermission('SYSTEM_CONFIG', 'VIEW'), getNavItems);
router.post('/navigation-items', requirePermission('SYSTEM_CONFIG', 'CREATE'), createNavItem);
router.put('/navigation-items/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateNavItem);
router.delete('/navigation-items/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deleteNavItem);

// Banners
router.get('/banners', requirePermission('SYSTEM_CONFIG', 'VIEW'), getBanners);
router.post('/banners', requirePermission('SYSTEM_CONFIG', 'CREATE'), createBanner);
router.put('/banners/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateBanner);
router.delete('/banners/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deleteBanner);

// Home Sections
router.get('/home-sections', requirePermission('SYSTEM_CONFIG', 'VIEW'), getHomeSections);
router.post('/home-sections', requirePermission('SYSTEM_CONFIG', 'CREATE'), createHomeSection);
router.put('/home-sections/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateHomeSection);
router.delete('/home-sections/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deleteHomeSection);

// Menu Categories
router.get('/menu-categories', requirePermission('DISH_CATEGORY', 'VIEW'), getCategories);
router.post('/menu-categories', requirePermission('DISH_CATEGORY', 'CREATE'), createCategory);
router.put('/menu-categories/:id', requirePermission('DISH_CATEGORY', 'EDIT'), updateCategory);
router.delete('/menu-categories/:id', requirePermission('DISH_CATEGORY', 'DELETE'), deleteCategory);

// Menu Items
router.get('/menu-items', requirePermission('MENU_MANAGEMENT', 'VIEW'), getMenuItems);
router.post('/menu-items', requirePermission('MENU_MANAGEMENT', 'CREATE'), createMenuItem);
router.put('/menu-items/:id', requirePermission('MENU_MANAGEMENT', 'EDIT'), updateMenuItem);
router.delete('/menu-items/:id', requirePermission('MENU_MANAGEMENT', 'DELETE'), deleteMenuItem);

// Promotions
router.get('/promotions', requirePermission('SYSTEM_CONFIG', 'VIEW'), getPromotions);
router.post('/promotions', requirePermission('SYSTEM_CONFIG', 'CREATE'), createPromotion);
router.put('/promotions/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updatePromotion);
router.delete('/promotions/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deletePromotion);

// Gallery Images
router.get('/gallery-images', requirePermission('SYSTEM_CONFIG', 'VIEW'), getGalleryImages);
router.post('/gallery-images', requirePermission('SYSTEM_CONFIG', 'CREATE'), createGalleryImage);
router.put('/gallery-images/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateGalleryImage);
router.delete('/gallery-images/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deleteGalleryImage);

// Testimonials
router.get('/testimonials', requirePermission('SYSTEM_CONFIG', 'VIEW'), getTestimonials);
router.post('/testimonials', requirePermission('SYSTEM_CONFIG', 'CREATE'), createTestimonial);
router.put('/testimonials/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateTestimonial);
router.delete('/testimonials/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deleteTestimonial);

// Contact Messages
router.get('/contact-messages', requirePermission('SYSTEM_CONFIG', 'VIEW'), getContacts);
router.put('/contact-messages/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateContactStatus);
router.delete('/contact-messages/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deleteContact);

// Media Manager
router.get('/media', requirePermission('SYSTEM_CONFIG', 'VIEW'), getMediaFiles);
router.post('/media', requirePermission('SYSTEM_CONFIG', 'CREATE'), upload.single('image'), uploadMedia);
router.put('/media/:id', requirePermission('SYSTEM_CONFIG', 'EDIT'), updateMedia);
router.delete('/media/:id', requirePermission('SYSTEM_CONFIG', 'DELETE'), deleteMedia);

// Standalone Upload Endpoint
router.post('/upload/image', requirePermission('SYSTEM_CONFIG', 'CREATE'), upload.single('image'), uploadMedia);

// Blog / News
router.get('/blog/slug-preview', requirePermission('BLOG_POST', 'VIEW'), previewBlogSlug);
router.get('/blog/categories', requirePermission('BLOG_CATEGORY', 'VIEW'), getBlogCategories);
router.post('/blog/categories', requirePermission('BLOG_CATEGORY', 'CREATE'), createBlogCategory);
router.put('/blog/categories/:id', requirePermission('BLOG_CATEGORY', 'EDIT'), updateBlogCategory);
router.delete('/blog/categories/:id', requirePermission('BLOG_CATEGORY', 'DELETE'), deleteBlogCategory);

router.get('/blog/posts', requirePermission('BLOG_POST', 'VIEW'), getBlogPosts);
router.get('/blog/posts/:id', requirePermission('BLOG_POST', 'VIEW'), getBlogPost);
router.post('/blog/posts', requirePermission('BLOG_POST', 'CREATE'), createBlogPost);
router.put('/blog/posts/:id', requirePermission('BLOG_POST', 'EDIT'), updateBlogPost);
router.delete('/blog/posts/:id', requirePermission('BLOG_POST', 'DELETE'), deleteBlogPost);
router.post('/blog/posts/:id/publish', requirePermission('BLOG_POST', 'EDIT'), publishBlogPost);
router.post('/blog/posts/:id/unpublish', requirePermission('BLOG_POST', 'EDIT'), unpublishBlogPost);

// SEO Manager
// Seo Pages
router.get('/seo-pages', requirePermission('SEO_PAGE', 'VIEW'), getSeoPages);
router.get('/seo-pages/:id', requirePermission('SEO_PAGE', 'VIEW'), getSeoPage);
router.post('/seo-pages', requirePermission('SEO_PAGE', 'CREATE'), createSeoPage);
router.put('/seo-pages/:id', requirePermission('SEO_PAGE', 'EDIT'), updateSeoPage);
router.delete('/seo-pages/:id', requirePermission('SEO_PAGE', 'DELETE'), deleteSeoPage);

// FAQs
router.get('/faqs', requirePermission('FAQ_MANAGEMENT', 'VIEW'), getFAQs);
router.post('/faqs', requirePermission('FAQ_MANAGEMENT', 'CREATE'), createFAQ);
router.put('/faqs/:id', requirePermission('FAQ_MANAGEMENT', 'EDIT'), updateFAQ);
router.delete('/faqs/:id', requirePermission('FAQ_MANAGEMENT', 'DELETE'), deleteFAQ);

// Reviews
router.get('/reviews', requirePermission('REVIEW_MANAGEMENT', 'VIEW'), getReviews);
router.post('/reviews', requirePermission('REVIEW_MANAGEMENT', 'CREATE'), createReview);
router.put('/reviews/:id', requirePermission('REVIEW_MANAGEMENT', 'EDIT'), updateReview);
router.delete('/reviews/:id', requirePermission('REVIEW_MANAGEMENT', 'DELETE'), deleteReview);

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
router.post('/supplier-debts/pay', requirePermission('SUPPLIER_DEBT', 'EDIT'), paySupplierDebt);
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

