/* Temporary homepage-only cinematic edition. Set this single value to false to disable it. */
(() => {
  const DOOMSDAY_THEME_ENABLED = true;
  const START_IST = new Date('2026-11-08T00:00:00+05:30').getTime();
  const END_IST = new Date('2026-12-30T23:59:59+05:30').getTime();
  const MAX_TIMEOUT = 2147483647;
  let expiryTimer;
  let active = false;
  let original;
  let style;

  const inThemeWindow = (time = Date.now()) => DOOMSDAY_THEME_ENABLED && time >= START_IST && time <= END_IST;
  const heroElements = () => ({
    index: document.querySelector('.hero-index'),
    eyebrow: document.querySelector('.hero-copy .eyebrow'),
    title: document.querySelector('.hero-copy h1'),
    text: document.querySelector('.hero-copy .hero-text'),
    artLabel: document.querySelector('.hero-art .art-label'),
    artStatus: document.querySelector('.hero-art .art-status')
  });

  const captureOriginal = () => {
    const elements = heroElements();
    original = Object.fromEntries(Object.entries(elements).map(([key, element]) => [key, element?.innerHTML ?? '']));
  };

  const injectStyles = () => {
    style = document.createElement('style');
    style.id = 'doomsday-homepage-style';
    style.textContent = `
      body.doomsday-active { --doomsday-green:#a4d63d; --doomsday-green-soft:rgba(164,214,61,.16); --doomsday-metal:#2b312a; }
      body.doomsday-active .site-header { background:rgba(11,15,14,.96); border-bottom-color:rgba(164,214,61,.28); }
      body.doomsday-active .site-header::after { content:""; position:absolute; inset:auto 0 0; height:1px; background:linear-gradient(90deg,transparent,var(--doomsday-green),transparent); opacity:.55; }
      body.doomsday-active .hero { background:radial-gradient(circle at 68% 42%,rgba(164,214,61,.13),transparent 33%),linear-gradient(135deg,rgba(31,40,30,.28),transparent 48%); }
      body.doomsday-active .hero::before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.3; background:repeating-linear-gradient(0deg,transparent 0 4px,rgba(164,214,61,.04) 5px); }
      body.doomsday-active .hero-index span,body.doomsday-active .art-status strong { color:var(--doomsday-green); }
      body.doomsday-active .hero-copy { animation:doomsday-reveal .8s cubic-bezier(.16,.78,.24,1) both; }
      body.doomsday-active .hero-copy .eyebrow { color:var(--doomsday-green); }
      body.doomsday-active .hero-copy h1 { text-shadow:0 0 32px rgba(164,214,61,.11); }
      body.doomsday-active .hero-copy h1 em { color:var(--pink); }
      body.doomsday-active .hero-art { border-color:rgba(164,214,61,.3); background:linear-gradient(145deg,#151b17,var(--surface)); box-shadow:inset 0 0 80px rgba(164,214,61,.05); }
      body.doomsday-active .hero-art::after { content:""; position:absolute; inset:12px; pointer-events:none; border:1px solid rgba(164,214,61,.25); clip-path:polygon(0 0,13px 0,13px 1px,calc(100% - 13px) 1px,calc(100% - 13px) 0,100% 0,100% 13px,calc(100% - 1px) 13px,calc(100% - 1px) calc(100% - 13px),100% calc(100% - 13px),100% 100%,calc(100% - 13px) 100%,calc(100% - 13px) calc(100% - 1px),13px calc(100% - 1px),13px 100%,0 100%,0 calc(100% - 13px),1px calc(100% - 13px),1px 13px,0 13px); }
      body.doomsday-active .hero-art .art-label { background:var(--doomsday-green); color:#10140f; }
      body.doomsday-active .pixel-cloud i:nth-child(1),body.doomsday-active .pixel-cloud i:nth-child(3) { background:#567530; }
      body.doomsday-active .pixel-cloud i:nth-child(5) { background:var(--doomsday-green); }
      body.doomsday-active .node-one { border-color:var(--doomsday-green); }
      body.doomsday-active .node-two { background:var(--doomsday-green); border-color:var(--doomsday-green); }
      body.doomsday-active .doomsday-hud { position:absolute; z-index:2; right:20px; top:20px; color:var(--doomsday-green); font:500 .55rem var(--mono); letter-spacing:.1em; text-align:right; line-height:1.7; }
      body.doomsday-active .section-label,body.doomsday-active .builder-center-steps>span { color:var(--doomsday-green); }
      body.doomsday-active .team-section,body.doomsday-active .builder-center-section { border-color:rgba(164,214,61,.2); }
      body.doomsday-active .builder-feature-grid article:hover,body.doomsday-active .event-row:hover { background:rgba(164,214,61,.035); }
      @keyframes doomsday-reveal { from { opacity:0; transform:translateY(14px); clip-path:inset(0 0 32% 0); } to { opacity:1; transform:none; clip-path:inset(0 0 0 0); } }
      @media (prefers-reduced-motion:reduce) { body.doomsday-active .hero-copy { animation:none; } }
    `;
    document.head.append(style);
  };

  const applyTheme = () => {
    if (active) return;
    captureOriginal();
    injectStyles();
    const elements = heroElements();
    elements.index.innerHTML = '00 / TRANSMISSION <span>● SIGNAL ACQUIRED</span>';
    elements.eyebrow.innerHTML = 'AWS SBG / LBSCEK <span>/</span> TEMPORARY EDITION';
    elements.title.innerHTML = 'THE NEXT ERA<br>IS <em>APPROACHING.</em>';
    elements.text.textContent = 'AWS SBG / LBSCEK is preparing for its next chapter. A new generation of builders is getting ready to take the stage.';
    elements.artLabel.textContent = 'DOOMSDAY / BUILDER SIGNAL';
    elements.artStatus.innerHTML = 'SYSTEM STATUS <strong>INCOMING</strong>';
    const hud = document.createElement('div');
    hud.className = 'doomsday-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = 'NODE // LBSCEK<br>PHASE // 01<br>STATUS // PREPARE';
    document.querySelector('.hero-art')?.append(hud);
    document.body.classList.add('doomsday-active');
    active = true;
  };

  const restoreOriginal = () => {
    if (!active) return;
    const elements = heroElements();
    Object.entries(original).forEach(([key, html]) => { if (elements[key]) elements[key].innerHTML = html; });
    document.querySelector('.doomsday-hud')?.remove();
    document.body.classList.remove('doomsday-active');
    style?.remove();
    style = null;
    active = false;
  };

  const syncTheme = () => {
    if (inThemeWindow()) applyTheme(); else restoreOriginal();
    clearTimeout(expiryTimer);
    const now = Date.now();
    const nextBoundary = now < START_IST ? START_IST : END_IST + 1000;
    if (DOOMSDAY_THEME_ENABLED && now <= END_IST) {
      expiryTimer = setTimeout(syncTheme, Math.min(Math.max(nextBoundary - now, 1000), MAX_TIMEOUT));
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncTheme, { once:true });
  else syncTheme();
})();
