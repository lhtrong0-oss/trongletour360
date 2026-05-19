// api/agent-core.js — Bộ não trung tâm Telegram Agent
// Parse lệnh → route sang đúng handler → trả chuỗi kết quả

import { writeBlog } from './agent-blog.js';
import { checkAvailability, listBookings, updateBookingStatus } from './agent-booking.js';

const HELP_TEXT = `*TrongLeTour360 Agent* 🤖

*Blog & SEO:*
\`[Blog] viết: [chủ đề]\` — Viết bài SEO + deploy
\`[Blog] list\` — Danh sách bài blog đang live

*Booking Ngọc Sinh Cát:*
\`[Booking] xem\` — Xem tất cả booking đang chờ
\`[Booking] check: [ngày] [ngày]\` — Kiểm tra phòng trống (VD: 25/05 28/05)
\`[Booking] xác nhận: [Tên khách]\` — Xác nhận booking
\`[Booking] hủy: [Tên khách]\` — Hủy booking

*Dashboard:*
\`[Dashboard]\` — Xem trạng thái dự án + doanh thu
\`[Dashboard] cập nhật: [nội dung]\` — Cập nhật dashboard

*Hệ thống:*
\`/help\` — Menu này
\`/ping\` — Kiểm tra agent còn sống không`;

export async function processCommand(text, chatId) {
  const t = text.trim();

  // /ping
  if (t === '/ping') return '✅ Agent đang chạy. Ready!';

  // /start hoặc /help
  if (t === '/start' || t === '/help') return HELP_TEXT;

  // [Blog] viết: [chủ đề]
  const blogMatch = t.match(/\[Blog\]\s*viết:\s*(.+)/i);
  if (blogMatch) {
    const topic = blogMatch[1].trim();
    try {
      const { filename, liveUrl } = await writeBlog(topic);
      return `✅ Blog đã live!\n\n📝 Chủ đề: ${topic}\n📄 File: \`${filename}\`\n🔗 Link: ${liveUrl}\n\nSitemap đã cập nhật. Vào Search Console → Request Indexing nhé Trọng.`;
    } catch (e) {
      return `❌ Lỗi viết blog: ${e.message}`;
    }
  }

  // [Blog] list
  if (/\[Blog\]\s*list/i.test(t)) {
    return `📋 Blog đang live tại trongletour360.net/blog.html\n\nBài mới nhất:\n• homestay-dalat-view-dep-2026.html\n• du-lich-da-lat-thang-6.html\n• kinh-nghiem-thue-homestay-da-lat.html\n• tour-da-lat-1-ngay.html\n\nNhắn \`[Blog] viết: [chủ đề]\` để thêm bài mới.`;
  }

  // [Booking] xem
  if (/\[Booking\]\s*xem/i.test(t)) {
    try {
      const list = await listBookings();
      return list;
    } catch (e) {
      return `❌ Lỗi lấy booking: ${e.message}`;
    }
  }

  // [Booking] check: [ngày vào] [ngày ra]
  const checkMatch = t.match(/\[Booking\]\s*check:\s*(\S+)\s+(\S+)/i);
  if (checkMatch) {
    try {
      const result = await checkAvailability(checkMatch[1], checkMatch[2]);
      return result;
    } catch (e) {
      return `❌ Lỗi check phòng: ${e.message}`;
    }
  }

  // [Booking] xác nhận: [tên]
  const confirmMatch = t.match(/\[Booking\]\s*xác nhận:\s*(.+)/i);
  if (confirmMatch) {
    try {
      const result = await updateBookingStatus(confirmMatch[1].trim(), 'confirmed');
      return result;
    } catch (e) {
      return `❌ Lỗi xác nhận: ${e.message}`;
    }
  }

  // [Booking] hủy: [tên]
  const cancelMatch = t.match(/\[Booking\]\s*hủy:\s*(.+)/i);
  if (cancelMatch) {
    try {
      const result = await updateBookingStatus(cancelMatch[1].trim(), 'cancelled');
      return result;
    } catch (e) {
      return `❌ Lỗi hủy: ${e.message}`;
    }
  }

  // [Dashboard]
  if (/\[Dashboard\]/i.test(t)) {
    return getDashboard();
  }

  // fallback — Claude AI response
  try {
    return await askClaude(t);
  } catch (e) {
    return `❌ Lỗi AI: ${e.message}\n\nNhắn /help để xem lệnh.`;
  }
}

function getDashboard() {
  return `📊 *Dashboard Tháng 5/2026*

🎯 Mục tiêu: 50 triệu VND (deadline 31/05)

| # | Khách | Gói | Giá | Trạng thái |
|---|-------|-----|-----|-----------|
| 1 | Bonsai Tuấn Trang | B | 12tr | ✅ Live — chờ thu tiền |
| 2 | — | — | — | 🔜 Trống |

💰 Đã thu: 0 / 50 triệu
🌐 Site: trongletour360.net (17 trang live)
📝 Blog: 7 bài đã deploy
🔍 SEO: FAQ schema + 3 landing pages + 7 blogs

*Việc cần làm:*
• Check Search Console sau 7 ngày (7 URL mới)
• Nhờ khách cũ viết Google Review
• Pitch bảo trì Bonsai Tuấn Trang (1.5tr/tháng)

Nhắn \`[Dashboard] cập nhật: ...\` để ghi thêm.`;
}

async function askClaude(text) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'Bạn là Claude — AI assistant của TrongLeTour360 web agency tại Đà Lạt. Trả lời ngắn gọn bằng tiếng Việt. Nếu câu hỏi về công việc web agency (SEO, code, thiết kế), trả lời chuyên nghiệp. Nếu không rõ, hướng dẫn dùng /help.',
      messages: [{ role: 'user', content: text }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content[0].text;
}
