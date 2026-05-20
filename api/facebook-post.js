// api/facebook-post.js — Tự động đăng bài lên Facebook Page
// POST body: { message, imageUrl?, scheduledTime? }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, imageUrl, scheduledTime } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const pageId = process.env.FB_PAGE_ID;
  const pageToken = process.env.FB_PAGE_TOKEN;

  if (!pageId || !pageToken) {
    return res.status(500).json({
      error: 'Chưa setup FB_PAGE_ID và FB_PAGE_TOKEN. Xem hướng dẫn: trongletour360.net/admin-crm.html'
    });
  }

  try {
    let endpoint, body;

    if (imageUrl) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = { url: imageUrl, caption: message, access_token: pageToken };
    } else {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = { message, access_token: pageToken };
    }

    if (scheduledTime) {
      body.scheduled_publish_time = Math.floor(new Date(scheduledTime).getTime() / 1000);
      body.published = false;
    }

    const fbRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await fbRes.json();
    if (!fbRes.ok) throw new Error(data.error?.message || 'Facebook API error');

    res.json({ ok: true, postId: data.id });
  } catch (err) {
    console.error('Facebook post error:', err);
    res.status(500).json({ error: err.message });
  }
}
