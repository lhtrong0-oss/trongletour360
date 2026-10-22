// Đồng bộ thông tin liên hệ (cms/site.json) vào mọi trang HTML + kiểm tra lỗi trước khi deploy.
//   node scripts/sync-site.mjs          → chỉ kiểm tra, báo trang nào lệch / link hỏng (không sửa)
//   node scripts/sync-site.mjs --apply  → sửa luôn các trang lệch
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'cms/site.json'), 'utf-8'));
const apply = process.argv.includes('--apply');
const digits = site.phone.replace(/\D/g, '');

// Khối "Kết nối" chuẩn ở footer — 1 nguồn duy nhất cho mọi trang
const ext = 'target="_blank" rel="noopener noreferrer"';
const ketNoi = [
  `<li><a href="${site.zalo}" ${ext}>Zalo</a></li>`,
  site.facebook && `<li><a href="${site.facebook}" ${ext}>Facebook</a></li>`,
  site.tiktok && `<li><a href="${site.tiktok}" ${ext}>TikTok</a></li>`,
  site.youtube && `<li><a href="${site.youtube}" ${ext}>YouTube</a></li>`,
  `<li><a href="tel:${digits}">${site.phone}</a></li>`,
  `<li><a href="lien-he.html">Liên hệ</a></li>`,
].filter(Boolean).join('\n          ');
const KET_NOI_RE = /<h4>Kết nối<\/h4>\s*<ul>[\s\S]*?<\/ul>/;
const ketNoiBlock = `<h4>Kết nối</h4>\n        <ul>\n          ${ketNoi}\n        </ul>`;

// Trang riêng của khách (vd: homestay có Facebook/TikTok riêng) → không áp thông tin liên hệ của TrongLeTour360
const pages = readdirSync(root).filter(f => f.endsWith('.html') && !(site.trangRieng || []).includes(f));
const issues = [];
let changed = 0;

for (const page of pages) {
  const file = join(root, page);
  const before = readFileSync(file, 'utf-8');
  let html = before;
  const note = msg => issues.push(`${page}: ${msg}`);

  if (KET_NOI_RE.test(html)) html = html.replace(KET_NOI_RE, ketNoiBlock);

  // Link mạng xã hội / SĐT cũ còn sót ở chỗ khác trong trang
  html = html.replace(/https?:\/\/(www\.)?facebook\.com\/(?!sharer|share|dialog|tr\b)[A-Za-z0-9._\-\/]+/g,
    m => (m.includes('facebook.com/le.trong') || !site.facebook ? m : site.facebook));
  for (const m of html.matchAll(/(?:tel:|zalo\.me\/)(\+?\d{9,12})/g))
    if (m[1].replace(/^\+84/, '0') !== digits) note(`số điện thoại khác cms (${m[0]})`);

  // Giá làm website khởi điểm phải đúng cms/site.json (câu dạng "website ... từ X.000.000đ")
  if (site.giaWebTu)
    // cùng một câu (không qua dấu chấm) và không phải combo (dấu +)
    for (const m of html.matchAll(/(?:website|web)[^<>.+]{0,120}?từ\s*(?:<strong[^>]*>)?\s*(\d{1,3}(?:\.\d{3})+đ)/gi))
      if (m[1] !== site.giaWebTu) note(`giá web ghi ${m[1]}, cms là ${site.giaWebTu}`);

  // Mọi trang (trừ trang quản trị / trang đặt phòng riêng) phải có thanh Gọi · Zalo · Báo giá
  if (!['admin-crm.html', 'dat-phong-ngoc-sinh-cat.html'].includes(page) && !html.includes('js/convert.js'))
    note('thiếu <script src="js/convert.js" defer> (thanh Gọi · Zalo · Báo giá)');

  // Link nội bộ trỏ tới file không tồn tại
  for (const m of html.matchAll(/href="\/?([a-z0-9\-]+\.html)(?:#[^"]*)?"/gi))
    if (!existsSync(join(root, m[1]))) note(`link hỏng → ${m[1]}`);

  if (html !== before) {
    changed++;
    if (apply) writeFileSync(file, html, 'utf-8');
    console.log(`${apply ? '✏️  đã sửa' : '⚠️  cần sửa'}: ${page}`);
  }
}

for (const i of [...new Set(issues)]) console.log(`❗ ${i}`);
console.log(`\n${pages.length} trang · ${changed} trang ${apply ? 'đã cập nhật' : 'lệch với cms/site.json'} · ${new Set(issues).size} lỗi cần xem`);
if (!apply && changed) console.log('→ Chạy lại với --apply để sửa.');
process.exitCode = !apply && (changed || issues.length) ? 1 : 0;
