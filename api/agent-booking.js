// api/agent-booking.js — Quản lý booking Ngọc Sinh Cát qua Notion
// Tên cột thật (lấy từ DB 2026-05-19):
// Tên khách (title) | Check-in (date) | Check-out (date)
// SĐT / Zalo (phone) | Số đêm (number) | Phòng (select) | Ghi chú (rich_text)
// Trạng thái: "⏳ Chờ xác nhận" | "✅ Đã xác nhận" | "❌ Đã hủy"

const NOTION_API = 'https://api.notion.com/v1';
const BOOKING_DB = '564c93c235914f77814099d6b9c5ce88';

async function notionRequest(method, path, body) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Notion API error: ${res.status}`);
  return data;
}

function parseDate(str) {
  // "25/05" → "2026-05-25"
  const parts = str.split('/');
  if (parts.length === 2) return `2026-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  return str;
}

function formatBookingRow(page) {
  const p = page.properties;
  const name = p['Tên khách']?.title?.[0]?.plain_text || '(Không tên)';
  const phone = p['SĐT / Zalo']?.phone_number || '—';
  const checkin = p['Check-in']?.date?.start || '—';
  const checkout = p['Check-out']?.date?.start || '—';
  const nights = p['Số đêm']?.number || '—';
  const room = p['Phòng']?.select?.name || '—';
  const status = p['Trạng thái']?.select?.name || '—';
  return `• *${name}* | ${checkin} → ${checkout} | ${nights} đêm | ${room} | SĐT: ${phone} | ${status}`;
}

export async function listBookings() {
  const data = await notionRequest('POST', `/databases/${BOOKING_DB}/query`, {
    filter: {
      property: 'Trạng thái',
      select: { equals: '⏳ Chờ xác nhận' },
    },
    sorts: [{ property: 'Check-in', direction: 'ascending' }],
  });

  if (!data.results?.length) return '📅 Không có booking nào đang chờ xác nhận.';

  const rows = data.results.map(formatBookingRow).join('\n');
  return `📅 *Booking đang chờ xác nhận (${data.results.length}):*\n\n${rows}\n\nDùng \`[Booking] xác nhận: [Tên]\` hoặc \`[Booking] hủy: [Tên]\``;
}

export async function checkAvailability(checkinStr, checkoutStr) {
  const checkin = parseDate(checkinStr);
  const checkout = parseDate(checkoutStr);

  const data = await notionRequest('POST', `/databases/${BOOKING_DB}/query`, {
    filter: {
      and: [
        { property: 'Trạng thái', select: { does_not_equal: '❌ Đã hủy' } },
        {
          and: [
            { property: 'Check-in', date: { on_or_before: checkout } },
            { property: 'Check-out', date: { on_or_after: checkin } },
          ],
        },
      ],
    },
  });

  if (!data.results?.length) {
    return `✅ *Phòng trống!*\n\nNgày: ${checkinStr} → ${checkoutStr}\nNgọc Sinh Cát sẵn sàng nhận khách.\n\nLink đặt phòng: https://bonsai-dalat-trangle.vercel.app/templates/ngoc-sinh-cat.html`;
  }

  const conflicts = data.results.map(formatBookingRow).join('\n');
  return `❌ *Phòng đã có booking trong khoảng này:*\n\n${conflicts}\n\nVui lòng chọn ngày khác.`;
}

export async function updateBookingStatus(guestName, action) {
  const data = await notionRequest('POST', `/databases/${BOOKING_DB}/query`, {
    filter: {
      property: 'Tên khách',
      title: { contains: guestName },
    },
  });

  if (!data.results?.length) {
    return `❌ Không tìm thấy booking của "${guestName}". Kiểm tra lại tên nhé Trọng.`;
  }

  const page = data.results[0];
  const p = page.properties;
  const currentName = p['Tên khách']?.title?.[0]?.plain_text || guestName;
  const checkin = p['Check-in']?.date?.start || '—';
  const checkout = p['Check-out']?.date?.start || '—';

  const newStatus = action === 'confirmed' ? '✅ Đã xác nhận' : '❌ Đã hủy';
  const emoji = action === 'confirmed' ? '✅' : '❌';

  await notionRequest('PATCH', `/pages/${page.id}`, {
    properties: {
      'Trạng thái': { select: { name: newStatus } },
    },
  });

  return `${emoji} Đã cập nhật booking!\n\n👤 Khách: *${currentName}*\n📅 ${checkin} → ${checkout}\n📌 Trạng thái: ${newStatus}`;
}
