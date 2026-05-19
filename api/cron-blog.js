// api/cron-blog.js — Vercel Cron: mỗi thứ Hai 8AM (Vietnam = 1AM UTC)
// Tự viết 1 bài SEO blog mới + push + update sitemap + báo Telegram

import { writeBlog } from './agent-blog.js';
import { notifyTelegram } from './notify-telegram.js';

// Danh sách chủ đề xoay vòng — đủ 52 tuần (1 năm)
const BLOG_TOPICS = [
  'kinh nghiệm du lịch Đà Lạt tự túc 2026',
  'top homestay Đà Lạt gần trung tâm 2026',
  'thiết kế website bán hàng online Đà Lạt',
  'chụp ảnh 360 bất động sản Đà Lạt giá tốt',
  'tour Đà Lạt 2 ngày 1 đêm tiết kiệm',
  'homestay Đà Lạt có bếp cho gia đình',
  'website bán bonsai online hiệu quả',
  'kinh nghiệm thuê villa Đà Lạt nguyên căn',
  'tour Đà Lạt 3 ngày 2 đêm khám phá',
  'thiết kế website spa Đà Lạt chuyên nghiệp',
  'top địa điểm chụp ảnh đẹp Đà Lạt 2026',
  'homestay Đà Lạt view thung lũng đẹp nhất',
  'website đặt phòng homestay tự động 2026',
  'tour tham quan vườn hoa Đà Lạt',
  'kinh nghiệm mở homestay Đà Lạt sinh lời',
  'chụp ảnh 360 nhà hàng Đà Lạt tăng khách',
  'top quán cà phê view đẹp Đà Lạt 2026',
  'thiết kế website nhà hàng Đà Lạt',
  'tour Đà Lạt mùa hoa dã quỳ tháng 11',
  'homestay Đà Lạt cho cặp đôi lãng mạn',
  'website bán tour Đà Lạt online hiệu quả',
  'kinh nghiệm du lịch Đà Lạt tháng 1',
  'thiết kế website tiệc cưới Đà Lạt',
  'tour trekking Đà Lạt cho người mới',
  'homestay Đà Lạt phong cách châu Âu',
  'chụp ảnh 360 bán nhà đất Đà Lạt nhanh hơn',
  'kinh nghiệm du lịch Đà Lạt tháng 4',
  'website chatbot tự động cho homestay 2026',
  'top món ăn ngon Đà Lạt phải thử',
  'thiết kế website bất động sản Đà Lạt',
  'tour Đà Lạt chill cho hội bạn thân',
  'homestay Đà Lạt có hồ bơi sân vườn',
  'kinh nghiệm du lịch Đà Lạt tháng 8',
  'chụp ảnh sản phẩm bonsai chuyên nghiệp',
  'website agency Đà Lạt uy tín giá tốt',
  'tour Đà Lạt 1 ngày cho dân công sở',
  'homestay Đà Lạt gần hồ Tuyền Lâm',
  'kinh nghiệm mua bonsai Đà Lạt không bị chặt chém',
  'thiết kế website khách sạn mini Đà Lạt',
  'tour Đà Lạt kết hợp team building',
  'homestay Đà Lạt gần chợ đêm',
  'website bán hoa Đà Lạt online',
  'kinh nghiệm du lịch Đà Lạt mùa mưa',
  'tour ẩm thực Đà Lạt buổi tối',
  'thiết kế website dịch vụ cưới Đà Lạt',
  'chụp ảnh 360 căn hộ cho thuê Đà Lạt',
  'homestay Đà Lạt có lò sưởi ấm áp',
  'website booking tự động tăng doanh thu',
  'tour Đà Lạt cho người cao tuổi',
  'kinh nghiệm du lịch Đà Lạt dịp Tết 2026',
  'thiết kế website salon tóc Đà Lạt',
  'top bonsai Đà Lạt đẹp giá hợp lý',
];

export default async function handler(req) {
  // Vercel cron gửi GET, bảo mật bằng CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Chọn chủ đề theo tuần trong năm (xoay vòng)
    const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 604800000);
    const topic = BLOG_TOPICS[weekOfYear % BLOG_TOPICS.length];

    const { filename, liveUrl } = await writeBlog(topic);

    await notifyTelegram(
      `📝 *Blog tự động tuần này đã live!*\n\n` +
      `📌 Chủ đề: ${topic}\n` +
      `🔗 ${liveUrl}\n\n` +
      `_Đăng lên Facebook group du lịch Đà Lạt để tăng traffic nhé Trọng!_`
    );

    return new Response(JSON.stringify({ ok: true, topic, liveUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    await notifyTelegram(`❌ Cron blog thất bại: ${e.message}`);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
