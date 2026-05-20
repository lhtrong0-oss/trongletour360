// api/crm-data.js — Client CRM: đọc/ghi danh sách khách hàng từ Notion

const NOTION_VERSION = '2022-06-28';
const DB_CLIENTS = '872ae178-365f-4284-b8f4-1f4fde319833';

async function notionPost(path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

function getProp(page, key, type) {
  const prop = page.properties?.[key];
  if (!prop) return null;
  switch (type) {
    case 'title': return prop.title?.[0]?.text?.content || '';
    case 'select': return prop.select?.name || '';
    case 'number': return prop.number || 0;
    case 'url': return prop.url || '';
    case 'rich_text': return prop.rich_text?.[0]?.text?.content || '';
    case 'date': return prop.date?.start || '';
    default: return null;
  }
}

export async function getClients() {
  const data = await notionPost(`/databases/${DB_CLIENTS}/query`, {
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    page_size: 50,
  });

  return (data.results || []).map(page => ({
    id: page.id,
    name: getProp(page, 'Tên khách hàng', 'title') || getProp(page, 'Name', 'title') || 'Chưa đặt tên',
    package: getProp(page, 'Gói', 'select'),
    status: getProp(page, 'Trạng thái', 'select'),
    industry: getProp(page, 'Lĩnh vực', 'select'),
    price: getProp(page, 'Giá trị HĐ', 'number'),
    paid: getProp(page, 'Đã thu', 'number'),
    demo: getProp(page, 'Link demo', 'url'),
    live: getProp(page, 'Link live', 'url'),
    note: getProp(page, 'Ghi chú', 'rich_text'),
    created: page.created_time?.slice(0, 10),
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const clients = await getClients();
    const totalRevenue = clients.reduce((s, c) => s + c.price, 0);
    const totalPaid = clients.reduce((s, c) => s + c.paid, 0);
    const active = clients.filter(c => c.status && !['Hủy', 'Xong'].includes(c.status)).length;

    res.json({ clients, totalRevenue, totalPaid, active, count: clients.length });
  } catch (err) {
    console.error('CRM error:', err);
    res.status(500).json({ error: err.message });
  }
}
