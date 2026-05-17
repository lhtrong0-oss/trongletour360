export const config = { runtime: "edge" };

const NOTION_VER = "2022-06-28";

function parseDate(str) {
  str = str.trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const d = parseInt(m[1]), mo = parseInt(m[2]);
    const y = m[3] ? (parseInt(m[3]) < 100 ? 2000 + parseInt(m[3]) : parseInt(m[3])) : 2026;
    return new Date(y, mo - 1, d);
  }
  return new Date(str);
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function toVN(iso) {
  const [, m, d] = iso.split('-');
  return `${parseInt(d)}/${parseInt(m)}`;
}

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { checkin, nights = 1 } = await req.json();
  const TOKEN = process.env.NOTION_TOKEN;
  const DB = process.env.NOTION_BOOKING_DB_ID;

  if (!TOKEN || !DB) return new Response(JSON.stringify({ available: true, reason: 'no_config' }), { headers: CORS });

  try {
    const checkinDate = parseDate(checkin);
    const checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkoutDate.getDate() + parseInt(nights));
    const checkinISO = toISO(checkinDate);
    const checkoutISO = toISO(checkoutDate);

    const res = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Notion-Version': NOTION_VER },
      body: JSON.stringify({
        filter: {
          and: [
            { property: 'Trạng thái', select: { does_not_equal: '❌ Đã hủy' } },
            { property: 'Check-in', date: { before: checkoutISO } },
            { property: 'Check-out', date: { after: checkinISO } },
          ]
        }
      }),
    });

    const data = await res.json();
    const conflicts = data.results || [];

    if (conflicts.length === 0) {
      return new Response(JSON.stringify({
        available: true,
        checkin: checkinISO, checkout: checkoutISO,
        checkinVN: toVN(checkinISO), checkoutVN: toVN(checkoutISO),
        nights: parseInt(nights),
      }), { headers: CORS });
    }

    const latestCheckout = conflicts.reduce((latest, b) => {
      const co = b.properties?.['Check-out']?.date?.start || '';
      return co > latest ? co : latest;
    }, checkinISO);

    return new Response(JSON.stringify({
      available: false,
      checkin: checkinISO, checkout: checkoutISO,
      nextISO: latestCheckout, nextVN: toVN(latestCheckout),
    }), { headers: CORS });

  } catch {
    return new Response(JSON.stringify({ available: true, reason: 'error' }), { headers: CORS });
  }
}
