// Báo Bing (và các công cụ dùng IndexNow) cập nhật mọi URL trong sitemap — chạy sau khi push bài mới:
//   npm run indexnow
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyFile = readdirSync(root).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('Không thấy file khóa IndexNow (32 ký tự hex .txt) ở thư mục gốc');
const key = keyFile.slice(0, -4);
const urlList = [...readFileSync(join(root, 'sitemap.xml'), 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
urlList.push('https://trongletour360.net/llms.txt');
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: 'trongletour360.net', key, keyLocation: `https://trongletour360.net/${key}.txt`, urlList }),
});
console.log(`IndexNow: ${res.status} ${res.status === 200 || res.status === 202 ? '✓ đã gửi' : '✗'} — ${urlList.length} URL`);
