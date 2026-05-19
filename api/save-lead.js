export const config = { runtime: "edge" };

import { notifyTelegram } from './notify-telegram.js';

const NOTION_VER = "2022-06-28";

function detectNgach(text = "") {
  const t = text.toLowerCase();
  if (/web|website|thiết kế|gói a|gói b|gói c/.test(t)) return "Thiết kế website";
  if (/tour|du lịch|tham quan|đà lạt|cung đường/.test(t)) return "Tour Đà Lạt";
  if (/homestay|phòng|nghỉ|villa|ngủ|ở/.test(t)) return "Homestay";
  if (/bonsai|cây cảnh|cây/.test(t)) return "Bonsai";
  if (/360|chụp|ảnh|quay|bất động sản|bds/.test(t)) return "Chụp 360°";
  return "Khác";
}

async function findByPhone(token, dbId, phone) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": NOTION_VER },
    body: JSON.stringify({ filter: { property: "SĐT / Zalo", phone_number: { equals: phone } }, page_size: 1 }),
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { name, phone, interest, checkin, checkout, nights } = await req.json();
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const LEADS_DB = process.env.NOTION_LEADS_DB_ID;

  if (!NOTION_TOKEN || !LEADS_DB) {
    return new Response(JSON.stringify({ ok: false, reason: "config" }), { status: 200 });
  }

  const ngach = detectNgach(interest);

  // Email gửi TRƯỚC — độc lập, không phụ thuộc Notion
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    const ngachLabel = detectNgach(interest);
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TrongLeTour360 <onboarding@resend.dev>",
        to: ["lhtrong0@gmail.com"],
        subject: `🆕 Lead mới: ${name || "Khách"} — ${ngachLabel}`,
        html: `<h2>🆕 Lead mới từ chatbot</h2>
<p><strong>Tên:</strong> ${name || "—"}</p>
<p><strong>SĐT/Zalo:</strong> ${phone || "—"}</p>
<p><strong>Ngách:</strong> ${ngachLabel}</p>
<p><strong>Hỏi về:</strong> ${interest || "—"}</p>
<hr><p>👉 Liên hệ lại trong <strong>30 phút</strong></p>`,
      }),
    }).catch(() => {});
  }

  try {
    // Check duplicate SĐT
    const existing = phone ? await findByPhone(NOTION_TOKEN, LEADS_DB, phone) : null;

    if (existing) {
      // Update — thêm lần hỏi mới vào Nội dung hỏi
      const oldNote = existing.properties?.["Nội dung hỏi"]?.rich_text?.[0]?.text?.content || "";
      const newNote = `${oldNote}\n[Hỏi lại] ${interest || ""}`.trim().slice(0, 2000);
      await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${NOTION_TOKEN}`, "Content-Type": "application/json", "Notion-Version": NOTION_VER },
        body: JSON.stringify({
          properties: {
            "Nội dung hỏi": { rich_text: [{ text: { content: newNote } }] },
            "Trạng thái": { select: { name: "🆕 Mới" } },
          },
        }),
      });
    } else {
      // Tạo mới
      await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${NOTION_TOKEN}`, "Content-Type": "application/json", "Notion-Version": NOTION_VER },
        body: JSON.stringify({
          parent: { database_id: LEADS_DB },
          properties: {
            "Tên khách": { title: [{ text: { content: name || "Khách hàng" } }] },
            "SĐT / Zalo": { phone_number: phone || "" },
            "Ngách": { select: { name: ngach } },
            "Nội dung hỏi": { rich_text: [{ text: { content: interest || "" } }] },
            "Trạng thái": { select: { name: "🆕 Mới" } },
          },
        }),
      });
    }

    // Nếu có booking homestay → ghi vào lịch
    const BOOKING_DB = process.env.NOTION_BOOKING_DB_ID;
    if (checkin && checkout && BOOKING_DB) {
      fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${NOTION_TOKEN}`, "Content-Type": "application/json", "Notion-Version": NOTION_VER },
        body: JSON.stringify({
          parent: { database_id: BOOKING_DB },
          properties: {
            "Tên khách": { title: [{ text: { content: name || "Khách" } }] },
            "SĐT / Zalo": { phone_number: phone || "" },
            "Check-in": { date: { start: checkin } },
            "Check-out": { date: { start: checkout } },
            "Số đêm": { number: parseInt(nights) || 1 },
            "Phòng": { select: { name: "Chưa chọn" } },
            "Trạng thái": { select: { name: "⏳ Chờ xác nhận" } },
            "Ghi chú": { rich_text: [{ text: { content: interest || "" } }] },
          },
        }),
      }).catch(() => {});
    }

    // Telegram notification — báo Trọng ngay lập tức
    notifyTelegram(
      `🔔 *Lead mới từ chatbot!*\n\n` +
      `👤 Tên: *${name || '—'}*\n` +
      `📱 SĐT: ${phone || '—'}\n` +
      `🏷 Ngách: ${ngach}\n` +
      `💬 Hỏi về: ${interest || '—'}\n\n` +
      `⚡ Liên hệ lại trong *1 giờ đầu* — tỉ lệ chốt cao nhất!`
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
}
