import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cloudinaryImage = 'https://res.cloudinary.com/dcgloyqur/image/upload/v1718956891/comthino.jpg'; // Placeholder

function generateLandingPageContent(title: string, keyword: string) {
  // A generic but long SEO content generator
  const sections = Array.from({ length: 5 }).map((_, i) => `
    <h2>${i + 1}. Tại sao nên chọn ${title}?</h2>
    <p>Khi nhắc đến <strong>${keyword}</strong> tại khu vực <strong>Hà Đông</strong>, đặc biệt là quanh trục đường <strong>Nguyễn Khuyến</strong>, KĐT <strong>Văn Quán</strong>, <strong>Hà Nội</strong>, thực khách luôn mong muốn tìm kiếm một địa chỉ uy tín, chất lượng và đậm đà hương vị truyền thống. Cơm Thị Nở tự hào là điểm đến lý tưởng mang lại những mâm cơm chuẩn vị Bắc Bộ.</p>
    <p>Chúng tôi hiểu rằng mỗi bữa ăn không chỉ đơn thuần là việc nạp năng lượng mà còn là khoảnh khắc thư giãn, gắn kết tình cảm gia đình, đồng nghiệp. Với không gian rộng rãi, thoáng mát, phong cách phục vụ chuyên nghiệp, Cơm Thị Nở cam kết mang đến trải nghiệm tuyệt vời nhất cho quý khách.</p>
    <h3>Chất lượng nguyên liệu tạo nên sự khác biệt</h3>
    <p>Tất cả nguyên liệu tại quán đều được tuyển chọn kỹ lưỡng mỗi ngày. Từ những hạt gạo dẻo thơm, rau củ quả tươi sạch cho đến các loại thực phẩm tươi sống, tất cả đều phải đáp ứng tiêu chuẩn vệ sinh an toàn thực phẩm khắt khe nhất. Quán tọa lạc tại trung tâm <strong>Hà Đông</strong>, rất thuận tiện cho việc di chuyển từ các khu vực lân cận trong <strong>Hà Nội</strong>.</p>
    <img src="${cloudinaryImage}" alt="${title} tại Cơm Thị Nở Văn Quán" title="${title}" style="width:100%; max-width:800px; border-radius:8px; margin: 20px 0;" />
    <p>Đội ngũ đầu bếp giàu kinh nghiệm của chúng tôi luôn dồn tâm huyết vào từng món ăn, giữ trọn vẹn hương vị truyền thống nhưng vẫn không ngừng sáng tạo để phù hợp với khẩu vị hiện đại. Dù bạn ở đâu tại <strong>Hà Nội</strong>, chỉ cần ghé qua KĐT <strong>Văn Quán</strong>, bạn sẽ được thưởng thức những hương vị khó quên.</p>
  `).join('\n');

  return `
    <div class="seo-landing-content">
      <h1>${title} - Lựa chọn số 1 tại Hà Đông</h1>
      <p class="lead">Bạn đang tìm kiếm dịch vụ <strong>${keyword}</strong> uy tín tại <strong>Hà Nội</strong>? Hãy đến ngay Cơm Thị Nở tại A16TT18 <strong>Nguyễn Khuyến</strong>, KĐT <strong>Văn Quán</strong>, <strong>Hà Đông</strong> để trải nghiệm dịch vụ xuất sắc nhất.</p>
      
      ${sections}

      <div class="menu-highlight" style="background: #f9f6f0; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h2>Thực Đơn Nổi Bật</h2>
        <ul>
          <li>Cơm niêu cá kho tộ chuẩn vị</li>
          <li>Thịt ba chỉ cháy cạnh thơm lừng</li>
          <li>Canh cua đồng cà pháo giòn tan</li>
          <li>Các món xào theo mùa tươi ngon</li>
        </ul>
      </div>

      <div class="cta-section" style="text-align: center; margin: 40px 0;">
        <h2>Sẵn sàng trải nghiệm?</h2>
        <p>Liên hệ ngay với chúng tôi để đặt bàn hoặc gọi ship tận nơi khu vực <strong>Hà Đông</strong> và <strong>Hà Nội</strong>.</p>
        <a href="tel:0987654321" style="display: inline-block; background: #C96A24; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 1.2rem;">GỌI NGAY: 0987.654.321</a>
      </div>

      <div class="contact-info">
        <h3>Thông Tin Liên Hệ - Cơm Thị Nở</h3>
        <p><strong>Địa chỉ:</strong> A16TT18 Nguyễn Khuyến, KĐT Văn Quán, Hà Đông, Hà Nội</p>
        <p><strong>Điện thoại:</strong> 0987.654.321</p>
        <p><strong>Giờ mở cửa:</strong> 09:00 - 22:00 (Hằng ngày)</p>
      </div>
    </div>
  `;
}

function generateBlogContent(title: string) {
  const sections = Array.from({ length: 4 }).map((_, i) => `
    <h2>Phần ${i + 1}: Điểm nhấn của ${title}</h2>
    <p>Khi nhắc đến ẩm thực truyền thống, đặc biệt là tại khu vực <strong>Văn Quán, Hà Đông, Hà Nội</strong>, không thể không kể đến những tinh hoa được gìn giữ qua nhiều thế hệ. Mỗi món ăn là một câu chuyện, một kỷ niệm gắn liền với tuổi thơ của biết bao người.</p>
    <p>Tại Cơm Thị Nở (A16TT18 <strong>Nguyễn Khuyến</strong>), chúng tôi luôn cố gắng tái hiện lại những mâm cơm đậm đà tình quê. Sự cẩn thận trong khâu chọn lựa nguyên liệu, kết hợp cùng bí quyết nấu nướng gia truyền đã tạo nên những món ăn làm say lòng thực khách.</p>
    <h3>Hương vị khó phai</h3>
    <p>Không chỉ là bữa ăn no bụng, đó còn là hành trình tìm về ký ức. Giữa nhịp sống hối hả của <strong>Hà Nội</strong>, một bữa cơm ấm cúng tại <strong>Hà Đông</strong> sẽ giúp bạn xua tan đi bao mệt mỏi, căng thẳng của công việc thường ngày.</p>
    <img src="${cloudinaryImage}" alt="${title}" title="${title}" style="width:100%; max-width:800px; border-radius:8px; margin: 20px 0;" />
  `).join('\n');

  return `
    <div class="blog-content">
      <p class="lead">Chào mừng bạn đến với bài viết chi tiết về <strong>${title}</strong>. Cùng Cơm Thị Nở khám phá những điều thú vị ẩn chứa đằng sau chủ đề này nhé!</p>
      ${sections}
      <div class="cta-box" style="background: #fdfbf7; padding: 20px; border-left: 4px solid #C96A24; margin-top: 30px;">
        <h3>Ghé thăm Cơm Thị Nở ngay hôm nay!</h3>
        <p>Nếu bạn đang làm việc hay sinh sống tại <strong>Hà Đông</strong>, đừng quên ghé qua KĐT <strong>Văn Quán</strong> để thưởng thức những mâm cơm tuyệt vời. Đặt bàn trước để nhận ưu đãi hấp dẫn!</p>
        <a href="/#dat-com" style="color: #4A250F; font-weight: bold;">Xem thực đơn và đặt bàn &rarr;</a>
      </div>
    </div>
  `;
}

async function main() {
  console.log('Seeding SEO Pages and Blog Posts...');

  // Landing Pages Data
  const landingPagesData = [
    { slug: 'com-van-phong-ha-dong', title: 'Cơm Văn Phòng Hà Đông - Giao Tận Nơi, Đảm Bảo Vệ Sinh', keyword: 'cơm văn phòng' },
    { slug: 'com-que-ha-dong', title: 'Cơm Quê Hà Đông - Chuẩn Vị Bắc Bộ Đậm Đà', keyword: 'cơm quê' },
    { slug: 'com-nieu-ha-dong', title: 'Cơm Niêu Hà Đông - Thơm Ngon Nóng Hổi Tròn Vị', keyword: 'cơm niêu' },
    { slug: 'com-trua-van-phong-ha-dong', title: 'Cơm Trưa Văn Phòng Hà Đông - Thực Đơn Phong Phú', keyword: 'cơm trưa văn phòng' },
    { slug: 'com-gia-dinh-ha-dong', title: 'Cơm Gia Đình Hà Đông - Không Gian Ấm Cúng sum Vầy', keyword: 'cơm gia đình' },
    { slug: 'quan-com-ngon-van-quan', title: 'Quán Cơm Ngon Văn Quán - Điểm Đến Lý Tưởng', keyword: 'quán cơm ngon' },
    { slug: 'com-doan-ha-dong', title: 'Đặt Cơm Đoàn Hà Đông - Chuyên Nghiệp, Rộng Rãi', keyword: 'cơm đoàn' },
    { slug: 'com-cong-ty-ha-dong', title: 'Cơm Công Ty Hà Đông - Suất Ăn An Toàn, Giá Cạnh Tranh', keyword: 'cơm công ty' },
    { slug: 'com-que-bac-bo-ha-dong', title: 'Cơm Quê Bắc Bộ Hà Đông - Hương Vị Truyền Thống', keyword: 'cơm quê Bắc Bộ' },
    { slug: 'dat-com-van-phong-ha-dong', title: 'Đặt Cơm Văn Phòng Hà Đông - Nhanh Chóng, Tiện Lợi', keyword: 'đặt cơm văn phòng' },
  ];

  for (const lp of landingPagesData) {
    const existing = await prisma.seoPage.findUnique({ where: { slug: lp.slug } });
    if (!existing) {
      await prisma.seoPage.create({
        data: {
          title: lp.title,
          slug: lp.slug,
          excerpt: `Tìm kiếm ${lp.keyword} ngon nhất tại khu vực Hà Đông, Văn Quán, Hà Nội. Cơm Thị Nở mang đến chất lượng tuyệt hảo và dịch vụ chuyên nghiệp.`,
          content: generateLandingPageContent(lp.title, lp.keyword),
          coverImageUrl: cloudinaryImage,
          seoTitle: lp.title,
          seoDescription: `Dịch vụ ${lp.keyword} chuyên nghiệp tại Nguyễn Khuyến, Văn Quán, Hà Đông. Không gian rộng rãi, thực đơn chuẩn vị Bắc Bộ, giá cả hợp lý.`,
          seoKeywords: `${lp.keyword}, cơm hà đông, cơm văn quán, cơm nguyễn khuyến, quán cơm hà nội`,
          ogTitle: lp.title,
          ogDescription: `Dịch vụ ${lp.keyword} chuyên nghiệp tại KĐT Văn Quán, Hà Đông.`,
          ogImageUrl: cloudinaryImage,
          schemaType: 'WebPage',
          isPublished: true,
          displayOrder: 1,
        }
      });
      console.log(`- Created SeoPage: ${lp.slug}`);
    }
  }

  // FAQ Data
  const faqCount = await prisma.fAQ.count();
  if (faqCount === 0) {
    const faqs = [
      { question: 'Quán có nhận ship cơm văn phòng khu vực Hà Đông không?', answer: 'Có, Cơm Thị Nở nhận ship miễn phí trong bán kính 3km quanh KĐT Văn Quán, Hà Đông. Các khu vực xa hơn sẽ tính phí ship ưu đãi.' },
      { question: 'Quán có không gian phục vụ khách đoàn không?', answer: 'Cơm Thị Nở tọa lạc tại A16TT18 Nguyễn Khuyến với không gian 2 tầng rộng rãi, có thể phục vụ cùng lúc đoàn 50-80 khách.' },
      { question: 'Thực đơn cơm niêu gồm những món gì?', answer: 'Thực đơn đa dạng với cá trắm kho riềng, thịt ba chỉ cháy cạnh, sườn xào chua ngọt, canh cua cà pháo và nhiều món đặc trưng Bắc Bộ khác.' },
      { question: 'Quán có xuất hóa đơn VAT cho công ty không?', answer: 'Quán có hỗ trợ xuất hóa đơn VAT điện tử cho các đơn vị doanh nghiệp đặt cơm công ty, cơm đoàn.' },
      { question: 'Giờ mở cửa của Cơm Thị Nở là từ mấy giờ?', answer: 'Quán phục vụ liên tục từ 09:00 sáng đến 22:00 tối tất cả các ngày trong tuần, kể cả ngày lễ tết.' }
    ];
    await prisma.fAQ.createMany({ data: faqs });
    console.log(`- Created ${faqs.length} FAQs`);
  }

  // Review Data
  const reviewCount = await prisma.customerReview.count();
  if (reviewCount === 0) {
    const reviews = [
      { customerName: 'Anh Minh (Hà Đông)', rating: 5, content: 'Cơm niêu rất ngon, cá kho riềng mềm rục xương. Không gian ở Văn Quán thoái mái.', avatar: cloudinaryImage },
      { customerName: 'Chị Hoa (Văn Quán)', rating: 5, content: 'Trưa nào công ty mình cũng gọi cơm ở đây. Giao hàng nhanh, đồ ăn nóng hổi.', avatar: cloudinaryImage },
      { customerName: 'Bác Tuấn (Hà Nội)', rating: 5, content: 'Chuẩn vị cơm quê Bắc Bộ. Ăn canh cua cà pháo nhớ quê hương da diết.', avatar: cloudinaryImage },
    ];
    await prisma.customerReview.createMany({ data: reviews });
    console.log(`- Created ${reviews.length} Reviews`);
  }

  // Blog Posts Data
  const blogPostsData = [
    { slug: 'top-10-mon-com-que-bac-bo-duoc-yeu-thich-nhat', title: 'Top 10 món cơm quê Bắc Bộ được yêu thích nhất' },
    { slug: 'an-gi-o-van-quan-ha-dong-vao-buoi-trua', title: 'Ăn gì ở Văn Quán Hà Đông vào buổi trưa?' },
    { slug: 'com-van-phong-ha-dong-tieu-chi-chon-quan-ngon', title: 'Cơm văn phòng Hà Đông: Tiêu chí chọn quán ngon và sạch' },
    { slug: 'mam-com-bac-truyen-thong-gom-nhung-mon-gi', title: 'Mâm cơm Bắc truyền thống gồm những món gì?' },
    { slug: 'vi-sao-ca-kho-la-linh-hon-cua-com-que-bac-bo', title: 'Vì sao cá kho là linh hồn của cơm quê Bắc Bộ?' },
    { slug: 'ca-phao-muoi-xoi-chuan-vi-bac-co-gi-dac-biet', title: 'Cà pháo muối xổi chuẩn vị Bắc có gì đặc biệt?' },
    { slug: 'suon-rang-chay-canh-mon-an-quen-thuoc-trong-mam-com-bac', title: 'Sườn rang cháy cạnh - món ăn quen thuộc trong mâm cơm Bắc' },
    { slug: 'dat-com-cong-ty-tai-ha-dong-can-luu-y-gi', title: 'Đặt cơm công ty tại Hà Đông cần lưu ý gì?' },
    { slug: 'goi-y-thuc-don-com-van-phong-cho-nhom-10-20-nguoi', title: 'Gợi ý thực đơn cơm văn phòng cho nhóm 10-20 người' },
    { slug: 'nhung-mon-canh-dan-da-dua-com-trong-bua-com-gia-dinh', title: 'Những món canh dân dã đưa cơm trong bữa cơm gia đình' },
  ];

  const defaultCategory = await prisma.blogCategory.findFirst();
  if (defaultCategory) {
    for (const post of blogPostsData) {
      const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
      if (!existing) {
        await prisma.blogPost.create({
          data: {
            categoryId: defaultCategory.id,
            title: post.title,
            slug: post.slug,
            excerpt: `${post.title} - Cùng Cơm Thị Nở khám phá ẩm thực đặc sắc tại KĐT Văn Quán, Hà Đông, Hà Nội.`,
            content: generateBlogContent(post.title),
            thumbnailUrl: cloudinaryImage,
            coverImageUrl: cloudinaryImage,
            authorName: 'Cơm Thị Nở',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            readingTime: 5,
            tags: 'cơm quê, cơm văn phòng, hà đông',
            seoTitle: post.title,
            seoDescription: `Bài viết chi tiết về ${post.title}. Thưởng thức ẩm thực ngon tại Văn Quán, Hà Đông, Hà Nội cùng Cơm Thị Nở.`,
            seoKeywords: `${post.title}, cơm hà đông, cơm văn quán`,
            ogTitle: post.title,
            ogDescription: `${post.title} - Cơm Thị Nở Văn Quán Hà Đông`,
            ogImageUrl: cloudinaryImage,
            schemaType: 'BlogPosting',
            isFeatured: false,
          }
        });
        console.log(`- Created BlogPost: ${post.slug}`);
      }
    }
  }

  console.log('SEO Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
