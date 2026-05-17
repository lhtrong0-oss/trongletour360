export const config = { runtime: "edge" };

export default async function handler(req) {
  const token = process.env.NOTION_TOKEN;
  const dbId  = process.env.NOTION_LEADS_DB_ID;

  const info = {
    token_exists: !!token,
    token_prefix: token ? token.substring(0, 8) : "MISSING",
    db_id: dbId || "MISSING",
  };

  // Thử ghi test vào Notion
  let notionResult = null;
  if (token && dbId) {
    try {
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            "Tên khách": { title: [{ text: { content: "DEBUG TEST — xóa sau" } }] },
            "SĐT / Zalo": { phone_number: "0000000001" },
            "Ngách": { select: { name: "Khác" } },
            "Nội dung hỏi": { rich_text: [{ text: { content: "Debug test" } }] },
            "Trạng thái": { select: { name: "🆕 Mới" } },
          },
        }),
      });
      const d = await res.json();
      notionResult = d.id ? { ok: true, id: d.id } : { ok: false, code: d.code, msg: d.message };
    } catch (e) {
      notionResult = { ok: false, error: e.message };
    }
  }

  return new Response(JSON.stringify({ env: info, notion: notionResult }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
