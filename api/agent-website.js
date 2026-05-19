// api/agent-website.js — Build demo website cho khách mới qua Telegram
// Trọng nhắn: [KhachMoi] build: Spa Hoa Lan - spa - Đà Lạt
// Claude sinh HTML theo design system → push bonsaidalat → live link

import { pushFile } from './github-push.js';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Mapping ngành → màu sắc + icon + style gợi ý
const INDUSTRY_STYLES = {
  spa: { accent: '#C9A96E', bg: '#0D0D0D', vibe: 'luxury wellness, zen, calming' },
  homestay: { accent: '#8DB87A', bg: '#0B0F07', vibe: 'nature retreat, cozy, mountain' },
  'nhà hàng': { accent: '#D4622A', bg: '#1A0A00', vibe: 'warm, appetizing, Vietnamese cuisine' },
  'quán cà phê': { accent: '#C4A882', bg: '#1C150E', vibe: 'artisan, cozy, specialty coffee' },
  'tiệc cưới': { accent: '#D4A0B5', bg: '#0F0A0D', vibe: 'elegant, romantic, floral' },
  bonsai: { accent: '#7A9E6E', bg: '#070D05', vibe: 'nature, artistic, zen garden' },
  'bất động sản': { accent: '#B8A86E', bg: '#0A0C0F', vibe: 'premium, trustworthy, modern' },
  default: { accent: '#C4A882', bg: '#0B0F07', vibe: 'professional, modern, Vietnamese' },
};

function getStyle(industry = '') {
  const key = Object.keys(INDUSTRY_STYLES).find(k => industry.toLowerCase().includes(k));
  return INDUSTRY_STYLES[key] || INDUSTRY_STYLES.default;
}

async function callClaude(prompt) {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content[0].text;
}

export async function buildWebsite({ name, industry, description, location = 'Đà Lạt' }) {
  const slug = slugify(name);
  const filename = `templates/${slug}.html`;
  const style = getStyle(industry);
  const liveBase = 'https://bonsai-dalat-trangle.vercel.app';

  const prompt = `Bạn là senior frontend developer + copywriter cho TrongLeTour360 — web agency tại Đà Lạt.

Build DEMO website hoàn chỉnh cho khách hàng:
- Tên: "${name}"
- Ngành: "${industry}"
- Mô tả: "${description || 'dịch vụ cao cấp tại Đà Lạt'}"
- Địa điểm: "${location}"

THIẾT KẾ (BẮT BUỘC):
- File HTML hoàn chỉnh từ <!DOCTYPE html> đến </html>
- Dark background: ${style.bg}
- Accent color: ${style.accent}
- Vibe: ${style.vibe}
- Font: Italiana (headings) + Jost (body) từ Google Fonts
- KHÔNG dùng framework — pure HTML + CSS + JS inline
- Mobile-first, responsive

CẤU TRÚC TRANG:
1. Nav: Logo "${name}" + menu (Giới thiệu / Dịch vụ / Liên hệ)
2. Hero: full-screen, gradient overlay, tagline ấn tượng, CTA "Liên hệ ngay"
3. Giới thiệu: 3-4 dòng về ${name}, điểm khác biệt
4. Dịch vụ/Sản phẩm: 3 cards (tự sáng tạo phù hợp ngành ${industry})
5. Tại sao chọn ${name}: 3 điểm mạnh có icon emoji
6. CTA section: nền accent, nút Zalo + số điện thoại giả (0123 456 789)
7. Footer: © 2026 ${name} · Đà Lạt

SEO:
- Title: "${name} — ${industry} ${location} 2026"
- Meta description: 150 ký tự
- Schema: LocalBusiness phù hợp ngành

WATERMARK (thêm vào footer nhỏ):
"Website by TrongLeTour360 · trongletour360.net"

Hình ảnh: dùng https://placehold.co/800x500/${style.bg.replace('#','')}/${style.accent.replace('#','')}?text=${encodeURIComponent(name)} cho placeholder

Trả về DUY NHẤT nội dung HTML, không giải thích.`;

  const html = await callClaude(prompt);

  const liveUrl = await pushFile({
    repo: 'bonsaidalat',
    filePath: filename,
    content: html,
    commitMessage: `[Agent] Demo: ${name} (${industry})`,
  });

  return { filename, liveUrl, name, industry };
}
