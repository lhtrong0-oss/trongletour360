// api/telegram.js — Webhook nhận message từ Telegram
// Chỉ Trọng (TELEGRAM_USER_ID) mới dùng được

import { processCommand } from './agent-core.js';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text, options = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...options,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const { message, callback_query } = req.body;
    const msg = message || callback_query?.message;
    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const userId = (message?.from?.id || callback_query?.from?.id)?.toString();
    const text = message?.text || callback_query?.data || '';

    // Security: chỉ Trọng dùng được
    if (userId !== process.env.TELEGRAM_USER_ID) {
      await sendMessage(chatId, '⛔ Không có quyền truy cập.');
      return res.status(200).json({ ok: true });
    }

    // Báo đang xử lý
    await sendMessage(chatId, '⏳ Đang xử lý...');

    // Xử lý lệnh
    const result = await processCommand(text, chatId);

    // Gửi kết quả
    await sendMessage(chatId, result);

  } catch (err) {
    console.error('Telegram webhook error:', err);
    const chatId = req.body?.message?.chat?.id;
    if (chatId) {
      await sendMessage(chatId, `❌ Lỗi: ${err.message}`);
    }
  }

  res.status(200).json({ ok: true });
}
