export const config = { runtime: "edge" };

const NOTION_VER = "2022-06-28";
const BOOKINGS_DB = "3efe32186a934fe89d9fbb4a0ca251fc";

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { name, phone, email, room, checkin, checkout, guests, note } = await req.json();
  const NOTION_TOKEN = process.env.NOTION_TOKEN;

  // Email notify — gửi TRƯỚC, độc lập
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TrongLeTour360 <onboarding@resend.dev>",
        to: ["lhtrong0@gmail.com"],
        subject: `🏡 Đặt phòng mới: ${name || "Khách"} — ${room || "Chưa chọn phòng"}`,
        html: `<h2>🏡 Đặt phòng mới — Ngọc Sinh Cát</h2>
<p><strong>Họ tên:</strong> ${name || "—"}</p>
<p><strong>SĐT/Zalo:</strong> ${phone || "—"}</p>
<p><strong>Email:</strong> ${email || "—"}</p>
<p><strong>Phòng:</strong> ${room || "—"}</p>
<p><strong>Check-in:</strong> ${checkin || "—"}</p>
<p><strong>Check-out:</strong> ${checkout || "—"}</p>
<p><strong>Số khách:</strong> ${guests || "—"}</p>
<p><strong>Ghi chú:</strong> ${note || "—"}</p>
<hr><p>👉 Xác nhận và liên hệ lại trong <strong>30 phút</strong></p>`,
      }),
    }).catch(() => {});
  }

  if (!NOTION_TOKEN) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const props = {
      "Họ tên": { title: [{ text: { content: name || "Khách" } }] },
      "SĐT / Zalo": { phone_number: phone || "" },
      "Phòng": { select: { name: room || "Home Ngọc Sinh Cát" } },
      "Số khách": { number: parseInt(guests) || 1 },
      "Ghi chú": { rich_text: [{ text: { content: note || "" } }] },
      "Trạng thái": { select: { name: "🆕 Mới" } },
    };
    if (email) props["Email"] = { email };
    if (checkin) props["Check-in"] = { date: { start: checkin } };
    if (checkout) props["Check-out"] = { date: { start: checkout } };

    await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: { Authorization: `Bearer ${NOTION_TOKEN}`, "Content-Type": "application/json", "Notion-Version": NOTION_VER },
      body: JSON.stringify({ parent: { database_id: BOOKINGS_DB }, properties: props }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
}
