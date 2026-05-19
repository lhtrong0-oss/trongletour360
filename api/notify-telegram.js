// Shared utility — gửi Telegram notification về cho Trọng
// Dùng trong save-booking, save-lead, và bất kỳ API nào cần thông báo

export async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const userId = process.env.TELEGRAM_USER_ID;
  if (!token || !userId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: userId,
      text,
      parse_mode: 'Markdown',
    }),
  }).catch(() => {});
}
