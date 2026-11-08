/* Temporary homepage-only cinematic edition. Set this single value to false to disable it. */
(() => {
  const DOOMSDAY_THEME_ENABLED = true;
  const START_IST = new Date('2026-11-08T00:00:00+05:30').getTime();
  const END_IST = new Date('2026-12-30T23:59:59+05:30').getTime();
  const MAX_TIMEOUT = 2147483647;
  const INTRO_SESSION_KEY = 'aws-sbg-doomsday-intro-2026';
  let expiryTimer;
  let introTimer;
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
      body.doomsday-active { background:linear-gradient(180deg,#090d0b 0%,#101711 38%,#0b0f0d 100%); }
      body.doomsday-active::before { content:""; position:fixed; z-index:-1; inset:0; pointer-events:none; opacity:.72; background:radial-gradient(ellipse at 12% 18%,rgba(81,118,45,.18),transparent 28%),radial-gradient(ellipse at 88% 56%,rgba(113,146,42,.1),transparent 33%),repeating-linear-gradient(105deg,rgba(255,255,255,.012) 0 1px,transparent 1px 7px); }
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
      body.doomsday-active .section-label,body.doomsday-active .builder-center-steps>span,body.doomsday-active .event-number,body.doomsday-active .event-type { color:var(--doomsday-green); }
      body.doomsday-active .button-primary { background:#5d7c30; border-color:#769a3d; box-shadow:inset 0 1px rgba(255,255,255,.13),0 9px 22px rgba(0,0,0,.2); }
      body.doomsday-active .button-primary:hover { background:var(--doomsday-green); border-color:var(--doomsday-green); color:#10150d; }
      body.doomsday-active .button-quiet,body.doomsday-active .event-link { border-color:rgba(164,214,61,.25); background:rgba(23,31,22,.52); }
      body.doomsday-active .button-quiet:hover,body.doomsday-active .event-link:hover { background:rgba(164,214,61,.16); border-color:var(--doomsday-green); }
      body.doomsday-active .about-section { position:relative; background:linear-gradient(102deg,rgba(17,27,19,.92),rgba(13,18,15,.82)); border-top:1px solid rgba(164,214,61,.13); border-bottom:1px solid rgba(164,214,61,.13); }
      body.doomsday-active .about-section::after { content:""; position:absolute; inset:0 0 0 auto; width:min(34vw,500px); pointer-events:none; opacity:.5; background:radial-gradient(circle at 18% 74%,rgba(112,143,53,.32) 0 2px,transparent 3px),radial-gradient(circle at 42% 58%,rgba(112,143,53,.22) 0 3px,transparent 4px),radial-gradient(circle at 72% 34%,rgba(112,143,53,.18) 0 2px,transparent 3px); background-size:73px 83px,97px 111px,59px 67px; mask-image:linear-gradient(90deg,transparent,black); }
      body.doomsday-active .about-details dl { border-color:rgba(164,214,61,.22); }
      body.doomsday-active .about-details dl div { border-color:rgba(164,214,61,.16); }
      body.doomsday-active .about-details dt { color:var(--doomsday-green); }
      body.doomsday-active .about-block { background:linear-gradient(145deg,#526b2b,#202d1e); border:1px solid rgba(164,214,61,.26); box-shadow:inset 0 0 45px rgba(164,214,61,.07); }
      body.doomsday-active .about-block strong { color:var(--doomsday-green); }
      body.doomsday-active .stats-section { background-color:#101711; border-color:rgba(164,214,61,.23); }
      body.doomsday-active .stats-section,.doomsday-active .team-section,.doomsday-active .builder-center-section,.doomsday-active .cta-section { background-image:linear-gradient(rgba(164,214,61,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(164,214,61,.12) 1px,transparent 1px); }
      body.doomsday-active .stats-grid,.doomsday-active .stat { border-color:rgba(164,214,61,.19); }
      body.doomsday-active .stat strong { color:#eef2e8; text-shadow:0 0 24px rgba(164,214,61,.12); }
      body.doomsday-active .events-section { background:linear-gradient(180deg,#0e1510,#101711 55%,#0c110e); }
      body.doomsday-active .events-list,.doomsday-active .event-row { border-color:rgba(164,214,61,.19); }
      body.doomsday-active .event-row { padding-inline:1.1rem; margin-inline:-1.1rem; transition:background .22s ease,box-shadow .22s ease; }
      body.doomsday-active .event-row:hover { background:linear-gradient(90deg,rgba(164,214,61,.09),transparent 78%); box-shadow:inset 2px 0 var(--doomsday-green); }
      body.doomsday-active .team-section { position:relative; border-color:rgba(164,214,61,.22); background-color:#0c120e; }
      body.doomsday-active .team-section::before { content:""; position:absolute; left:0; right:0; height:150px; top:0; pointer-events:none; opacity:.38; background:linear-gradient(180deg,rgba(164,214,61,.12),transparent),repeating-linear-gradient(135deg,rgba(164,214,61,.1) 0 1px,transparent 1px 18px); }
      body.doomsday-active .team-grid { background:rgba(164,214,61,.22); border-color:rgba(164,214,61,.22); }
      body.doomsday-active .member-card { background:linear-gradient(160deg,#101810,#0b100c); }
      body.doomsday-active .member-photo { background:#172017; border-color:rgba(164,214,61,.2); }
      body.doomsday-active .member-photo::after { border-color:rgba(164,214,61,.32); }
      body.doomsday-active .member-photo img { filter:saturate(.72) contrast(1.06) sepia(.1); }
      body.doomsday-active .member-index,body.doomsday-active .member-reveal a { color:var(--doomsday-green); }
      body.doomsday-active .builder-center-section { background-color:#111912; border-color:rgba(164,214,61,.22); }
      body.doomsday-active .builder-center-hero { padding:clamp(1.5rem,3vw,3rem); margin-inline:clamp(-1.5rem,-3vw,-3rem); background:linear-gradient(115deg,rgba(22,35,20,.98),rgba(13,18,15,.78)); border-block:1px solid rgba(164,214,61,.16); }
      body.doomsday-active .builder-center-link { border-left-color:var(--doomsday-green); background:#182118; }
      body.doomsday-active .builder-center-link:hover { background:#526b2b; }
      body.doomsday-active .builder-feature-grid { background:rgba(164,214,61,.22); border-color:rgba(164,214,61,.22); }
      body.doomsday-active .builder-feature-grid article { background:linear-gradient(155deg,#101810,#0b110d); }
      body.doomsday-active .builder-feature-grid article:nth-child(even) { background:linear-gradient(155deg,#142016,#0c120e); }
      body.doomsday-active .builder-feature-grid span { color:var(--doomsday-green); }
      body.doomsday-active .builder-feature-grid article:hover { background:#1c291b; }
      body.doomsday-active .builder-center-steps { background:#182119; border-color:rgba(164,214,61,.22); }
      body.doomsday-active .cta-section { background-color:#0c120d; border-color:rgba(164,214,61,.24); }
      body.doomsday-active .cta-section::before { content:""; position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 73% 42%,rgba(164,214,61,.2),transparent 22%),linear-gradient(115deg,transparent 54%,rgba(164,214,61,.08)); }
      body.doomsday-active .cta-shape { background:linear-gradient(135deg,#6b8a36,#263720); box-shadow:0 0 80px rgba(164,214,61,.12); }
      body.doomsday-active .cta-copy { text-shadow:0 2px 16px rgba(0,0,0,.65); }
      body.doomsday-active .site-footer { background:linear-gradient(180deg,#0d130e,#080b09); border-top:1px solid rgba(164,214,61,.23); }
      body.doomsday-active .footer-label,body.doomsday-active .site-footer a:hover { color:var(--doomsday-green); }
      body.doomsday-active .footer-bottom { border-color:rgba(164,214,61,.18); }
      body.doomsday-active > :not(#doomsday-intro) { transition:filter .3s ease; }
      body.doomsday-intro-active > :not(#doomsday-intro) { filter:blur(11px) saturate(.72); pointer-events:none; user-select:none; }
      body.doomsday-intro-exiting > :not(#doomsday-intro) { filter:blur(0) saturate(1); }
      #doomsday-intro { position:fixed; z-index:2147483646; inset:0; display:grid; place-items:center; overflow:hidden; background:radial-gradient(circle at 50% 48%,rgba(101,145,54,.25),transparent 28%),linear-gradient(135deg,#09100b,#172418 48%,#080c09); opacity:0; transition:opacity .3s ease; }
      #doomsday-intro::before { content:""; position:absolute; inset:-20%; background:repeating-linear-gradient(110deg,transparent 0 10px,rgba(193,213,187,.025) 11px 12px),radial-gradient(ellipse at 20% 30%,rgba(164,214,61,.14),transparent 25%),radial-gradient(ellipse at 80% 75%,rgba(69,104,42,.18),transparent 32%); filter:blur(8px); }
      #doomsday-intro.is-visible { opacity:1; }
      #doomsday-intro.is-visible .doomsday-intro__mask { animation:doomsday-mask-turn 2.7s cubic-bezier(.22,.77,.23,1) both; }
      #doomsday-intro.is-visible .doomsday-intro__sweep { animation:doomsday-light-sweep .4s ease-out 2.3s both; }
      #doomsday-intro.is-exiting { opacity:0; }
      .doomsday-intro__frame { position:relative; width:min(52vw,350px); aspect-ratio:570/438; perspective:900px; filter:drop-shadow(0 20px 28px rgba(0,0,0,.58)); }
      .doomsday-intro__mask { display:block; width:100%; height:100%; object-fit:contain; transform-style:preserve-3d; will-change:transform,opacity; }
      .doomsday-intro__sweep { position:absolute; inset:7% 28%; pointer-events:none; opacity:0; mix-blend-mode:screen; background:linear-gradient(105deg,transparent 34%,rgba(208,255,164,.62) 49%,transparent 64%); transform:translateX(-120%) skewX(-12deg); }
      @keyframes doomsday-mask-turn { 0% { opacity:0; transform:rotateY(-30deg) scale(.92); } 18.5% { opacity:1; transform:rotateY(0) scale(1); } 51% { opacity:1; transform:rotateY(180deg) scale(1); } 85% { opacity:1; transform:rotateY(360deg) scale(1); } 100% { opacity:1; transform:rotateY(360deg) scale(1); } }
      @keyframes doomsday-light-sweep { from { opacity:0; transform:translateX(-120%) skewX(-12deg); } 20% { opacity:.8; } to { opacity:0; transform:translateX(125%) skewX(-12deg); } }
      @keyframes doomsday-reveal { from { opacity:0; transform:translateY(14px); clip-path:inset(0 0 32% 0); } to { opacity:1; transform:none; clip-path:inset(0 0 0 0); } }
      @media (prefers-reduced-motion:reduce) { body.doomsday-active .hero-copy,#doomsday-intro.is-visible .doomsday-intro__mask,#doomsday-intro.is-visible .doomsday-intro__sweep { animation:none; } }
      @media (max-width:650px) { .doomsday-intro__frame { width:min(82vw,330px); } }
    `;
    document.head.append(style);
  };

  const applyTheme = () => {
    if (active) return;
    captureOriginal();
    injectStyles();
    const hud = document.createElement('div');
    hud.className = 'doomsday-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = 'NODE // LBSCEK<br>PHASE // 01<br>STATUS // PREPARE';
    document.querySelector('.hero-art')?.append(hud);
    document.body.classList.add('doomsday-active');
    active = true;
    showIntro();
  };

  const restoreOriginal = () => {
    if (!active) return;
    const elements = heroElements();
    Object.entries(original).forEach(([key, html]) => { if (elements[key]) elements[key].innerHTML = html; });
    document.querySelector('.doomsday-hud')?.remove();
    removeIntro();
    document.body.classList.remove('doomsday-active');
    style?.remove();
    style = null;
    active = false;
  };

  const restoreIntroBackground = (intro) => {
    intro?.backgroundState?.forEach((state, element) => {
      element.inert = state.inert;
      if (state.ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', state.ariaHidden);
    });
  };

  const removeIntro = () => {
    clearTimeout(introTimer);
    const intro = document.querySelector('#doomsday-intro');
    restoreIntroBackground(intro);
    intro?.remove();
    document.body.classList.remove('doomsday-intro-active', 'doomsday-intro-exiting');
  };

  const showIntro = () => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    try { if (sessionStorage.getItem(INTRO_SESSION_KEY) === 'shown') return; } catch { return; }
    const beginIntro = (mask) => {
      if (!active || !inThemeWindow() || document.querySelector('#doomsday-intro')) return;
      try {
      const intro = document.createElement('div');
      intro.id = 'doomsday-intro';
      intro.setAttribute('aria-hidden', 'true');
      const frame = document.createElement('div');
      frame.className = 'doomsday-intro__frame';
      mask.className = 'doomsday-intro__mask';
      mask.alt = '';
      mask.setAttribute('aria-hidden', 'true');
      frame.append(mask);
      const sweep = document.createElement('span');
      sweep.className = 'doomsday-intro__sweep';
      frame.append(sweep);
      intro.append(frame);
      intro.backgroundState = new Map();
      [...document.body.children].forEach((element) => { if (element !== intro) { intro.backgroundState.set(element, { inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }); element.inert = true; element.setAttribute('aria-hidden', 'true'); } });
      document.body.append(intro);
      document.body.classList.add('doomsday-intro-active');
      requestAnimationFrame(() => intro.classList.add('is-visible'));
      sessionStorage.setItem(INTRO_SESSION_KEY, 'shown');
      introTimer = setTimeout(() => {
        document.body.classList.add('doomsday-intro-exiting');
        intro.classList.add('is-exiting');
        introTimer = setTimeout(removeIntro, 300);
      }, reducedMotion ? 450 : 2700);
      } catch { removeIntro(); }
    };

    const mask = new Image();
    mask.decoding = 'async';
    mask.onload = () => beginIntro(mask);
    mask.onerror = () => { /* The site remains immediately usable if the local asset is unavailable. */ };
    mask.src = 'assets/doomsday-mask.png';
    if (mask.complete && mask.naturalWidth) beginIntro(mask);
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
