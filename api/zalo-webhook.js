// api/zalo-webhook.js — Zalo OA AI Chatbot
// Khách nhắn Zalo OA → AI Claude tự trả lời → lưu lead → báo Trọng Telegram

const ZALO_API = 'https://openapi.zalo.me/v2.0/oa';

async function sendZaloMessage(userId, text) {
  await fetch(`${ZALO_API}/message`, {
    method: 'POST',
    headers: {
      'access_token': process.env.ZALO_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text },
    }),
  });
}

async function getAIResponse(text, userName) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `Bạn là trợ lý tư vấn của TrongLeTour360 — công ty chuyên dịch vụ số cho homestay & cơ sở lưu trú tại Đà Lạt.
Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. KHÔNG dùng Markdown.

Dịch vụ:
- Website chuyên nghiệp: 8–35 triệu (bàn giao 48 giờ)
- Video content + đăng mạng xã hội tự động: 3–6 triệu/tháng
- Chatbot Zalo AI tự động 24/7: 8–15 triệu setup
- Tour 360° ảo cho homestay/BĐS: 3–8 triệu/căn
- Chụp ảnh chuyên nghiệp

Nếu khách hỏi giá → báo range, mời đặt lịch tư vấn miễn phí.
Nếu khách muốn gặp → xin số điện thoại và thời gian rảnh.
SĐT Trọng: 0785 925 998 — tư vấn miễn phí 8h–21h hàng ngày.`,
      messages: [{ role: 'user', content: `[Từ ${userName}]: ${text}` }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || 'Xin chào! Bạn vui lòng gọi 0785 925 998 để được tư vấn nhé.';
}

async function notifyTelegram(message) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_USER_ID,
      text: message,
      parse_mode: 'Markdown',
    }),
  });
}

async function saveLead(name, message, userId) {
  await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_LEADS_DB_ID },
      properties: {
        'Tên': { title: [{ text: { content: name } }] },
        'Nguồn': { select: { name: 'Zalo OA' } },
        'Tin nhắn': { rich_text: [{ text: { content: message.slice(0, 500) } }] },
        'Zalo ID': { rich_text: [{ text: { content: userId } }] },
        'Trạng thái': { select: { name: 'Mới' } },
      },
    }),
  });
}

function isLeadMessage(text) {
  return /\d{9,10}/.test(text) ||
    /homestay|phòng|tour|website|video|giá|bao nhiêu|tư vấn|liên hệ|thuê|đặt/i.test(text);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send(req.query.challenge || 'ok');
  }
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const event = req.body;

    if (event.event_name === 'user_send_text') {
      const userId = event.sender?.id;
      const userName = event.sender?.display_name || 'Khách';
      const text = event.message?.text || '';

      const aiReply = await getAIResponse(text, userName);
      await sendZaloMessage(userId, aiReply);

      if (isLeadMessage(text)) {
        await saveLead(userName, text, userId);
        await notifyTelegram(
          `📱 *Zalo Lead mới!*\n👤 ${userName}\n💬 "${text.slice(0, 100)}"\n\n_AI đã trả lời. Đã lưu Notion._`
        );
      }
    }

    if (event.event_name === 'follow') {
      const userId = event.follower?.id;
      const userName = event.follower?.display_name || 'Bạn';
      await sendZaloMessage(
        userId,
        `Xin chào ${userName}! 👋 Cảm ơn bạn đã quan tâm đến TrongLeTour360.\n\n` +
        `Chúng tôi chuyên dịch vụ số cho homestay & cơ sở lưu trú Đà Lạt:\n` +
        `🌐 Website đẹp chuẩn SEO — bàn giao 48h\n` +
        `📹 Video content + tự đăng 4 nền tảng\n` +
        `🤖 Chatbot Zalo AI tự động 24/7\n` +
        `📸 Tour 360° ảo chuyên nghiệp\n\n` +
        `Bạn cần tư vấn dịch vụ nào? Nhắn tin để được hỗ trợ miễn phí nhé!`
      );
    }
  } catch (err) {
    console.error('Zalo webhook error:', err);
  }

  res.status(200).json({ ok: true });
}
