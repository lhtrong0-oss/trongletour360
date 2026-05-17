/**
 * chatbot.js — TrongLeTour360
 * Trợ lý AI 24/7: quick-reply, thu lead, check lịch homestay, cọc tiền.
 * Load 1 thẻ <script> vào bất kỳ trang nào là hoạt động.
 * Cập nhật nội dung chatbot: sửa trong Notion → không cần động vào file này.
 */
(function () {
  /* ── CSS inject ─────────────────────────────────────── */
  const css = `
    #ai-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 1000;
      width: 52px; height: 52px; border-radius: 50%;
      background: #0B0F07; border: 1px solid #D4A853;
      color: #D4A853; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 0 rgba(212,168,83,.4);
      animation: aipulse 3s infinite;
      transition: transform .2s, background .2s;
    }
    #ai-btn:hover { transform: scale(1.1); background: #141a10; }
    @keyframes aipulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(212,168,83,.35); }
      50%      { box-shadow: 0 0 0 12px rgba(212,168,83,0); }
    }
    #ai-btn svg { transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
    #ai-btn.open svg { transform: rotate(45deg); }

    #ai-panel {
      position: fixed; bottom: 90px; right: 28px; z-index: 1000;
      width: 360px; height: 520px;
      background: #0a0e07; border: 1px solid rgba(212,168,83,.2);
      display: flex; flex-direction: column;
      box-shadow: 0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(212,168,83,.06);
      transform-origin: bottom right;
      transform: scale(.92) translateY(12px);
      opacity: 0; pointer-events: none;
      transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s;
    }
    #ai-panel.open { transform: none; opacity: 1; pointer-events: all; }

    .ai-header {
      padding: 16px 18px; border-bottom: 1px solid rgba(212,168,83,.12);
      display: flex; align-items: center; gap: 12px; flex-shrink: 0;
      background: #0d1209;
    }
    .ai-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1px solid rgba(212,168,83,.3); background: rgba(212,168,83,.08);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Italiana', serif; font-size: 15px; color: #D4A853; flex-shrink: 0;
    }
    .ai-hinfo { flex: 1; }
    .ai-hname { font-size: 13px; color: #F0EAD6; font-weight: 400; letter-spacing: .03em; }
    .ai-hstatus {
      font-size: 11px; color: #6db56a; display: flex; align-items: center;
      gap: 5px; margin-top: 2px;
    }
    .ai-hstatus::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: #6db56a; flex-shrink: 0;
    }
    #ai-close {
      background: none; border: none; color: #6b7280;
      cursor: pointer; font-size: 20px; line-height: 1;
      padding: 4px 6px; transition: color .2s;
    }
    #ai-close:hover { color: #F0EAD6; }

    #ai-msgs {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth;
    }
    #ai-msgs::-webkit-scrollbar { width: 3px; }
    #ai-msgs::-webkit-scrollbar-track { background: transparent; }
    #ai-msgs::-webkit-scrollbar-thumb { background: rgba(212,168,83,.2); border-radius: 4px; }

    .ai-msg { display: flex; flex-direction: column; max-width: 86%; animation: aiMsgIn .3s cubic-bezier(.34,1.56,.64,1); }
    @keyframes aiMsgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .ai-msg.ai  { align-self: flex-start; }
    .ai-msg.user { align-self: flex-end; }
    .ai-msg-bubble {
      padding: 10px 14px; font-size: 13.5px; font-weight: 300;
      line-height: 1.65; border-radius: 2px; white-space: pre-wrap;
    }
    .ai-msg.ai  .ai-msg-bubble { background: #141a10; color: #F0EAD6; border: 1px solid rgba(212,168,83,.1); }
    .ai-msg.user .ai-msg-bubble { background: #D4A853; color: #0B0F07; font-weight: 400; }
    .ai-msg-time { font-size: 10px; color: #6b7280; margin-top: 4px; letter-spacing: .05em; }
    .ai-msg.user .ai-msg-time { text-align: right; }

    .ai-typing { display: flex; gap: 5px; align-items: center; padding: 12px 14px; }
    .ai-typing span {
      width: 5px; height: 5px; border-radius: 50%; background: rgba(212,168,83,.5);
      animation: aiDot 1.4s ease-in-out infinite;
    }
    .ai-typing span:nth-child(2) { animation-delay: .2s; }
    .ai-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes aiDot { 0%,80%,100% { transform: scale(.7); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }

    .ai-lead-form {
      margin: 4px 0; padding: 14px;
      background: rgba(212,168,83,.06); border: 1px solid rgba(212,168,83,.2);
    }
    .ai-lead-form p { font-size: 12px; color: #6b7280; margin-bottom: 10px; letter-spacing: .04em; }
    .ai-lead-inp {
      width: 100%; background: #0B0F07; border: 1px solid rgba(212,168,83,.2);
      color: #F0EAD6; font-family: 'Jost', sans-serif; font-size: 13px;
      padding: 9px 12px; margin-bottom: 8px; outline: none; box-sizing: border-box;
      transition: border-color .2s;
    }
    .ai-lead-inp:focus { border-color: #D4A853; }
    .ai-lead-inp::placeholder { color: #6b7280; }
    .ai-lead-submit {
      width: 100%; padding: 10px; background: #D4A853; color: #0B0F07;
      border: none; font-family: 'Jost', sans-serif; font-size: 12px;
      font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
      cursor: pointer; transition: background .2s;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
    }
    .ai-lead-submit:hover { background: #c4973d; }
    .ai-decline {
      width: 100%; margin-top: 6px; padding: 8px; background: transparent;
      border: 1px solid rgba(240,234,214,.15); color: #6b7280;
      font-family: 'Jost', sans-serif; font-size: 11px; letter-spacing: .08em;
      cursor: pointer; transition: all .2s;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
    }
    .ai-decline:hover { border-color: rgba(240,234,214,.35); color: #F0EAD6; }

    .ai-quick-replies { display: flex; flex-wrap: wrap; gap: 7px; padding: 4px 2px 2px; }
    .ai-qr-btn {
      background: transparent; border: 1px solid rgba(212,168,83,.3);
      color: rgba(212,168,83,.7); font-family: 'Jost', sans-serif; font-size: 11.5px;
      padding: 6px 13px; border-radius: 20px; cursor: pointer;
      transition: all .2s; letter-spacing: .04em;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
    }
    .ai-qr-btn:hover { background: rgba(212,168,83,.1); border-color: #D4A853; color: #D4A853; }

    #ai-footer {
      padding: 12px 14px; border-top: 1px solid rgba(212,168,83,.12);
      display: flex; gap: 10px; align-items: center; flex-shrink: 0; background: #0d1209;
    }
    #ai-input {
      flex: 1; background: #0B0F07; border: 1px solid rgba(212,168,83,.18);
      color: #F0EAD6; font-family: 'Jost', sans-serif; font-size: 13px;
      padding: 10px 14px; outline: none; transition: border-color .2s;
    }
    #ai-input:focus { border-color: rgba(212,168,83,.5); }
    #ai-input::placeholder { color: #6b7280; font-size: 12.5px; }
    #ai-send {
      width: 40px; height: 40px; background: #D4A853; border: none;
      color: #0B0F07; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: background .2s, transform .15s;
    }
    #ai-send:hover { background: #c4973d; transform: translateX(2px); }
    #ai-send:disabled { background: #141a10; color: #6b7280; transform: none; cursor: default; }

    @media (max-width: 480px) {
      #ai-panel { width: calc(100vw - 32px); right: 16px; bottom: 80px; }
      #ai-btn   { right: 16px; bottom: 16px; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── Khởi động sau khi DOM sẵn sàng ────────────────── */
  function init() {
    const aiBtn   = document.getElementById('ai-btn');
    const aiPanel = document.getElementById('ai-panel');
    const aiClose = document.getElementById('ai-close');
    const aiMsgs  = document.getElementById('ai-msgs');
    const aiInput = document.getElementById('ai-input');
    const aiSend  = document.getElementById('ai-send');

    if (!aiBtn || !aiPanel) return; // trang không có widget → bỏ qua

    let chatHistory  = [];
    let isStreaming  = false;
    let contactAsked = false;
    let chosenTopic  = '';
    let pendingBooking = null;

    const now = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    function addMsg(role, text) {
      const wrap = document.createElement('div');
      wrap.className = `ai-msg ${role}`;
      wrap.innerHTML = `<div class="ai-msg-bubble"></div><div class="ai-msg-time">${now()}</div>`;
      const bubble = wrap.querySelector('.ai-msg-bubble');
      bubble.textContent = text;
      aiMsgs.appendChild(wrap);
      aiMsgs.scrollTop = aiMsgs.scrollHeight;
      return bubble;
    }

    function addTyping() {
      const wrap = document.createElement('div');
      wrap.className = 'ai-msg ai'; wrap.id = 'ai-typing';
      wrap.innerHTML = '<div class="ai-msg-bubble ai-typing"><span></span><span></span><span></span></div>';
      aiMsgs.appendChild(wrap);
      aiMsgs.scrollTop = aiMsgs.scrollHeight;
      return wrap;
    }

    function addQuickReplies(choices) {
      const wrap = document.createElement('div');
      wrap.className = 'ai-quick-replies';
      choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'ai-qr-btn';
        btn.textContent = c;
        btn.addEventListener('click', () => { wrap.remove(); sendMessage(c); });
        wrap.appendChild(btn);
      });
      aiMsgs.appendChild(wrap);
      aiMsgs.scrollTop = aiMsgs.scrollHeight;
    }

    async function checkAvailability(date, nights) {
      const bubble = addMsg('ai', '🔍 Đang kiểm tra lịch phòng...');
      try {
        const res = await fetch('/api/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkin: date, nights }),
        });
        const d = await res.json();
        if (d.available) {
          bubble.textContent = `✅ Ngày ${d.checkinVN} còn phòng! Check-in: ${d.checkinVN}, check-out: ${d.checkoutVN} (${nights} đêm). Anh/chị để lại thông tin để Trọng xác nhận giữ phòng nhé?`;
          pendingBooking = { checkin: d.checkin, checkout: d.checkout, nights: d.nights };
          if (!contactAsked) { contactAsked = true; aiInput.disabled = true; setTimeout(showContactForm, 500); }
        } else {
          bubble.textContent = `⚠️ Ngày ${date} đã có khách rồi ạ! Từ ngày ${d.nextVN} trở đi còn trống — anh/chị muốn đặt ngày khác không?`;
          aiInput.disabled = false;
        }
      } catch {
        bubble.textContent = 'Không kiểm tra được lịch lúc này. Anh/chị nhắn Zalo 0785 925 998 để Trọng kiểm tra nhanh nhé!';
      }
    }

    function showContactForm() {
      const wrap = document.createElement('div');
      wrap.className = 'ai-lead-form';
      wrap.innerHTML = `
        <p>TRỌNG SẼ LIÊN HỆ LẠI TRONG 30 PHÚT</p>
        <input class="ai-lead-inp" id="ai-lead-name"  type="text" placeholder="Tên của anh/chị" maxlength="60" autocomplete="name">
        <input class="ai-lead-inp" id="ai-lead-phone" type="tel"  placeholder="SĐT / Zalo"        maxlength="15" autocomplete="tel">
        <button class="ai-lead-submit" id="ai-lead-submit">GỬI THÔNG TIN →</button>
        <button class="ai-decline"    id="ai-lead-decline">Không cần, cảm ơn</button>`;
      aiMsgs.appendChild(wrap);
      aiMsgs.scrollTop = aiMsgs.scrollHeight;

      document.getElementById('ai-lead-submit').addEventListener('click', async () => {
        const nameEl  = document.getElementById('ai-lead-name');
        const phoneEl = document.getElementById('ai-lead-phone');
        const name  = nameEl.value.trim();
        const phone = phoneEl.value.trim();
        if (!name)  { nameEl.style.borderColor  = 'rgba(212,168,83,.7)'; nameEl.focus();  return; }
        if (!phone) { phoneEl.style.borderColor = 'rgba(212,168,83,.7)'; phoneEl.focus(); return; }

        wrap.innerHTML = '<p style="text-align:center;padding:10px 0;color:rgba(212,168,83,.6);letter-spacing:.06em">Đang gửi...</p>';
        const interest = chosenTopic + (chatHistory.length
          ? ' — ' + chatHistory.filter(m => m.role === 'user').map(m => m.content).join(' | ')
          : '');
        try {
          await fetch('/api/save-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, interest, ...(pendingBooking || {}) }),
          });
        } catch {}

        wrap.remove();
        if (pendingBooking) {
          addMsg('ai', `Cảm ơn ${name}! Em đã ghi nhận đặt phòng rồi 🌿\n\nĐể giữ phòng, anh/chị chuyển khoản cọc về:\n🏦 VIB — STK: 025379016\nTên: LE TU TRONG\nNội dung: ${name} coc homestay ${pendingBooking.checkin}\n\nSau khi chuyển, chụp bill gửi Zalo 0785 925 998 để Trọng xác nhận nhé!`);
        } else {
          addMsg('ai', `Cảm ơn ${name}! Trọng sẽ nhắn lại qua SĐT/Zalo ${phone} trong vòng 30 phút 🌿\nNhắn trực tiếp: zalo.me/0785925998`);
        }
        aiInput.disabled = false;
      });

      document.getElementById('ai-lead-decline').addEventListener('click', () => {
        wrap.remove();
        addMsg('ai', 'Dạ không sao ạ! Khi nào cần anh/chị cứ nhắn Zalo 0785 925 998 — Trọng hỗ trợ 24/7 🌿');
        aiInput.disabled = false;
      });
    }

    async function sendMessage(text) {
      if (isStreaming || !text.trim()) return;
      isStreaming = true; aiSend.disabled = true; aiInput.value = '';
      if (!chosenTopic) chosenTopic = text;
      addMsg('user', text);
      chatHistory.push({ role: 'user', content: text });
      const typing = addTyping();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatHistory }),
        });
        typing.remove();
        const bubble = addMsg('ai', '');
        let fullText = '';
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;
            try { const { t } = JSON.parse(raw); if (t) { fullText += t; bubble.textContent = fullText; aiMsgs.scrollTop = aiMsgs.scrollHeight; } } catch {}
          }
        }

        const checkMatch = fullText.match(/\[CHECK:([^:\]]+):(\d+)\]/);
        if (checkMatch && !contactAsked) {
          const clean = fullText.replace(/\[CHECK:[^\]]+\]/, '').trim();
          bubble.textContent = clean;
          chatHistory.push({ role: 'assistant', content: clean });
          setTimeout(() => checkAvailability(checkMatch[1], parseInt(checkMatch[2])), 400);
        } else {
          const clean = fullText.replace('[ASK_CONTACT]', '').trim();
          bubble.textContent = clean;
          chatHistory.push({ role: 'assistant', content: clean });
          if (!contactAsked && fullText.includes('[ASK_CONTACT]')) {
            contactAsked = true; aiInput.disabled = true;
            setTimeout(showContactForm, 500);
          }
        }
      } catch {
        typing.remove();
        addMsg('ai', 'Xin lỗi, có lỗi xảy ra. Vui lòng gọi 0785 925 998.');
      }
      isStreaming = false; aiSend.disabled = false;
      if (!aiInput.disabled) aiInput.focus();
    }

    function toggleChat() {
      const open = aiPanel.classList.toggle('open');
      aiBtn.classList.toggle('open', open);
      if (open && chatHistory.length === 0) {
        setTimeout(() => {
          addMsg('ai', 'Xin chào! Trọng có thể tư vấn gì cho anh/chị hôm nay? 🌿');
          setTimeout(() => addQuickReplies(['Tour & Chụp 360°', 'Homestay Đà Lạt', 'Bonsai nghệ thuật', 'Thiết kế website']), 400);
        }, 300);
      }
    }

    aiBtn.addEventListener('click', toggleChat);
    aiClose.addEventListener('click', toggleChat);
    aiSend.addEventListener('click', () => sendMessage(aiInput.value));
    aiInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(aiInput.value); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
