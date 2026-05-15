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

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
}
