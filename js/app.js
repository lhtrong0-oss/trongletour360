// ── CURSOR ──────────────────────────────────────────────────────────────────
const cur = document.getElementById('cursor');
if (cur) {
  document.addEventListener('mousemove', e => {
    cur.style.left = e.clientX + 'px';
    cur.style.top  = e.clientY + 'px';
  }, { passive: true });
  document.querySelectorAll('a,button,.svc-card,.hs-card,.blog-card,.pillar-card').forEach(el => {
    el.addEventListener('mouseenter', () => cur.classList.add('big'));
    el.addEventListener('mouseleave', () => cur.classList.remove('big'));
  });
}

// ── NAV SCROLL ───────────────────────────────────────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () =>
    nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
}

// ── REVEAL ───────────────────────────────────────────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ── AI CHATBOT ────────────────────────────────────────────────────────────────
const aiBtn   = document.getElementById('ai-btn');
const aiPanel = document.getElementById('ai-panel');
const aiClose = document.getElementById('ai-close');
const aiMsgs  = document.getElementById('ai-msgs');
const aiInput = document.getElementById('ai-input');
const aiSend  = document.getElementById('ai-send');

if (aiBtn && aiPanel) {
  let chatHistory  = [];
  let isStreaming  = false;
  let leadCaptured = false;

  const now = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  function addMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;
    wrap.innerHTML = `<div class="msg-bubble"></div><div class="msg-time">${now()}</div>`;
    wrap.querySelector('.msg-bubble').textContent = text;
    aiMsgs.appendChild(wrap);
    aiMsgs.scrollTop = aiMsgs.scrollHeight;
    return wrap.querySelector('.msg-bubble');
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg ai'; wrap.id = 'typing-indicator';
    wrap.innerHTML = '<div class="msg-bubble typing"><span></span><span></span><span></span></div>';
    aiMsgs.appendChild(wrap);
    aiMsgs.scrollTop = aiMsgs.scrollHeight;
    return wrap;
  }

  function showLeadForm() {
    if (leadCaptured) return;
    const form = document.createElement('div');
    form.className = 'ai-lead-form';
    form.innerHTML = `
      <p>ĐỂ TRỌNG LIÊN HỆ LẠI</p>
      <input class="ai-lead-inp" id="lead-name"  type="text" placeholder="Tên của bạn" autocomplete="name">
      <input class="ai-lead-inp" id="lead-phone" type="tel"  placeholder="Số điện thoại / Zalo" autocomplete="tel">
      <button class="ai-lead-submit" id="lead-submit">GỬI THÔNG TIN →</button>`;
    aiMsgs.appendChild(form);
    aiMsgs.scrollTop = aiMsgs.scrollHeight;
    document.getElementById('lead-submit').onclick = submitLead;
  }

  async function submitLead() {
    const name  = document.getElementById('lead-name')?.value?.trim();
    const phone = document.getElementById('lead-phone')?.value?.trim();
    if (!name || !phone) return;
    leadCaptured = true;
    document.querySelector('.ai-lead-form')?.remove();
    const lastInterest = chatHistory.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    try {
      await fetch('/api/save-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, interest: lastInterest }),
      });
    } catch {}
    addMsg('ai', `Cảm ơn ${name}! Anh Trọng sẽ liên hệ qua số ${phone} trong vòng 30 phút. Bạn cũng có thể nhắn Zalo 0785 925 998 để được hỗ trợ ngay.`);
  }

  async function sendMessage(text) {
    if (isStreaming || !text.trim()) return;
    isStreaming = true; aiSend.disabled = true; aiInput.value = '';
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
      chatHistory.push({ role: 'assistant', content: fullText });
      if (!leadCaptured && (fullText.includes('tên') && fullText.includes('điện thoại') || fullText.includes('liên hệ lại'))) {
        setTimeout(showLeadForm, 600);
      }
    } catch {
      typing.remove();
      addMsg('ai', 'Xin lỗi, có lỗi xảy ra. Vui lòng gọi trực tiếp 0785 925 998 để được hỗ trợ.');
    }
    isStreaming = false; aiSend.disabled = false; aiInput.focus();
  }

  function toggleChat() {
    const open = aiPanel.classList.toggle('open');
    aiBtn.classList.toggle('open', open);
    if (open) {
      aiInput.focus();
      if (chatHistory.length === 0) {
        setTimeout(() => addMsg('ai', 'Xin chào! Mình là trợ lý của TrongLeTour360 🌿 Bạn cần tư vấn về Tour 360°, Homestay hay Bonsai Đà Lạt?'), 300);
      }
    }
  }

  aiBtn.addEventListener('click', toggleChat);
  aiClose.addEventListener('click', toggleChat);
  aiSend.addEventListener('click', () => sendMessage(aiInput.value));
  aiInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(aiInput.value); } });
}
