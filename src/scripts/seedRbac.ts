import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

const permissions = [
  { code: 'VIEW', name: 'Xem', description: 'Quyền xem danh sách, chi tiết' },
  { code: 'CREATE', name: 'Thêm mới', description: 'Quyền thêm dữ liệu mới' },
  { code: 'EDIT', name: 'Sửa', description: 'Quyền chỉnh sửa dữ liệu' },
  { code: 'DELETE', name: 'Xóa', description: 'Quyền xóa dữ liệu' },
  { code: 'APPROVE', name: 'Duyệt', description: 'Quyền duyệt đề nghị, phiếu' },
  { code: 'EXPORT', name: 'Xuất Excel', description: 'Quyền xuất báo cáo Excel/PDF' },
  { code: 'PRINT', name: 'In', description: 'Quyền in ấn chứng từ/hóa đơn' },
  { code: 'IMPORT', name: 'Nhập Excel', description: 'Quyền nhập dữ liệu từ Excel' },
  { code: 'CANCEL', name: 'Hủy', description: 'Quyền hủy giao dịch, chứng từ' },
  { code: 'PAY', name: 'Giải ngân', description: 'Quyền thực hiện chi tiền mặt/bank' },
  { code: 'POST_ACCOUNTING', name: 'Ghi sổ/Hạch toán', description: 'Quyền ghi sổ kế toán quỹ' },
];

const menus = [
  { code: 'DASHBOARD', name: 'Tổng quan', path: '/admin/dashboard', icon: 'LayoutDashboard', sortOrder: 1 },
  { code: 'INVESTMENT', name: 'Quản lý vốn đầu tư', path: '/admin/investments', icon: 'Coins', sortOrder: 2 },
  { code: 'PURCHASE_REQUEST', name: 'Đề nghị mua hàng', path: '/admin/purchase-requests', icon: 'FilePlus', sortOrder: 3 },
  { code: 'PURCHASE_REQUEST_APPROVAL', name: 'Duyệt đề nghị mua hàng', path: '/admin/purchase-requests/approval', icon: 'CheckSquare', sortOrder: 4 },
  { code: 'PURCHASE_ORDER', name: 'Đơn mua hàng', path: '/admin/purchase-orders', icon: 'ShoppingBag', sortOrder: 5 },
  { code: 'INVENTORY_IMPORT', name: 'Nhập kho', path: '/admin/inventory/imports', icon: 'ArrowDownLeft', sortOrder: 6 },
  { code: 'INVENTORY_EXPORT', name: 'Xuất kho', path: '/admin/inventory/exports', icon: 'ArrowUpRight', sortOrder: 7 },
  { code: 'INVENTORY_STOCK', name: 'Tồn kho', path: '/admin/inventory/stock', icon: 'Package', sortOrder: 8 },
  { code: 'MATERIAL_CATEGORY', name: 'Danh mục vật tư', path: '/admin/materials', icon: 'Layers', sortOrder: 9 },
  { code: 'SUPPLIER_CATEGORY', name: 'Danh mục nhà cung cấp', path: '/admin/suppliers', icon: 'Truck', sortOrder: 10 },
  { code: 'SUPPLIER_DEBT', name: 'Công nợ nhà cung cấp', path: '/admin/suppliers/debt', icon: 'Receipt', sortOrder: 11 },
  { code: 'PAYMENT_REQUEST', name: 'Đề nghị chi', path: '/admin/payments/requests', icon: 'FileText', sortOrder: 12 },
  { code: 'PAYMENT_REQUEST_APPROVAL', name: 'Duyệt đề nghị chi', path: '/admin/payments/approvals', icon: 'UserCheck', sortOrder: 13 },
  { code: 'PAYMENT_VOUCHER', name: 'Phiếu chi', path: '/admin/payments/vouchers', icon: 'CreditCard', sortOrder: 14 },
  { code: 'DISBURSEMENT', name: 'Giải ngân', path: '/admin/payments/disbursements', icon: 'DollarSign', sortOrder: 15 },
  { code: 'CASH_BOOK', name: 'Sổ quỹ tiền mặt', path: '/admin/payments/dashboard', icon: 'BookOpen', sortOrder: 16 },
  { code: 'BANK_ACCOUNT', name: 'Tài khoản ngân hàng', path: '/admin/cash/accounts', icon: 'Home', sortOrder: 17 },
  { code: 'CASH_REPORT', name: 'Báo cáo thu chi', path: '/admin/reports/cash', icon: 'BarChart2', sortOrder: 18 },
  { code: 'PROFIT_REPORT', name: 'Báo cáo lợi nhuận', path: '/admin/reports/profit', icon: 'TrendingUp', sortOrder: 19 },
  { code: 'MENU_MANAGEMENT', name: 'Món ăn & Thực đơn', path: '/admin/menu-items', icon: 'Utensils', sortOrder: 20 },
  { code: 'DISH_CATEGORY', name: 'Danh mục món ăn', path: '/admin/menu-categories', icon: 'Folder', sortOrder: 21 },
  { code: 'COMBO_SET', name: 'Combo/set ăn', path: '/admin/combos', icon: 'Grid', sortOrder: 22 },
  { code: 'DISH_PRICE', name: 'Giá bán món', path: '/admin/menu-items/prices', icon: 'Tag', sortOrder: 23 },
  { code: 'TABLE_MANAGEMENT', name: 'Bàn & Phòng', path: '/admin/tables', icon: 'Grid3X3', sortOrder: 24 },
  { code: 'ORDER_POS', name: 'POS bán hàng', path: '/admin/pos', icon: 'Monitor', sortOrder: 25 },
  { code: 'POS_RUNNER', name: 'Chạy bàn', path: '/admin/pos/runner', icon: 'Utensils', sortOrder: 26 },
  { code: 'KITCHEN_INVENTORY', name: 'Kho bếp & định lượng', path: '/admin/kitchen-inventory', icon: 'Package', sortOrder: 27 },
  { code: 'STAFF_MANAGEMENT', name: 'Quản lý nhân viên', path: '/admin/staff', icon: 'Users2', sortOrder: 28 },
  { code: 'CUSTOMER_MANAGEMENT', name: 'Quản lý khách hàng', path: '/admin/customers', icon: 'Heart', sortOrder: 29 },
  { code: 'PAYROLL', name: 'Chấm công & bảng lương', path: '/admin/payroll', icon: 'CalendarClock', sortOrder: 30 },
  { code: 'SYSTEM_CONFIG', name: 'Cấu hình hệ thống', path: '/admin/site-settings', icon: 'Sliders', sortOrder: 31 },
  { code: 'USER_MANAGEMENT', name: 'Quản lý user', path: '/admin/users', icon: 'UserCog', sortOrder: 32 },
  { code: 'ROLE_MANAGEMENT', name: 'Quản lý vai trò', path: '/admin/roles', icon: 'Shield', sortOrder: 33 },
  { code: 'PERMISSION_MANAGEMENT', name: 'Quản lý quyền', path: '/admin/permissions', icon: 'Key', sortOrder: 34 },
  { code: 'AUDIT_LOG', name: 'Nhật ký hệ thống', path: '/admin/audit-logs', icon: 'History', sortOrder: 35 },
  { code: 'BLOG_CATEGORY', name: 'Danh mục tin', path: '/admin/blog/categories', icon: 'Newspaper', sortOrder: 36 },
  { code: 'BLOG_POST', name: 'Bài viết', path: '/admin/blog/posts', icon: 'Newspaper', sortOrder: 37 },
  { code: 'SEO_PAGE', name: 'SEO Landing Pages', path: '/admin/seo-pages', icon: 'Globe', sortOrder: 38 },
  { code: 'FAQ_MANAGEMENT', name: 'FAQs', path: '/admin/faqs', icon: 'Sparkles', sortOrder: 39 },
  { code: 'REVIEW_MANAGEMENT', name: 'Reviews', path: '/admin/reviews', icon: 'MessageSquare', sortOrder: 40 },
  { code: 'BRANCH_MANAGEMENT', name: 'Quản lý chi nhánh', path: '/admin/system/branches', icon: 'Store', sortOrder: 41 },
  { code: 'FACE_REGISTRATION', name: 'Đăng ký khuôn mặt', path: '/admin/face-registration', icon: 'ScanFace', sortOrder: 42 },
  { code: 'FACE_ATTENDANCE', name: 'Chấm công khuôn mặt', path: '/admin/face-attendance', icon: 'ScanFace', sortOrder: 43 },
  { code: 'FACE_RECOGNITION_CONFIG', name: 'Cấu hình Face AI', path: '/admin/face-recognition', icon: 'BrainCircuit', sortOrder: 44 },
  { code: 'CAO_RESTAURANT_DATA', name: 'Dữ liệu nhà hàng CAO', path: '/admin/cao-restaurant', icon: 'Database', sortOrder: 45 },
  { code: 'WEBSITE_BUILDER', name: 'Website Builder', path: '/admin/website-builder', icon: 'PanelTop', sortOrder: 46 },
];

const defaultGrants: Record<string, Record<string, string[]>> = {
  KITCHEN: {
    DASHBOARD: ['VIEW'],
    ORDER_POS: ['VIEW'],
    POS_RUNNER: ['VIEW'],
    KITCHEN_INVENTORY: ['VIEW', 'CREATE'],
    FACE_REGISTRATION: ['VIEW', 'CREATE'],
    FACE_ATTENDANCE: ['VIEW', 'CREATE'],
  },
  STAFF: {
    DASHBOARD: ['VIEW'],
    POS_RUNNER: ['VIEW'],
    FACE_REGISTRATION: ['VIEW', 'CREATE'],
    FACE_ATTENDANCE: ['VIEW', 'CREATE'],
    PAYMENT_REQUEST: ['VIEW', 'CREATE'],
    SUPPLIER_CATEGORY: ['VIEW'],
  },
  CASHIER: {
    DASHBOARD: ['VIEW'],
    ORDER_POS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PRINT', 'PAY', 'CANCEL'],
    POS_RUNNER: ['VIEW'],
    KITCHEN_INVENTORY: ['VIEW', 'CREATE'],
    CUSTOMER_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT'],
    FACE_REGISTRATION: ['VIEW', 'CREATE'],
    FACE_ATTENDANCE: ['VIEW', 'CREATE'],
    PAYMENT_REQUEST: ['VIEW', 'CREATE'],
    SUPPLIER_CATEGORY: ['VIEW'],
  },
  MANAGER: {
    DASHBOARD: ['VIEW'],
    ORDER_POS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PRINT', 'PAY', 'CANCEL'],
    POS_RUNNER: ['VIEW'],
    TABLE_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    KITCHEN_INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    MENU_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    DISH_CATEGORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    CUSTOMER_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    PAYMENT_REQUEST: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    PAYMENT_REQUEST_APPROVAL: ['VIEW', 'APPROVE'],
    PAYMENT_VOUCHER: ['VIEW', 'CREATE', 'PRINT'],
    CASH_BOOK: ['VIEW'],
    BANK_ACCOUNT: ['VIEW'],
    CASH_REPORT: ['VIEW'],
    PROFIT_REPORT: ['VIEW'],
    SUPPLIER_CATEGORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    SUPPLIER_DEBT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    PAYROLL: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    FACE_REGISTRATION: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    FACE_ATTENDANCE: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    FACE_RECOGNITION_CONFIG: ['VIEW', 'EDIT'],
    CAO_RESTAURANT_DATA: ['VIEW'],
    WEBSITE_BUILDER: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'CANCEL', 'EXPORT'],
    BLOG_CATEGORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    BLOG_POST: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    SEO_PAGE: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    FAQ_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    REVIEW_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
  },
  ACCOUNTANT: {
    DASHBOARD: ['VIEW'],
    PAYMENT_REQUEST: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    PAYMENT_REQUEST_APPROVAL: ['VIEW', 'APPROVE'],
    PAYMENT_VOUCHER: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PAY', 'POST_ACCOUNTING', 'PRINT', 'EXPORT'],
    DISBURSEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PAY', 'POST_ACCOUNTING', 'PRINT', 'EXPORT'],
    CASH_BOOK: ['VIEW'],
    BANK_ACCOUNT: ['VIEW'],
    CASH_REPORT: ['VIEW'],
    PROFIT_REPORT: ['VIEW'],
    SUPPLIER_CATEGORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    SUPPLIER_DEBT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    KITCHEN_INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    PAYROLL: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
  },
  OWNER: {
    DASHBOARD: ['VIEW'],
    ORDER_POS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PRINT', 'PAY', 'CANCEL'],
    POS_RUNNER: ['VIEW'],
    PAYMENT_REQUEST: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    PAYMENT_REQUEST_APPROVAL: ['VIEW', 'APPROVE'],
    PAYMENT_VOUCHER: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PAY', 'POST_ACCOUNTING', 'PRINT', 'EXPORT'],
    CASH_BOOK: ['VIEW'],
    BANK_ACCOUNT: ['VIEW'],
    CASH_REPORT: ['VIEW'],
    PROFIT_REPORT: ['VIEW'],
    USER_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    ROLE_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    PERMISSION_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    AUDIT_LOG: ['VIEW'],
    SYSTEM_CONFIG: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    BRANCH_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    CUSTOMER_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    FACE_REGISTRATION: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    FACE_ATTENDANCE: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    FACE_RECOGNITION_CONFIG: ['VIEW', 'EDIT'],
    CAO_RESTAURANT_DATA: ['VIEW'],
    WEBSITE_BUILDER: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'CANCEL', 'EXPORT'],
    SUPPLIER_CATEGORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    SUPPLIER_DEBT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    KITCHEN_INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    MENU_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    DISH_CATEGORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    PAYROLL: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    BLOG_CATEGORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    BLOG_POST: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    SEO_PAGE: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    FAQ_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    REVIEW_MANAGEMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
  },
};

async function upsertPermissions() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name, description: permission.description },
      create: permission,
    });
  }
}

async function upsertMenus() {
  for (const menu of menus) {
    await prisma.menu.upsert({
      where: { code: menu.code },
      update: { name: menu.name, path: menu.path, icon: menu.icon, sortOrder: menu.sortOrder, isActive: true },
      create: { ...menu, isActive: true },
    });
  }
}

async function grantMissingRolePermissions() {
  for (const [roleCode, grants] of Object.entries(defaultGrants)) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) continue;

    for (const [menuCode, permissionCodes] of Object.entries(grants)) {
      const menu = await prisma.menu.findUnique({ where: { code: menuCode } });
      if (!menu) continue;

      const dbPermissions = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
      for (const permission of dbPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_menuId_permissionId: {
              roleId: role.id,
              menuId: menu.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            menuId: menu.id,
            permissionId: permission.id,
            isAllowed: true,
          },
        });
      }
    }
  }
}

async function main() {
  console.log('Seeding RBAC menus and permissions...');
  await upsertPermissions();
  await upsertMenus();
  await grantMissingRolePermissions();
  console.log('RBAC seed completed without overwriting existing role settings.');
}

main()
  .catch((error) => {
    console.error('RBAC seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
