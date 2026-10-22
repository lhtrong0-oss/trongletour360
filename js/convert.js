/* TrongLeTour360 — bộ tăng chuyển đổi dùng chung cho mọi trang.
   - Điện thoại: thanh cố định Gọi · Zalo · Báo giá
   - Máy tính: nút "Nhận báo giá" nổi ở góc trái
   - Form báo giá dạng popup (mọi phần tử có data-quote sẽ mở popup)
   - Khối form trong trang: đặt <div id="tl-quote"></div> ở nơi muốn hiện
   Lead gửi về /api/save-lead → Notion Leads + Telegram + email.
   Sửa số điện thoại / dịch vụ ở mục CONFIG bên dưới. */
(function () {
  if (window.__tlConvert) return; window.__tlConvert = true;

  var CONFIG = {
    phone: '0785925998',
    phoneLabel: '0785 925 998',
    zalo: 'https://zalo.me/0785925998',
    services: [
      'Tour 360° khách sạn / homestay / resort',
      'Tour 360° nhà hàng / quán cà phê',
      'Chụp ảnh 360° bất động sản',
      'Ảnh 360° lên Google Maps',
      'Thiết kế website',
      'Chatbot Zalo AI',
      'Khác / cần tư vấn'
    ]
  };

  var path = location.pathname.replace(/^\//, '') || 'index.html';
  function guessService() {
    if (/nha-hang|quan-cafe/.test(path)) return CONFIG.services[1];
    if (/bds|bat-dong-san/.test(path)) return CONFIG.services[2];
    if (/google-maps/.test(path)) return CONFIG.services[3];
    if (/website|sales-kit/.test(path)) return CONFIG.services[4];
    if (/chatbot/.test(path)) return CONFIG.services[5];
    if (/360|tour-ao|panoee|insta360|case-study|chi-phi|dich-vu|portfolio/.test(path)) return CONFIG.services[0];
    return CONFIG.services[6];
  }
  var isB2B = guessService() !== CONFIG.services[6] || /^(index\.html|lien-he\.html)?$/.test(path);
  var ctaLabel = isB2B ? 'Báo giá' : 'Tư vấn';

  var css = '' +
    '.tlq-bar{position:fixed;left:0;right:0;bottom:0;z-index:1001;display:none;grid-template-columns:1fr 1fr 1.3fr;background:#0B0F07;border-top:1px solid rgba(212,168,83,.28);box-shadow:0 -8px 24px rgba(0,0,0,.45);font-family:Jost,system-ui,sans-serif}' +
    '.tlq-bar a,.tlq-bar button{display:flex;align-items:center;justify-content:center;gap:8px;height:58px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#F0EAD6;background:none;border:0;border-right:1px solid rgba(212,168,83,.14);cursor:pointer;text-decoration:none;font-family:inherit}' +
    '.tlq-bar .tlq-z{color:#5aa2ff}.tlq-bar button{background:#D4A853;color:#0B0F07;border-right:0}' +
    '@media(max-width:768px){.tlq-bar{display:grid}body{padding-bottom:58px}#ai-btn{bottom:74px!important}.float-zalo{display:none!important}#ai-panel{bottom:136px!important}.tlq-pill{display:none!important}}' +
    '.tlq-pill{position:fixed;left:24px;bottom:28px;z-index:999;display:flex;align-items:center;gap:10px;padding:14px 22px;background:#D4A853;color:#0B0F07;border:0;font:600 12px/1 Jost,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:transform .2s}' +
    '.tlq-pill:hover{transform:translateY(-2px)}' +
    '.tlq-ov{position:fixed;inset:0;z-index:2000;background:rgba(5,7,3,.78);display:none;align-items:center;justify-content:center;padding:16px}' +
    '.tlq-ov.open{display:flex}' +
    '.tlq-box{position:relative;width:100%;max-width:440px;max-height:92vh;overflow:auto;background:#141a0e;border:1px solid rgba(212,168,83,.3);padding:32px 28px;font-family:Jost,system-ui,sans-serif;color:rgba(240,234,214,.85)}' +
    '.tlq-x{position:absolute;top:10px;right:14px;background:none;border:0;color:#F0EAD6;font-size:22px;cursor:pointer}' +
    '.tlq-form h3{font-family:Italiana,serif;font-weight:400;font-size:28px;color:#F0EAD6;margin:0 0 6px;line-height:1.2}' +
    '.tlq-form .tlq-sub{font-size:14px;color:rgba(240,234,214,.55);margin:0 0 20px;line-height:1.6}' +
    '.tlq-form label{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9B7A3C;margin:14px 0 6px}' +
    '.tlq-form input,.tlq-form select,.tlq-form textarea{width:100%;box-sizing:border-box;background:#0B0F07;border:1px solid rgba(212,168,83,.22);color:#F0EAD6;padding:13px 14px;font:15px Jost,system-ui,sans-serif;outline:none}' +
    '.tlq-form input:focus,.tlq-form select:focus,.tlq-form textarea:focus{border-color:#D4A853}' +
    '.tlq-form textarea{min-height:76px;resize:vertical}' +
    '.tlq-form .tlq-hp{position:absolute;left:-9999px}' +
    '.tlq-form .tlq-go{width:100%;margin-top:20px;padding:16px;background:#D4A853;color:#0B0F07;border:0;font:600 13px Jost,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}' +
    '.tlq-form .tlq-go:disabled{opacity:.6}' +
    '.tlq-form .tlq-msg{display:none;margin-top:14px;font-size:14px;line-height:1.6}' +
    '.tlq-form .tlq-trust{display:flex;gap:14px;flex-wrap:wrap;margin-top:16px;font-size:12px;color:rgba(240,234,214,.5)}' +
    '.tlq-inline{max-width:780px;margin:0 auto;padding:72px 24px}' +
    '.tlq-inline .tlq-form{background:#141a0e;border:1px solid rgba(212,168,83,.22);padding:36px 32px}' +
    '.tlq-inline .tlq-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}' +
    '@media(max-width:640px){.tlq-inline .tlq-grid{grid-template-columns:1fr}.tlq-inline .tlq-form{padding:28px 20px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function formHTML(id, inline) {
    var opts = CONFIG.services.map(function (s) { return '<option' + (s === guessService() ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('');
    var a = inline ? '<div class="tlq-grid">' : '', b = inline ? '</div>' : '';
    return '<form class="tlq-form" id="' + id + '" novalidate>' +
      '<h3>' + (isB2B ? 'Nhận báo giá trong 30 phút' : 'Cần tư vấn? Để lại số, Trọng gọi lại') + '</h3>' +
      '<p class="tlq-sub">Để lại tên và số điện thoại/Zalo. Trọng liên hệ lại tư vấn miễn phí, báo giá theo đúng quy mô của bạn — không spam.</p>' +
      a + '<div><label for="' + id + '-n">Tên của bạn *</label><input id="' + id + '-n" name="name" autocomplete="name" required></div>' +
      '<div><label for="' + id + '-p">Số điện thoại / Zalo *</label><input id="' + id + '-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>' + b +
      '<label for="' + id + '-s">Bạn quan tâm</label><select id="' + id + '-s" name="service">' + opts + '</select>' +
      '<label for="' + id + '-m">Mô tả ngắn (không bắt buộc)</label><textarea id="' + id + '-m" name="note" placeholder="VD: homestay 6 phòng ở Xuân Trường, muốn có tour 360° và ảnh lên Google Maps"></textarea>' +
      '<input class="tlq-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="tlq-go" type="submit">Gửi yêu cầu →</button>' +
      '<div class="tlq-msg" role="status"></div>' +
      '<div class="tlq-trust"><span>✓ Phản hồi trong 30 phút</span><span>✓ Khảo sát tận nơi tại Đà Lạt</span><span>✓ Hoặc gọi ' + CONFIG.phoneLabel + '</span></div>' +
      '</form>';
  }

  function bind(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, msg = form.querySelector('.tlq-msg'), btn = form.querySelector('.tlq-go');
      if (f.website.value) return; // bot
      var name = f.name.value.trim(), phone = f.phone.value.replace(/[\s.\-]/g, '');
      function show(t, ok) { msg.textContent = t; msg.style.color = ok ? '#D4A853' : '#e57373'; msg.style.display = 'block'; }
      if (!name) return show('Vui lòng nhập tên.');
      if (!/^(0|\+?84)(3|5|7|8|9)\d{8}$/.test(phone)) return show('Số điện thoại chưa đúng — ví dụ 0785925998.');
      btn.disabled = true; btn.textContent = 'Đang gửi...';
      var interest = f.service.value + (f.note.value.trim() ? ' — ' + f.note.value.trim() : '') + ' [trang: ' + path + ']';
      fetch('/api/save-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, phone: phone, interest: interest }) })
        .then(function (r) { if (!r.ok) throw 0; return r.json().catch(function () { return {}; }); })
        .then(function () {
          show('Cảm ơn ' + name + '! Trọng sẽ gọi/nhắn Zalo cho bạn trong 30 phút. Cần gấp: gọi ' + CONFIG.phoneLabel + '.', true);
          form.reset(); btn.textContent = 'Đã gửi ✓';
          try { if (window.gtag) gtag('event', 'generate_lead', { service: f.service.value }); } catch (_) {}
        })
        .catch(function () {
          show('Chưa gửi được. Bạn nhắn Zalo hoặc gọi ' + CONFIG.phoneLabel + ' nhé.');
          btn.disabled = false; btn.textContent = 'Gửi yêu cầu →';
        });
    });
  }

  // Popup
  var ov = document.createElement('div');
  ov.className = 'tlq-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Nhận báo giá');
  ov.innerHTML = '<div class="tlq-box"><button class="tlq-x" aria-label="Đóng">×</button>' + formHTML('tlq-pop', false) + '</div>';
  document.body.appendChild(ov);
  bind(ov.querySelector('form'));
  function open() { ov.classList.add('open'); setTimeout(function () { ov.querySelector('input[name=name]').focus(); }, 50); }
  function close() { ov.classList.remove('open'); }
  ov.addEventListener('click', function (e) { if (e.target === ov || e.target.classList.contains('tlq-x')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-quote]');
    if (t) { e.preventDefault(); open(); }
  });
  window.tlOpenQuote = open;

  // Thanh dưới cùng (điện thoại) + nút nổi (máy tính)
  var bar = document.createElement('div');
  bar.className = 'tlq-bar';
  bar.innerHTML = '<a href="tel:' + CONFIG.phone + '" aria-label="Gọi điện">📞 Gọi</a>' +
    '<a class="tlq-z" href="' + CONFIG.zalo + '" target="_blank" rel="noopener" aria-label="Nhắn Zalo">💬 Zalo</a>' +
    '<button type="button" data-quote>📝 ' + ctaLabel + '</button>';
  document.body.appendChild(bar);
  if (isB2B) {
    var pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'tlq-pill'; pill.setAttribute('data-quote', '');
    pill.textContent = '📝 Nhận báo giá';
    document.body.appendChild(pill);
  }

  // Khối form trong trang
  var slot = document.getElementById('tl-quote');
  if (slot) {
    slot.className = 'tlq-inline';
    slot.innerHTML = formHTML('tlq-in', true);
    bind(slot.querySelector('form'));
  }
})();
