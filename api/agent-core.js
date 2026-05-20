// api/agent-core.js — Bộ não trung tâm Telegram Agent
// Parse lệnh → route sang đúng handler → trả chuỗi kết quả

import { writeBlog } from './agent-blog.js';
import { buildWebsite } from './agent-website.js';
import { checkAvailability, listBookings, updateBookingStatus } from './agent-booking.js';
import { getClients } from './crm-data.js';

const HELP_TEXT = `*TrongLeTour360 Agent* 🤖

*Website Builder:*
\`[KhachMoi] build: [Tên] - [ngành] - [mô tả]\`
→ Claude build demo website live trong 60 giây

*Blog & SEO:*
\`[Blog] viết: [chủ đề]\` — Viết bài SEO + deploy
\`[Blog] list\` — Danh sách bài đang live

*Booking Ngọc Sinh Cát:*
\`[Booking] xem\` — Booking đang chờ xác nhận
\`[Booking] check: [ngày vào] [ngày ra]\` — Check phòng trống
\`[Booking] xác nhận: [Tên]\` — Xác nhận
\`[Booking] hủy: [Tên]\` — Hủy booking

*Báo giá nhanh:*
\`[Báo giá] [tên khách] [ngành]\` — Tạo báo giá gửi Zalo

*Shot Brief (điều phối quay):*
\`[Brief] [tên khách]\` — Tạo danh sách cảnh cần quay tuần này

*CRM:*
\`[CRM] xem\` — Danh sách khách hàng + doanh thu

*Đăng Facebook:*
\`[FB] đăng: [nội dung]\` — Đăng bài lên Facebook Page ngay

*Dashboard:*
\`[Dashboard]\` — Trạng thái + doanh thu

*Hệ thống:*
\`/help\` — Menu này · \`/ping\` — Kiểm tra agent`;

export async function processCommand(text, chatId) {
  const t = text.trim();

  // /ping
  if (t === '/ping') return '✅ Agent đang chạy. Ready!';

  // /start hoặc /help
  if (t === '/start' || t === '/help') return HELP_TEXT;

  // [KhachMoi] build: [Tên] - [ngành] - [mô tả]
  const buildMatch = t.match(/\[KhachMoi\]\s*build:\s*([^-]+)-\s*([^-]+)(?:-\s*(.+))?/i);
  if (buildMatch) {
    const name = buildMatch[1].trim();
    const industry = buildMatch[2].trim();
    const description = buildMatch[3]?.trim() || '';
    try {
      const { liveUrl } = await buildWebsite({ name, industry, description });
      return (
        `✅ *Demo website đã live!*\n\n` +
        `🏢 Khách: *${name}*\n` +
        `🏷 Ngành: ${industry}\n` +
        `🔗 ${liveUrl}\n\n` +
        `_Gửi link này cho khách xem ngay. Nếu duyệt → nhắn [KhachMoi] deploy: ${name}_`
      );
    } catch (e) {
      return `❌ Lỗi build website: ${e.message}`;
    }
  }

  // [Báo giá] [tên] [ngành]
  const quoteMatch = t.match(/\[Báo giá\]\s*(.+)/i);
  if (quoteMatch) {
    return generateQuote(quoteMatch[1].trim());
  }

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

  // [CRM] xem
  if (/\[CRM\]\s*xem/i.test(t)) {
    try {
      const clients = await getClients();
      if (!clients.length) return '📋 Chưa có khách hàng nào trong CRM.';
      const totalRevenue = clients.reduce((s, c) => s + c.price, 0);
      const totalPaid = clients.reduce((s, c) => s + c.paid, 0);
      const lines = clients.slice(0, 10).map((c, i) =>
        `${i + 1}. *${c.name}* — ${c.package || '?'} — ${c.status || '?'} — ${c.price ? (c.price/1e6).toFixed(0)+'tr' : '?'}`
      );
      return (
        `📊 *CRM — Khách hàng*\n\n` +
        lines.join('\n') +
        `\n\n💰 Tổng HĐ: ${(totalRevenue/1e6).toFixed(0)} triệu | Đã thu: ${(totalPaid/1e6).toFixed(0)} triệu\n` +
        `🌐 Chi tiết: trongletour360.net/admin-crm.html`
      );
    } catch (e) {
      return `❌ Lỗi CRM: ${e.message}`;
    }
  }

  // [Brief] [tên khách]
  const briefMatch = t.match(/\[Brief\]\s*(.+)/i);
  if (briefMatch) {
    return generateShotBrief(briefMatch[1].trim());
  }

  // [FB] đăng: [nội dung]
  const fbMatch = t.match(/\[FB\]\s*đăng:\s*(.+)/is);
  if (fbMatch) {
    try {
      const res = await fetch('https://trongletour360.net/api/facebook-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fbMatch[1].trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return `✅ Đã đăng lên Facebook Page!\nPost ID: ${data.postId}`;
    } catch (e) {
      return `❌ Lỗi đăng Facebook: ${e.message}\n\nKiểm tra FB_PAGE_TOKEN trong Vercel env.`;
    }
  }

  // fallback — Claude AI response
  try {
    return await askClaude(t);
  } catch (e) {
    return `❌ Lỗi AI: ${e.message}\n\nNhắn /help để xem lệnh.`;
  }
}

function generateQuote(input) {
  const lines = [
    `💼 *Báo giá — TrongLeTour360*\n`,
    `Khách: *${input}*\n`,
    `📦 *Gói A — Landing Page* (3–5 triệu)`,
    `• 1 trang duy nhất · Mobile-first · SEO cơ bản`,
    `• Chatbot thu lead · Bàn giao 5–7 ngày\n`,
    `📦 *Gói B — Website Chuyên Nghiệp* (8–15 triệu)`,
    `• 5–10 trang · Blog · CMS đơn giản`,
    `• Chatbot nâng cao · Schema SEO · Bàn giao 7–14 ngày\n`,
    `📦 *Gói C — Full System* (25–50 triệu)`,
    `• Không giới hạn trang · Booking tự động · Notion CMS`,
    `• Chatbot AI · Bảo trì 12 tháng · Bàn giao 14–21 ngày\n`,
    `➕ *Add-on:*`,
    `• Chụp 360° BĐS: 3–8 triệu/căn`,
    `• Bảo trì hàng tháng: 1.5–3 triệu/tháng\n`,
    `_Copy tin nhắn này gửi khách qua Zalo ngay!_`,
  ];
  return lines.join('\n');
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

function generateShotBrief(clientName) {
  const week = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  return (
    `📋 *Shot Brief tuần ${week} — ${clientName}*\n\n` +
    `*Video 1 — Buổi sáng* (TikTok viral)\n` +
    `🎬 Cảnh 1: Cửa sổ phòng · sương mù sáng sớm · 8 giây\n` +
    `🎬 Cảnh 2: Tay bưng ly cà phê nhìn ra vườn · 5 giây\n` +
    `🎬 Cảnh 3: Toàn cảnh không gian chính · ánh sáng tự nhiên · 7 giây\n` +
    `📌 Quay đứng (9:16) · không rung · mở hết rèm\n\n` +
    `*Video 2 — Tour phòng* (YouTube + Facebook)\n` +
    `🎬 Walk-through từ cửa vào → phòng ngủ → toilet · 30 giây\n` +
    `📌 Quay ngang (16:9) · đi chậm · mở hết đèn\n\n` +
    `*Ảnh tĩnh* (Instagram feed)\n` +
    `📸 5–8 ảnh: góc phòng đẹp · chi tiết nội thất · view ngoài cửa sổ\n\n` +
    `⏱ Thời gian quay: ~25 phút\n` +
    `📁 Upload vào: Desktop\\footage\\raw\\${clientName.toLowerCase().replace(/\s+/g, '-')}\\\n\n` +
    `_Sau khi upload xong → nhắn: [Video] xử lý: ${clientName}_`
  );
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
