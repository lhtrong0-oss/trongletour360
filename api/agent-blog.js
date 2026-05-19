// api/agent-blog.js — Viết bài blog SEO + push GitHub + deploy Vercel
// Gọi Claude API để sinh nội dung, push qua GitHub API

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

export async function writeBlog(topic) {
  const slug = slugify(topic);
  const filename = `${slug}.html`;
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Bạn là copywriter SEO chuyên nghiệp cho TrongLeTour360 — web agency tại Đà Lạt.

Viết bài blog HTML HOÀN CHỈNH về chủ đề: "${topic}"

YÊU CẦU BẮT BUỘC:
- File HTML hoàn chỉnh từ <!DOCTYPE html> đến </html>
- Title tag: chứa từ khóa chính + "Đà Lạt" + "2026"
- Meta description: 150-160 ký tự, chứa từ khóa
- H1: chứa từ khóa chính
- H2, H3: chứa từ khóa phụ liên quan đến Đà Lạt
- Nội dung: >800 từ, thực tế, hữu ích, KHÔNG chung chung
- Schema BlogPosting JSON-LD đầy đủ với datePublished: "${today}"
- FAQPage schema với 3-4 câu hỏi thực tế
- Internal links về: /homestay.html, /dich-vu.html, /lien-he.html
- CTA box: nhắn Zalo 0785 925 998
- Design: giống trongletour360.net (dark bg #0B0F07, gold #D4A853, font Italiana + Jost)
- Nav: logo TrongLeTour360, link về /blog.html
- Footer: © 2026 TrongLeTour360

Canonical URL: https://trongletour360.net/${filename}
og:image: https://res.cloudinary.com/dznkgkksu/image/upload/w_1200,h_630,c_fill,g_center/tour360/hero.jpg

Trả về DUY NHẤT nội dung HTML, không giải thích gì thêm.`;

  const html = await callClaude(prompt);

  // Chờ 35 giây cho Vercel deploy
  const liveUrl = await pushFile({
    filePath: filename,
    content: html,
    commitMessage: `[Agent] Blog: ${topic}`,
  });

  // Cập nhật sitemap
  await updateSitemap(filename, today);

  return { filename, liveUrl };
}

async function updateSitemap(newFilename, today) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/lhtrong0-oss/trongletour360/contents/sitemap.xml`,
      {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    const data = await res.json();
    const currentContent = Buffer.from(data.content, 'base64').toString('utf-8');

    const newEntry = `  <url>
    <loc>https://trongletour360.net/${newFilename}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

    const updatedContent = currentContent.replace('</urlset>', `${newEntry}\n</urlset>`);

    await fetch(
      `https://api.github.com/repos/lhtrong0-oss/trongletour360/contents/sitemap.xml`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `[Agent] Update sitemap: add ${newFilename}`,
          content: Buffer.from(updatedContent).toString('base64'),
          sha: data.sha,
        }),
      }
    );
  } catch (e) {
    console.error('Sitemap update failed:', e.message);
  }
}
