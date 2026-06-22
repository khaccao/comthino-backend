// fix_diacritics.ts
// Run this script with `npx ts-node ./fix_diacritics.ts` (ensure ts-node is installed)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of unaccented strings to correct diacritic versions
const replacements: Record<string, string> = {
  'Com Thi No khai truong tai KDT Van Quan, Ha Dong': 'Cơm Thị Nở khai trương tại KĐT Văn Quán, Hà Đông',
  'Com Thi No don khach tai Van Quan voi mam com que Bac Bo, khong gian am cung va dich vu dat com doan.': 'Cơm Thị Nở đón khách tại Văn Quán với mâm cơm quê Bắc Bộ, không gian ấm cúng và dịch vụ đặt cơm đoàn.',
  'Goi y bua trua van phong ngon mieng tai Ha Dong': 'Gợi ý bữa trưa văn phòng ngon miệng tại Hà Đông',
  'Cach chon bua trua van phong vua ngon, du chat, giao dung gio cho nhan su khu vuc Ha Dong.': 'Cách chọn bữa trưa văn phòng vừa ngon, đủ chất, giao đúng giờ cho nhân sự khu vực Hà Đông.',
  'Vi sao com que Bac Bo luon duoc yeu thich': 'Vì sao cơm quê Bắc Bộ luôn được yêu thích',
  'Com que Bac Bo hap dan boi vi dam da, gan gui va goi nho nhung bua com gia dinh.': 'Cơm quê Bắc Bộ hấp dẫn bởi vị đậm đà, gân giò và gối nhớ những bữa cơm gia đình.',
  'Thuc don com van phong thay doi moi ngay tai Com Thi No': 'Thực đơn cơm văn phòng thay đổi mới ngày tại Cơm Thị Nở',
  'Thuc don linh hoat moi ngay giup bua trua khong lap lai va phu hop khau vi nhieu nhom khach.': 'Thực đơn linh hoạt mới ngày giúp bữa trưa không lặp lại và phù hợp khẩu vị nhiều nhóm khách.',
  'Nhan dat com doan com cong ty khu vuc Van Quan Ha Dong': 'Nhận đặt cơm đoàn, công ty khu vực Văn Quán Hà Đông',
  'Com Thi No nhan dat com doan, com cong ty va suat an van phong tai Van Quan, Ha Dong.': 'Cơm Thị Nở nhận đặt cơm đoàn, công ty và suất ăn văn phòng tại Văn Quán, Hà Đông.',
  // Add more as needed

  'Com Thi No': 'Cơm Thị Nở',
  'Thuc don hom nay': 'Thực đơn hôm nay',
  'Mon ngon Bac Bo': 'Món ngon Bắc Bộ',
  'Com van phong': 'Cơm văn phòng',
  'Uu dai': 'Ưu đãi',
  // Add more mappings as needed
};

function replaceDiacritics(text: string): string {
  let result = text;
  for (const [oldStr, newStr] of Object.entries(replacements)) {
    const regex = new RegExp(oldStr, 'g');
    result = result.replace(regex, newStr);
  }
  return result;
}

async function updateBlogCategories() {
  const categories = await prisma.blogCategory.findMany();
  for (const cat of categories) {
    const newName = replaceDiacritics(cat.name);
    if (newName !== cat.name) {
      await prisma.blogCategory.update({
        where: { id: cat.id },
        data: { name: newName },
      });
      console.log(`Updated category ${cat.id}: '${cat.name}' → '${newName}'`);
    }
  }
}

async function updateBlogPosts() {
  const posts = await prisma.blogPost.findMany();
  for (const post of posts) {
    const newTitle = replaceDiacritics(post.title);
    const newExcerpt = post.excerpt ? replaceDiacritics(post.excerpt) : null;
    const newContent = replaceDiacritics(post.content);
    const newAuthor = post.authorName ? replaceDiacritics(post.authorName) : null;
    const updates: any = {};
    if (newTitle !== post.title) updates.title = newTitle;
    if (newExcerpt !== post.excerpt) updates.excerpt = newExcerpt;
    if (newContent !== post.content) updates.content = newContent;
    if (newAuthor !== post.authorName) updates.authorName = newAuthor;
    if (Object.keys(updates).length > 0) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: updates,
      });
      console.log(`Updated post ${post.id}`);
    }
  }
}

async function main() {
  await updateBlogCategories();
  await updateBlogPosts();
  console.log('Diacritic fixes applied.');
}

main()
  .catch((e) => {
    console.error('Error updating database:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
