export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { name, phone, interest } = await req.json();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const LEADS_DB = process.env.NOTION_LEADS_DB_ID;

  if (!NOTION_TOKEN || !LEADS_DB) {
    return new Response(JSON.stringify({ ok: false, reason: "config" }), { status: 200 });
  }

  try {
    await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: LEADS_DB },
        properties: {
          "Tên khách": { title: [{ text: { content: name || "Khách hàng" } }] },
          "SĐT": { rich_text: [{ text: { content: phone || "" } }] },
          "Quan tâm": { rich_text: [{ text: { content: interest || "" } }] },
          "Nguồn": { select: { name: "AI Chatbot" } },
          "Trạng thái": { select: { name: "Mới" } },
        },
      }),
    });

    // Email notify qua Resend
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TrongLeTour360 <onboarding@resend.dev>",
          to: ["lhtrong0@gmail.com"],
          subject: `🔔 Lead mới: ${name || "Khách hàng"} — TrongLeTour360`,
          html: `<h2>Lead mới từ website</h2>
<p><strong>Tên:</strong> ${name || "—"}</p>
<p><strong>SĐT/Zalo:</strong> ${phone || "—"}</p>
<p><strong>Quan tâm:</strong> ${interest || "—"}</p>
<p><strong>Nguồn:</strong> AI Chatbot trongletour360.net</p>
<hr>
<p>👉 Liên hệ lại trong <strong>30 phút</strong></p>`,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
}
