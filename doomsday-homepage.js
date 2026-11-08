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
      body.doomsday-intro-active > :not(#doomsday-intro) { filter:blur(11px) saturate(.72); pointer-events:none; user-select:none; }
      #doomsday-intro { position:fixed; z-index:2147483646; inset:0; display:grid; place-items:center; overflow:hidden; background:radial-gradient(circle at 50% 48%,rgba(101,145,54,.25),transparent 28%),linear-gradient(135deg,#09100b,#172418 48%,#080c09); opacity:1; transition:opacity .3s ease; }
      #doomsday-intro::before { content:""; position:absolute; inset:-20%; background:repeating-linear-gradient(110deg,transparent 0 10px,rgba(193,213,187,.025) 11px 12px),radial-gradient(ellipse at 20% 30%,rgba(164,214,61,.14),transparent 25%),radial-gradient(ellipse at 80% 75%,rgba(69,104,42,.18),transparent 32%); filter:blur(8px); }
      #doomsday-intro.is-visible .doomsday-intro__mask { animation:doomsday-mask-turn 1.65s cubic-bezier(.22,.77,.23,1) both; }
      #doomsday-intro.is-visible .doomsday-intro__sweep { animation:doomsday-light-sweep .4s ease-out 1.27s both; }
      #doomsday-intro.is-exiting { opacity:0; }
      .doomsday-intro__frame { position:relative; width:min(72vw,430px); aspect-ratio:4/5; perspective:900px; filter:drop-shadow(0 24px 35px rgba(0,0,0,.58)); }
      .doomsday-intro__mask { width:100%; height:100%; transform-style:preserve-3d; will-change:transform,opacity; }
      .doomsday-intro__sweep { position:absolute; inset:9% 18%; pointer-events:none; opacity:0; mix-blend-mode:screen; background:linear-gradient(105deg,transparent 34%,rgba(228,255,190,.8) 49%,transparent 64%); transform:translateX(-120%) skewX(-12deg); }
      @keyframes doomsday-mask-turn { 0% { opacity:0; transform:rotateY(-42deg) scale(.88); } 18% { opacity:1; } 62% { transform:rotateY(7deg) scale(1); } 78%,100% { opacity:1; transform:rotateY(0) scale(1); } }
      @keyframes doomsday-light-sweep { from { opacity:0; transform:translateX(-120%) skewX(-12deg); } 20% { opacity:.8; } to { opacity:0; transform:translateX(125%) skewX(-12deg); } }
      @keyframes doomsday-reveal { from { opacity:0; transform:translateY(14px); clip-path:inset(0 0 32% 0); } to { opacity:1; transform:none; clip-path:inset(0 0 0 0); } }
      @media (prefers-reduced-motion:reduce) { body.doomsday-active .hero-copy,#doomsday-intro.is-visible .doomsday-intro__mask,#doomsday-intro.is-visible .doomsday-intro__sweep { animation:none; } }
      @media (max-width:650px) { .doomsday-intro__frame { width:min(88vw,380px); } }
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
    document.body.classList.remove('doomsday-intro-active');
  };

  const showIntro = () => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    try { if (sessionStorage.getItem(INTRO_SESSION_KEY) === 'shown') return; } catch { return; }
    try {
      const intro = document.createElement('div');
      intro.id = 'doomsday-intro';
      intro.setAttribute('aria-hidden', 'true');
      intro.innerHTML = `<div class="doomsday-intro__frame"><svg class="doomsday-intro__mask" viewBox="0 0 420 525" role="img" aria-label="Original weathered steel mask with emerald reflections"><defs><linearGradient id="steel" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#edf0e7"/><stop offset=".18" stop-color="#7f8882"/><stop offset=".38" stop-color="#d5d8d0"/><stop offset=".6" stop-color="#4c5651"/><stop offset=".82" stop-color="#9ca69d"/><stop offset="1" stop-color="#343d38"/></linearGradient><linearGradient id="face" x1="0" x2="1"><stop stop-color="#59635c"/><stop offset=".2" stop-color="#c5ccc3"/><stop offset=".51" stop-color="#6e7971"/><stop offset=".8" stop-color="#d7dbd0"/><stop offset="1" stop-color="#465048"/></linearGradient><linearGradient id="glow" x1="0" x2="1"><stop stop-color="#a4d63d" stop-opacity="0"/><stop offset=".48" stop-color="#c7f266" stop-opacity=".66"/><stop offset="1" stop-color="#a4d63d" stop-opacity="0"/></linearGradient><filter id="grain"><feTurbulence baseFrequency=".85" numOctaves="2" stitchTiles="stitch" result="noise"/><feColorMatrix in="noise" type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs><path d="M210 18C128 18 78 74 78 164v117c0 83 46 175 132 224 86-49 132-141 132-224V164C342 74 292 18 210 18Z" fill="url(#steel)" stroke="#d6ddd2" stroke-opacity=".4" stroke-width="4" filter="url(#grain)"/><path d="M210 45c-64 0-103 48-103 119v106c0 70 37 145 103 189 66-44 103-119 103-189V164c0-71-39-119-103-119Z" fill="url(#face)" stroke="#242b27" stroke-width="5"/><path d="M112 160 185 136l-25 75-55 20Z" fill="#202622" stroke="#c8d1c5" stroke-opacity=".38" stroke-width="3"/><path d="m308 160-73-24 25 75 55 20Z" fill="#202622" stroke="#c8d1c5" stroke-opacity=".38" stroke-width="3"/><path d="m126 172 49-15-19 38-32 12Zm168 0-49-15 19 38 32 12Z" fill="#08100b"/><path d="M210 104 178 264l32 40 32-40Z" fill="url(#steel)" stroke="#303a34" stroke-width="4"/><path d="m210 120-15 127 15 23 15-23Z" fill="#35453a" opacity=".75"/><path d="M133 247 177 274l-12 59-40-25Z" fill="#6f7970" stroke="#252d28" stroke-width="4"/><path d="m287 247-44 27 12 59 40-25Z" fill="#6f7970" stroke="#252d28" stroke-width="4"/><path d="M142 340q68 47 136 0l-10 78q-58 45-116 0Z" fill="#29332d" stroke="#c3cbc0" stroke-opacity=".34" stroke-width="4"/><g stroke="#aeb8ad" stroke-opacity=".55" stroke-width="4"><path d="M167 360h86M163 378h94M160 396h100"/></g><g fill="#2a342d" stroke="#c2cabe" stroke-opacity=".35" stroke-width="3"><circle cx="124" cy="142" r="8"/><circle cx="296" cy="142" r="8"/><circle cx="144" cy="438" r="8"/><circle cx="276" cy="438" r="8"/></g><path d="M104 115c52-63 151-76 212-4" fill="none" stroke="url(#glow)" stroke-width="7" opacity=".75"/><path d="M140 92 166 66m-40 63 28-17m138-20-26-26m40 63-28-17M154 438l-19 18m131-18 19 18" stroke="#e5ece0" stroke-opacity=".28" stroke-width="2"/></svg><span class="doomsday-intro__sweep"></span></div>`;
      intro.backgroundState = new Map();
      [...document.body.children].forEach((element) => { if (element !== intro) { intro.backgroundState.set(element, { inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }); element.inert = true; element.setAttribute('aria-hidden', 'true'); } });
      document.body.append(intro);
      document.body.classList.add('doomsday-intro-active');
      requestAnimationFrame(() => intro.classList.add('is-visible'));
      sessionStorage.setItem(INTRO_SESSION_KEY, 'shown');
      introTimer = setTimeout(() => { intro.classList.add('is-exiting'); introTimer = setTimeout(removeIntro, 310); }, reducedMotion ? 120 : 1700);
    } catch { removeIntro(); }
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
