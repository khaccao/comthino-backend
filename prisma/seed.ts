import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database starting...');

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@comthino.vn';
  const adminPassword = process.env.ADMIN_PASSWORD || 'CHANGE_ME';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: 'Thị Nở Admin',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`- Created/Verified Admin User: ${admin.email}`);

  // 2. Seed SiteSettings
  const settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    await prisma.siteSettings.create({
      data: {
        siteName: 'Cơm Thị Nở',
        slogan: 'Cơm Quê Chuẩn Vị Bắc Bộ',
        primaryColor: '#4A250F',
        secondaryColor: '#C96A24',
        accentColor: '#D99A2B',
        phone: '0987654321',
        email: 'lienhe@comthino.vn',
        address: 'A16TT18 Nguyễn Khuyến, KĐT Văn Quán, Hà Đông, Hà Nội',
        facebookUrl: 'https://facebook.com/comthino',
        zaloUrl: 'https://zalo.me/0987654321',
        googleMapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3725.2925132890637!2d105.78768797587884!3d20.980907290924973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135accecd711f95%3A0xe54e3d3b76bb06e4!2sA16TT18%20Nguy%E1%BB%85n%20Khuy%E1%BA%BFn%2C%20K%C4%90T%20V%C4%83n%20Qu%C3%A1n%2C%20H%C3%A0%20%C4%90%C3%B4ng%2C%20H%C3%A0%20N%E1%BB%99i!5e0!3m2!1svi!2s!4v1718956891002!5m2!1svi!2s',
        openingHours: '09:00 - 22:00 (Hằng ngày)',
        seoTitle: 'Cơm Thị Nở - Cơm quê chuẩn vị Bắc Bộ tại Hà Đông',
        seoDescription: 'Thưởng thức cơm niêu, cơm đĩa, canh cua cà pháo chuẩn vị Bắc Bộ ấm cúng tại khu đô thị Văn Quán. Phục vụ cơm trưa văn phòng, cơm gia đình, đặt tiệc đoàn.',
        seoKeywords: 'cơm thị nở, cơm quê hà đông, cơm văn quán, cơm niêu hà đông, cơm chuẩn vị bắc',
        logoUrl: '/assets/logo.png',
        faviconUrl: '/assets/favicon.ico',
      },
    });
    console.log('- Created SiteSettings');
  }

  // 3. Seed Navigation Items
  const navCount = await prisma.navigationItem.count();
  if (navCount === 0) {
    await prisma.navigationItem.createMany({
      data: [
        { label: 'Trang chủ', url: '/', displayOrder: 1, isActive: true },
        { label: 'Giới thiệu', url: '#gioi-thieu', displayOrder: 2, isActive: true },
        { label: 'Thực đơn sách lật', url: '#menu-sach', displayOrder: 3, isActive: true },
        { label: 'Món nổi bật', url: '#mon-noi-bat', displayOrder: 4, isActive: true },
        { label: 'Khuyến mãi', url: '#khuyen-mai', displayOrder: 5, isActive: true },
        { label: 'Thư viện ảnh', url: '#thu-vien', displayOrder: 6, isActive: true },
        { label: 'Đặt cơm đoàn', url: '#dat-com', displayOrder: 7, isActive: true },
      ],
    });
    console.log('- Created NavigationItems');
  }

  // 4. Seed HomeSections
  const sectionCount = await prisma.homeSection.count();
  if (sectionCount === 0) {
    await prisma.homeSection.createMany({
      data: [
        {
          sectionKey: 'about_story',
          title: 'Câu chuyện Cơm Thị Nở',
          subtitle: 'Hương Vị Quê Nhà Giữa Lòng Phố Thị',
          description: 'Cơm Thị Nở ra đời từ niềm thương nhớ mâm cơm Bắc Bộ ngày xưa của bà, của mẹ. Với niêu cơm dẻo thơm, đĩa rau muống luộc chấm tương bần, bát canh cua đồng ngọt lịm cùng đĩa cà pháo giòn tan... Chúng tôi mong muốn mang đến cho quý khách không chỉ bữa ăn ngon miệng mà còn là tấm vé quay về miền ký ức tuổi thơ ấm áp.',
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
          displayOrder: 1,
          isActive: true,
        },
        {
          sectionKey: 'about_space',
          title: 'Không gian ấm cúng',
          subtitle: 'Phong cách xưa cũ, thân quen',
          description: 'Thiết kế theo lối kiến trúc mộc mạc, xưa cũ của đồng bằng Bắc Bộ với bàn ghế tre, những bức tường màu vàng rơm ấm áp và ánh đèn cam dịu nhẹ. Cơm Thị Nở là địa điểm hoàn hảo để sum họp gia đình, gặp gỡ đồng nghiệp hay tiếp đãi đoàn khách du lịch phương xa.',
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
          displayOrder: 2,
          isActive: true,
        },
      ],
    });
    console.log('- Created HomeSections');
  }

  // 5. Seed Banners
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: 'Cơm Quê Chuẩn Vị Bắc Bộ',
          subtitle: 'Hương vị gia đình đầm ấm & tròn vị',
          description: 'Mỗi món ăn là một câu chuyện quê hương, được chế biến từ những nguyên liệu tươi ngon chọn lọc nhất bởi các đầu bếp có tâm.',
          imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=1200&auto=format&fit=crop',
          buttonText: 'Khám Phá Thực Đơn',
          buttonLink: '#menu-sach',
          displayOrder: 1,
          isActive: true,
        },
        {
          title: 'Đặt Cơm Đoàn & Cơm Văn Phòng',
          subtitle: 'Ưu đãi hấp dẫn cho khách đi đoàn',
          description: 'Phục vụ cơm niêu, cơm đĩa văn phòng chất lượng cao và các suất ăn tập thể, cam kết an toàn thực phẩm.',
          imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=1200&auto=format&fit=crop',
          buttonText: 'Liên Hệ Đặt Trực Tiếp',
          buttonLink: '#dat-com',
          displayOrder: 2,
          isActive: true,
        },
      ],
    });
    console.log('- Created Banners');
  }

  // 6. Seed Categories & MenuItems
  const catCount = await prisma.menuCategory.count();
  if (catCount === 0) {
    const catGa = await prisma.menuCategory.create({ data: { name: 'GÀ', displayOrder: 1, isActive: true } });
    const catBo = await prisma.menuCategory.create({ data: { name: 'BÒ', displayOrder: 2, isActive: true } });
    const catSuon = await prisma.menuCategory.create({ data: { name: 'SƯỜN', displayOrder: 3, isActive: true } });
    const catCa = await prisma.menuCategory.create({ data: { name: 'CÁ', displayOrder: 4, isActive: true } });
    const catTep = await prisma.menuCategory.create({ data: { name: 'TÉP', displayOrder: 5, isActive: true } });
    const catDauPhu = await prisma.menuCategory.create({ data: { name: 'ĐẬU PHỤ', displayOrder: 6, isActive: true } });
    const catThitLon = await prisma.menuCategory.create({ data: { name: 'THỊT LỢN', displayOrder: 7, isActive: true } });
    const catCanh = await prisma.menuCategory.create({ data: { name: 'CANH', displayOrder: 8, isActive: true } });
    const catRau = await prisma.menuCategory.create({ data: { name: 'RAU', displayOrder: 9, isActive: true } });
    const catTrung = await prisma.menuCategory.create({ data: { name: 'TRỨNG', displayOrder: 10, isActive: true } });
    const catMonKem = await prisma.menuCategory.create({ data: { name: 'MÓN KÈM', displayOrder: 11, isActive: true } });

    console.log('- Created MenuCategories');

    // Seed Menu Items
    await prisma.menuItem.createMany({
      data: [
        // GÀ
        { categoryId: catGa.id, name: 'Gà rang gừng', slug: 'ga-rang-gung', price: 65000, isAvailable: true, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catGa.id, name: 'Gà sốt me', slug: 'ga-sot-me', price: 65000, isAvailable: true, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catGa.id, name: 'Gà chiên mắm', slug: 'ga-chien-mam', price: 65000, isAvailable: true, displayOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catGa.id, name: 'Gà xào lăn', slug: 'ga-xao-lan', price: 65000, isAvailable: true, displayOrder: 4, imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=400&auto=format&fit=crop' },
        
        // BÒ
        { categoryId: catBo.id, name: 'Bò lúc lắc', slug: 'bo-luc-lac', price: 85000, isAvailable: true, displayOrder: 5, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catBo.id, name: 'Bò sốt tiêu đen', slug: 'bo-sot-tieu-den', price: 85000, isAvailable: true, displayOrder: 6, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catBo.id, name: 'Bò sốt vang', slug: 'bo-sot-vang', price: 85000, isAvailable: true, displayOrder: 7, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catBo.id, name: 'Bò xào rau thập cẩm', slug: 'bo-xao-rau-thap-cam', price: 85000, isAvailable: true, displayOrder: 8, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop' },

        // SƯỜN
        { categoryId: catSuon.id, name: 'Sườn xào chua ngọt', slug: 'suon-xao-chua-ngot', price: 75000, isAvailable: true, displayOrder: 9, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop' },

        // CÁ
        { categoryId: catCa.id, name: 'Cá trắm kho riềng', slug: 'ca-tram-kho-rieng', price: 65000, isAvailable: true, displayOrder: 10, imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=400&auto=format&fit=crop' },

        // TÉP
        { categoryId: catTep.id, name: 'Tép sông rang', slug: 'tep-song-rang', price: 55000, isAvailable: true, displayOrder: 11, imageUrl: 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catTep.id, name: 'Tép sông rim ba chỉ', slug: 'tep-song-rim-ba-chi', price: 65000, isAvailable: true, displayOrder: 12, imageUrl: 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?q=80&w=400&auto=format&fit=crop' },

        // ĐẬU PHỤ
        { categoryId: catDauPhu.id, name: 'Đậu sốt cà chua', slug: 'dau-sot-ca-chua', price: 35000, isAvailable: true, displayOrder: 13, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catDauPhu.id, name: 'Đậu nhồi thịt sốt cà chua', slug: 'dau-nhoi-thit-sot-ca-chua', price: 45000, isAvailable: true, displayOrder: 14, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catDauPhu.id, name: 'Đậu tẩm hành', slug: 'dau-tam-hanh', price: 35000, isAvailable: true, displayOrder: 15, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop' },

        // THỊT LỢN
        { categoryId: catThitLon.id, name: 'Thịt lợn rang cháy cạnh', slug: 'thit-lon-rang-chay-canh', price: 65000, isAvailable: true, displayOrder: 16, imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catThitLon.id, name: 'Ba chỉ luộc chấm mắm nêm', slug: 'ba-chi-luoc-cham-mam-nem', price: 65000, isAvailable: true, displayOrder: 17, imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catThitLon.id, name: 'Ba chỉ chao riềng', slug: 'ba-chi-chao-rieng', price: 65000, isAvailable: true, displayOrder: 18, imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catThitLon.id, name: 'Ba chỉ kho trứng', slug: 'ba-chi-kho-trung', price: 65000, isAvailable: true, displayOrder: 19, imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catThitLon.id, name: 'Thịt chưng mắm tép', slug: 'thit-chung-mam-tep', price: 65000, isAvailable: true, displayOrder: 20, imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=400&auto=format&fit=crop' },

        // CANH
        { categoryId: catCanh.id, name: 'Canh chua thịt băm', slug: 'canh-chua-thit-bam', price: 45000, isAvailable: true, displayOrder: 21, imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catCanh.id, name: 'Canh cua cà sổi', slug: 'canh-cua-ca-soi', price: 45000, isAvailable: true, displayOrder: 22, imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=400&auto=format&fit=crop' },

        // RAU
        { categoryId: catRau.id, name: 'Rau xào theo mùa', slug: 'rau-xao-theo-mua', price: 35000, isAvailable: true, displayOrder: 23, imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&auto=format&fit=crop' },

        // TRỨNG
        { categoryId: catTrung.id, name: 'Trứng rán', slug: 'trung-ran', price: 35000, isAvailable: true, displayOrder: 24, imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=400&auto=format&fit=crop' },

        // MÓN KÈM
        { categoryId: catMonKem.id, name: 'Chả lá lốt', slug: 'cha-la-lot', price: 45000, isAvailable: true, displayOrder: 25, imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catMonKem.id, name: 'Trứng ốp la', slug: 'trung-op-la', price: 15000, isAvailable: true, displayOrder: 26, imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=400&auto=format&fit=crop' },
        { categoryId: catMonKem.id, name: 'Dưa muối xào thịt', slug: 'dua-muoi-xao-thit', price: 55000, isAvailable: true, displayOrder: 27, imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=400&auto=format&fit=crop' },
      ],
    });
    console.log('- Created MenuItems');
  }

  // 7. Seed Promotions
  const promoCount = await prisma.promotion.count();
  if (promoCount === 0) {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    await prisma.promotion.create({
      data: {
        title: 'Giảm Ngay 15% Khi Đặt Cơm Đoàn Trước 24h',
        description: 'Áp dụng cho các đoàn khách từ 15 người trở lên khi liên hệ đặt bàn trước qua số điện thoại hoặc form website. Tặng kèm tráng miệng chè sen hạt lựu thanh mát.',
        imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=600&auto=format&fit=crop',
        startDate: today,
        endDate: nextMonth,
        discountText: 'Ưu đãi 15%',
        buttonText: 'Đăng Ký Đặt Bàn Ngay',
        buttonLink: '#dat-com',
        isActive: true,
      },
    });
    console.log('- Created Promotion');
  }

  // 8. Seed Testimonials
  const testCount = await prisma.testimonial.count();
  if (testCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          customerName: 'Anh Hoàng Nam (Hà Đông)',
          content: 'Không gian quán cực kỳ ấm cúng, bước vào là ngửi thấy mùi cơm dẻo, cá kho riềng thơm nức mũi. Canh cua ở đây nấu nhiều gạch cua thật, ăn kèm cà pháo muối chuẩn vị như mẹ tôi nấu ngày xưa.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
          isActive: true,
        },
        {
          customerName: 'Chị Mai Lan (Văn phòng KĐT Văn Quán)',
          content: 'Tôi và đồng nghiệp thường xuyên gọi cơm đĩa và cơm niêu ở Thị Nở. Cơm ship đến văn phòng vẫn nóng hổi, sườn rim và cá kho nêm nếm rất vừa vị, giá cả cực kỳ hợp lý.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
          isActive: true,
        },
      ],
    });
    console.log('- Created Testimonials');
  }

  // 9. Seed GalleryImages
  const galleryCount = await prisma.galleryImage.count();
  if (galleryCount === 0) {
    await prisma.galleryImage.createMany({
      data: [
        { title: 'Niêu đất cá kho riềng nóng hổi', imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=500&auto=format&fit=crop', altText: 'Cá kho riềng niêu đất Cơm Thị Nở', displayOrder: 1, isActive: true },
        { title: 'Không gian hoài niệm xưa cũ', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=500&auto=format&fit=crop', altText: 'Không gian quán Cơm Thị Nở', displayOrder: 2, isActive: true },
        { title: 'Mâm cơm sum họp ấm áp', imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=500&auto=format&fit=crop', altText: 'Mâm cơm Bắc Bộ Cơm Thị Nở', displayOrder: 3, isActive: true },
        { title: 'Canh cua đồng thanh mát ngày hè', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=500&auto=format&fit=crop', altText: 'Canh cua đồng Cơm Thị Nở', displayOrder: 4, isActive: true },
      ],
    });
    console.log('- Created GalleryImages');
  }

  // 10. Seed Blog Categories and Posts
  const blogCategoryCount = await prisma.blogCategory.count();
  if (blogCategoryCount === 0) {
    const categories = await Promise.all([
      prisma.blogCategory.create({ data: { name: 'Thực đơn hôm nay', slug: 'thuc-don-hom-nay', description: 'Cap nhat thuc don com van phong va mon ngon trong ngay.', displayOrder: 1, isActive: true } }),
      prisma.blogCategory.create({ data: { name: 'Món ngon Bắc Bộ', slug: 'mon-ngon-bac-bo', description: 'Cau chuyen ve huong vi com que Bac Bo.', displayOrder: 2, isActive: true } }),
      prisma.blogCategory.create({ data: { name: 'Cơm văn phòng', slug: 'com-van-phong', description: 'Kinh nghiem dat com trua van phong ngon, sach, dung gio.', displayOrder: 3, isActive: true } }),
      prisma.blogCategory.create({ data: { name: 'Ưu đãi', slug: 'uu-dai', description: 'Thong tin uu dai va combo moi tu Com Thi No.', displayOrder: 4, isActive: true } }),
      prisma.blogCategory.create({ data: { name: 'Tin quan', slug: 'tin-quan', description: 'Tin khai truong, hoat dong va cap nhat tu quan.', displayOrder: 5, isActive: true } }),
    ]);

    const [todayMenu, northernFood, officeRice, promotion, restaurantNews] = categories;
    const now = new Date();
    const blogImage = 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=1000&auto=format&fit=crop';

    await prisma.blogPost.createMany({
      data: [
        {
          categoryId: restaurantNews.id,
          title: 'Com Thi No khai truong tai KDT Van Quan, Ha Dong',
          slug: 'com-thi-no-khai-truong-tai-kdt-van-quan-ha-dong',
          excerpt: 'Com Thi No don khach tai Van Quan voi mam com que Bac Bo, khong gian am cung va dich vu dat com doan.',
          content: '<h2>Com que Bac Bo giua Van Quan</h2><p>Com Thi No mang den nhung mam com than quen voi ca kho, canh cua, dua muoi va cac mon kho dam vi gia dinh.</p><h3>Phuc vu tai quan va dat com doan</h3><p>Khach co the den an truc tiep hoac lien he dat com van phong, com cong ty khu vuc Ha Dong.</p>',
          thumbnailUrl: blogImage,
          coverImageUrl: blogImage,
          authorName: 'Cơm Thị Nở',
          status: 'PUBLISHED',
          publishedAt: now,
          readingTime: 1,
          tags: 'khai truong, van quan, ha dong',
          seoTitle: 'Com Thi No khai truong tai Van Quan Ha Dong',
          seoDescription: 'Com Thi No khai truong tai KDT Van Quan, Ha Dong voi mam com que Bac Bo, com van phong va dat com doan.',
          seoKeywords: 'com thi no, com van quan, com ha dong',
          ogTitle: 'Com Thi No khai truong tai KDT Van Quan',
          ogDescription: 'Dia chi com que Bac Bo moi tai Van Quan, Ha Dong.',
          ogImageUrl: blogImage,
          schemaType: 'BlogPosting',
          isFeatured: true,
          displayOrder: 1,
        },
        {
          categoryId: officeRice.id,
          title: 'Goi y bua trua van phong ngon mieng tai Ha Dong',
          slug: 'goi-y-bua-trua-van-phong-ngon-mieng-tai-ha-dong',
          excerpt: 'Cach chon bua trua van phong vua ngon, du chat, giao dung gio cho nhan su khu vuc Ha Dong.',
          content: '<h2>Bua trua can du vi va du chat</h2><p>Mot suat com van phong tot nen co mon man, rau, canh va phan com nong vua du.</p><h3>Dat truoc de giao dung gio</h3><p>Voi nhom dong nguoi, dat truoc giup bep chuan bi tot hon va giao dung khung gio nghi trua.</p>',
          thumbnailUrl: blogImage,
          coverImageUrl: blogImage,
          authorName: 'Com Thi No',
          status: 'PUBLISHED',
          publishedAt: now,
          readingTime: 1,
          tags: 'com van phong, ha dong, bua trua',
          seoTitle: 'Goi y bua trua van phong ngon tai Ha Dong',
          seoDescription: 'Goi y cach dat com van phong Ha Dong ngon, sach, giao nhanh va phu hop nhom nhan su.',
          seoKeywords: 'com van phong ha dong, bua trua van phong',
          ogImageUrl: blogImage,
          schemaType: 'BlogPosting',
          isFeatured: true,
          displayOrder: 2,
        },
        {
          categoryId: northernFood.id,
          title: 'Vi sao com que Bac Bo luon duoc yeu thich',
          slug: 'vi-sao-com-que-bac-bo-luon-duoc-yeu-thich',
          excerpt: 'Com que Bac Bo hap dan boi vi dam da, gan gui va goi nho nhung bua com gia dinh.',
          content: '<h2>Huong vi gan voi ky uc</h2><p>Ca kho, thit rang, canh cua va ca muoi la nhung mon an moc mac nhung rat de nho.</p><blockquote>Mot bua com ngon la bua com lam nguoi an thay am long.</blockquote><h3>Nguyen lieu quen thuoc</h3><p>Su hap dan den tu cach nem nep, su can bang va cach nau cham rai.</p>',
          thumbnailUrl: blogImage,
          coverImageUrl: blogImage,
          authorName: 'Com Thi No',
          status: 'PUBLISHED',
          publishedAt: now,
          readingTime: 1,
          tags: 'mon ngon bac bo, com que',
          seoTitle: 'Vi sao com que Bac Bo luon duoc yeu thich',
          seoDescription: 'Tim hieu vi sao com que Bac Bo voi ca kho, canh cua, dua muoi luon duoc thuc khach yeu thich.',
          seoKeywords: 'com que bac bo, mon ngon bac bo',
          ogImageUrl: blogImage,
          schemaType: 'BlogPosting',
          isFeatured: true,
          displayOrder: 3,
        },
        {
          categoryId: todayMenu.id,
          title: 'Thuc don com van phong thay doi moi ngay tai Com Thi No',
          slug: 'thuc-don-com-van-phong-thay-doi-moi-ngay-tai-com-thi-no',
          excerpt: 'Thuc don linh hoat moi ngay giup bua trua khong lap lai va phu hop khau vi nhieu nhom khach.',
          content: '<h2>Moi ngay mot lua chon moi</h2><p>Bep Com Thi No uu tien cac mon de an, du chat va phu hop nhieu lua tuoi.</p><h3>Co the dat theo nhom</h3><p>Doanh nghiep co the lien he de nhan tu van thuc don theo ngan sach va so luong.</p>',
          thumbnailUrl: blogImage,
          coverImageUrl: blogImage,
          authorName: 'Com Thi No',
          status: 'PUBLISHED',
          publishedAt: now,
          readingTime: 1,
          tags: 'thuc don hom nay, com van phong',
          seoTitle: 'Thuc don com van phong moi ngay tai Com Thi No',
          seoDescription: 'Cap nhat thuc don com van phong thay doi moi ngay tai Com Thi No, phu hop dat com cong ty Ha Dong.',
          seoKeywords: 'thuc don com van phong, com thi no',
          ogImageUrl: blogImage,
          schemaType: 'BlogPosting',
          isFeatured: false,
          displayOrder: 4,
        },
        {
          categoryId: promotion.id,
          title: 'Nhan dat com doan com cong ty khu vuc Van Quan Ha Dong',
          slug: 'nhan-dat-com-doan-com-cong-ty-khu-vuc-van-quan-ha-dong',
          excerpt: 'Com Thi No nhan dat com doan, com cong ty va suat an van phong tai Van Quan, Ha Dong.',
          content: '<h2>Dat com doan gon gang hon</h2><p>Chi can gui so luong, thoi gian giao va ngan sach, bep se goi y thuc don phu hop.</p><h3>Phu hop su kien noi bo</h3><p>Cac buoi hop, lien hoan nho hay bua trua phong ban deu co the duoc chuan bi theo yeu cau.</p>',
          thumbnailUrl: blogImage,
          coverImageUrl: blogImage,
          authorName: 'Com Thi No',
          status: 'PUBLISHED',
          publishedAt: now,
          readingTime: 1,
          tags: 'dat com doan, com cong ty, van quan',
          seoTitle: 'Dat com doan com cong ty Van Quan Ha Dong',
          seoDescription: 'Nhan dat com doan, com cong ty va com van phong khu vuc Van Quan Ha Dong, giao dung gio.',
          seoKeywords: 'dat com doan van quan, com cong ty ha dong',
          ogImageUrl: blogImage,
          schemaType: 'BlogPosting',
          isFeatured: false,
          displayOrder: 5,
        },
      ],
    });

    console.log('- Created BlogCategories and BlogPosts');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
