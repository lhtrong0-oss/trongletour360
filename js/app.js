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

// ── MOBILE MENU ──────────────────────────────────────────────────────────────
const hamburger = document.getElementById('nav-hamburger');
const mobileOverlay = document.getElementById('nav-mobile-overlay');
if (hamburger && mobileOverlay) {
  hamburger.addEventListener('click', () => {
    const open = mobileOverlay.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  mobileOverlay.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileOverlay.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
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

// Chatbot → js/chatbot.js
