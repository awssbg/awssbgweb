/*
 * Temporary, self-contained launch gate. Deleting this file disables the mask.
 * The password is intentionally client-side and temporary; it is not authentication.
 */
(() => {
  const SESSION_KEY = 'aws-sbg-launch-access-v1';
  const TEMPORARY_PASSWORD = 'SBG!Launch_9Xr7#K2vP4';
  const session = {
    get: () => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } },
    grant: () => { try { sessionStorage.setItem(SESSION_KEY, 'granted'); } catch {} }
  };
  if (session.get() === 'granted') return;

  const style = document.createElement('style');
  style.id = 'launch-mask-style';
  style.textContent = String.raw`
    body.launch-mask-active { overflow: hidden !important; }
    #launch-mask { --mask-bg:#090b16; --mask-surface:#101321; --mask-line:rgba(187,198,255,.16); --mask-ink:#f5f3ed; --mask-muted:#bbc1d4; --mask-pink:#f248c6; --mask-violet:#8059f6; position:fixed; z-index:2147483647; inset:0; isolation:isolate; overflow:auto; overscroll-behavior:contain; color:var(--mask-ink); background:var(--mask-bg); font-family:Manrope,Inter,Arial,sans-serif; }
    #launch-mask::before,#launch-mask::after { content:""; position:fixed; pointer-events:none; }
    #launch-mask::before { inset:0; background-image:linear-gradient(var(--mask-line) 1px,transparent 1px),linear-gradient(90deg,var(--mask-line) 1px,transparent 1px); background-size:68px 68px; mask-image:linear-gradient(to bottom,black,rgba(0,0,0,.55)); }
    #launch-mask::after { width:min(58vw,720px); height:min(58vw,720px); right:-18vw; top:-24vw; border:72px solid rgba(128,89,246,.16); box-shadow:0 0 120px rgba(242,72,198,.13); }
    .launch-mask__shell { min-height:100%; max-width:1280px; margin:0 auto; padding:clamp(24px,4vw,56px); display:grid; grid-template-rows:auto 1fr auto; gap:clamp(42px,8vh,90px); position:relative; }
    .launch-mask__top { display:flex; justify-content:space-between; align-items:center; gap:24px; }
    .launch-mask__brand { display:inline-flex; align-items:center; gap:13px; color:var(--mask-ink); text-decoration:none; font-weight:800; letter-spacing:-.03em; }
    .launch-mask__logo { width:31px; height:31px; object-fit:contain; }
    .launch-mask__eyebrow,.launch-mask__status,.launch-mask__meta,.launch-mask__socials a,.launch-mask__member p { font-family:"IBM Plex Mono",ui-monospace,monospace; letter-spacing:.08em; text-transform:uppercase; }
    .launch-mask__status { margin:0; color:#9ee0b9; font-size:.72rem; font-weight:700; }
    .launch-mask__status::before { content:"●"; margin-right:8px; color:#7ae49e; }
    .launch-mask__content { align-self:center; max-width:940px; }
    .launch-mask__eyebrow { margin:0 0 20px; color:var(--mask-pink); font-size:.76rem; font-weight:700; }
    .launch-mask h1 { max-width:800px; margin:0; font-size:clamp(3.2rem,9vw,8.6rem); line-height:.86; letter-spacing:-.075em; }
    .launch-mask h1 em,.launch-mask__team h2 em { color:var(--mask-pink); font-style:normal; }
    .launch-mask__copy { max-width:635px; margin:30px 0 0; color:var(--mask-muted); font-size:clamp(1rem,1.5vw,1.2rem); line-height:1.65; }
    .launch-mask__actions { display:flex; flex-wrap:wrap; gap:14px; margin-top:34px; }
    .launch-mask__button { min-height:56px; display:inline-flex; align-items:center; justify-content:center; gap:17px; padding:0 23px; border:1px solid transparent; text-decoration:none; font-weight:800; transition:transform .2s ease,background .2s ease; cursor:pointer; font:inherit; }
    .launch-mask__button:hover,.launch-mask__button:focus-visible { transform:translateY(-2px); outline:2px solid var(--mask-ink); outline-offset:3px; }
    .launch-mask__button--primary { background:var(--mask-violet); color:white; }
    .launch-mask__button--ghost { border-color:var(--mask-line); color:var(--mask-ink); background:rgba(16,19,33,.7); }
    .launch-mask__sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .launch-mask__access { max-width:635px; margin-top:18px; padding:16px; border:1px solid var(--mask-line); background:rgba(16,19,33,.62); }
    .launch-mask__access-label { margin:0 0 10px; color:var(--mask-muted); font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:.67rem; letter-spacing:.08em; text-transform:uppercase; }
    .launch-mask__access-form { display:flex; gap:9px; }
    .launch-mask__access input { min-width:0; flex:1; min-height:45px; padding:0 13px; border:1px solid var(--mask-line); border-radius:0; color:var(--mask-ink); background:#090b16; font:inherit; }
    .launch-mask__access input:focus { outline:2px solid var(--mask-pink); outline-offset:2px; }
    .launch-mask__access button { min-height:45px; padding:0 15px; border:1px solid var(--mask-pink); color:#090b16; background:var(--mask-pink); font:700 .72rem "IBM Plex Mono",ui-monospace,monospace; letter-spacing:.06em; cursor:pointer; }
    .launch-mask__access-status { min-height:1.3em; margin:9px 0 0; color:#ff9cdf; font-size:.78rem; }
    .launch-mask__team { margin-top:clamp(58px,9vw,110px); padding-top:22px; border-top:1px solid var(--mask-line); }
    .launch-mask__team-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; }
    .launch-mask__team-heading .launch-mask__eyebrow { margin:0; }
    .launch-mask__team h2 { margin:0; font-size:clamp(1.9rem,3.5vw,3.35rem); line-height:.96; letter-spacing:-.06em; }
    .launch-mask__team-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); margin-top:25px; border-top:1px solid var(--mask-line); border-left:1px solid var(--mask-line); }
    .launch-mask__member { min-height:104px; display:grid; grid-template-columns:58px 1fr auto; align-items:center; gap:14px; padding:14px; border-right:1px solid var(--mask-line); border-bottom:1px solid var(--mask-line); background:rgba(16,19,33,.46); }
    .launch-mask__member img { width:58px; height:58px; object-fit:cover; filter:saturate(.85); }
    .launch-mask__member h3 { margin:0; font-size:.96rem; letter-spacing:-.035em; }
    .launch-mask__member p { margin:5px 0 0; color:var(--mask-muted); font-size:.63rem; }
    .launch-mask__member-links { display:flex; gap:5px; }
    .launch-mask__member-links a { display:grid; place-items:center; width:25px; height:25px; border:1px solid var(--mask-line); color:var(--mask-ink); font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:.57rem; text-decoration:none; }
    .launch-mask__member-links a:hover,.launch-mask__member-links a:focus-visible,.launch-mask__socials a:hover,.launch-mask__socials a:focus-visible { background:var(--mask-pink); border-color:var(--mask-pink); color:var(--mask-bg); outline:none; }
    .launch-mask__footer { display:grid; grid-template-columns:1fr auto; gap:24px; align-items:end; padding-top:22px; border-top:1px solid var(--mask-line); }
    .launch-mask__meta { margin:0; color:var(--mask-muted); font-size:.7rem; line-height:1.7; }
    .launch-mask__email { color:var(--mask-ink); text-underline-offset:4px; }
    .launch-mask__socials { display:flex; gap:9px; }
    .launch-mask__socials a { width:39px; height:39px; display:grid; place-items:center; border:1px solid var(--mask-line); color:var(--mask-ink); text-decoration:none; font-size:.7rem; font-weight:700; }
    @media (max-width:620px) { #launch-mask::before { background-size:44px 44px; } #launch-mask::after { width:68vw; height:68vw; border-width:42px; right:-24vw; top:-12vw; } .launch-mask__shell { padding:22px; gap:44px; } .launch-mask__top { align-items:flex-start; } .launch-mask__brand { font-size:.92rem; } .launch-mask__status { max-width:110px; text-align:right; line-height:1.6; } .launch-mask__content { align-self:start; padding-top:7vh; } .launch-mask h1 { font-size:clamp(3.35rem,17vw,5.5rem); } .launch-mask__copy { margin-top:25px; font-size:1rem; } .launch-mask__actions,.launch-mask__access-form { display:grid; } .launch-mask__button { width:100%; } .launch-mask__team { margin-top:54px; } .launch-mask__team-heading { display:block; } .launch-mask__team-heading .launch-mask__eyebrow { margin-bottom:13px; } .launch-mask__team-grid { grid-template-columns:1fr; } .launch-mask__footer { grid-template-columns:1fr; align-items:start; } .launch-mask__access button { min-height:48px; } }
  `;
  document.head.append(style);

  const mask = document.createElement('aside');
  mask.id = 'launch-mask';
  mask.setAttribute('role', 'dialog');
  mask.setAttribute('aria-modal', 'true');
  mask.setAttribute('aria-label', 'AWS SBG launch status');
  mask.innerHTML = `
    <div class="launch-mask__shell">
      <header class="launch-mask__top"><span class="launch-mask__brand"><img class="launch-mask__logo" src="assets/aws-sbg-lbscek-logo.png" alt="AWS SBG logo">AWS SBG / LBSCEK</span><p class="launch-mask__status">Launch build active</p></header>
      <main class="launch-mask__content">
        <p class="launch-mask__eyebrow">SYSTEM STATUS / ASSEMBLING PLATFORM</p><h1>THE BUILD IS<br><em>IN PROGRESS.</em></h1>
        <p class="launch-mask__copy">We are wiring the next AWS Student Builder Group experience for launch. The platform is being prepared for late October—come build with the community while the final systems come online.</p>
        <div class="launch-mask__actions"><a class="launch-mask__button launch-mask__button--primary" href="https://www.meetup.com/aws-sbg-at-lbs-college-of-engineering/" target="_blank" rel="noopener noreferrer">JOIN THE COMMUNITY <span aria-hidden="true">↗</span></a><a class="launch-mask__button launch-mask__button--ghost" href="mailto:admin@aws.iedclbscek.in">CONTACT THE BUILD TEAM <span aria-hidden="true">↗</span></a></div>
        <section class="launch-mask__access" aria-labelledby="launch-mask-access-label"><p id="launch-mask-access-label" class="launch-mask__access-label">Temporary local access / password required</p><form class="launch-mask__access-form" data-launch-unlock><label class="launch-mask__sr-only" for="launch-mask-password">Temporary access password</label><input id="launch-mask-password" name="password" type="password" autocomplete="off" required><button type="submit">UNLOCK SITE</button></form><p class="launch-mask__access-status" data-launch-access-status aria-live="polite"></p></section>
        <section class="launch-mask__team" aria-labelledby="launch-mask-team-title"><div class="launch-mask__team-heading"><p class="launch-mask__eyebrow">CORE BUILDERS / 09</p><h2 id="launch-mask-team-title">The people behind<br>the <em>build.</em></h2></div><div class="launch-mask__team-grid" data-launch-team aria-live="polite"></div></section>
      </main>
      <footer class="launch-mask__footer"><p class="launch-mask__meta">LAUNCH WINDOW / LATE OCTOBER<br><a class="launch-mask__email" href="mailto:admin@aws.iedclbscek.in">admin@aws.iedclbscek.in</a></p><nav class="launch-mask__socials" aria-label="AWS SBG social links"><a href="https://www.meetup.com/aws-sbg-at-lbs-college-of-engineering/" target="_blank" rel="noopener noreferrer" aria-label="AWS SBG on Meetup">MU</a><a href="https://www.linkedin.com/company/aws-cloud-club-lbscek" target="_blank" rel="noopener noreferrer" aria-label="AWS SBG on LinkedIn">IN</a><a href="https://www.instagram.com/awsclub_lbscek/" target="_blank" rel="noopener noreferrer" aria-label="AWS SBG on Instagram">IG</a></nav></footer>
    </div>`;
  document.body.classList.add('launch-mask-active');
  document.body.prepend(mask);

  const backgroundState = new Map();
  const onFocusIn = (event) => { if (mask.isConnected && !mask.contains(event.target)) mask.querySelector('[data-launch-unlock] input')?.focus({ preventScroll: true }); };
  const unlock = () => {
    session.grant();
    backgroundState.forEach((state, element) => { element.inert = state.inert; if (state.ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', state.ariaHidden); });
    document.removeEventListener('focusin', onFocusIn);
    document.body.classList.remove('launch-mask-active');
    mask.remove();
    style.remove();
  };
  const lockBackground = () => {
    if (!mask.isConnected) return;
    [...document.body.children].forEach((element) => { if (element !== mask) { backgroundState.set(element, { inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }); element.inert = true; element.setAttribute('aria-hidden', 'true'); } });
    mask.querySelector('[data-launch-unlock] input')?.focus({ preventScroll: true });
  };
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const renderCoreBuilders = async () => {
    const target = mask.querySelector('[data-launch-team]');
    try {
      const response = await fetch(new URL('app.js', document.baseURI));
      if (!response.ok) throw new Error('Unable to read the existing team source.');
      const source = await response.text();
      const memberPattern = /\{ name: '([^']+)', position: '([^']+)', photo: '([^']+)', width: (\d+), height: (\d+), bio: '([^']*)', linkedin: '([^']*)', github: '([^']*)' \}/g;
      const members = [...source.matchAll(memberPattern)].map(([, name, position, photo, width, height, bio, linkedin, github]) => ({ name, position, photo, width, height, bio, linkedin, github }));
      if (!members.length) throw new Error('No existing core-builder records were found.');
      target.innerHTML = members.map((member) => {
        const socialLinks = [member.linkedin !== '#' ? `<a href="${escapeHtml(member.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(member.name)} LinkedIn">IN</a>` : '', member.github !== '#' ? `<a href="${escapeHtml(member.github)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(member.name)} GitHub">GH</a>` : ''].join('');
        const optimizedBase = member.photo.replace(/^assets\/team\//, 'assets/team/optimized/').replace(/\.[^.]+$/, '');
        return `<article class="launch-mask__member"><picture><source srcset="${escapeHtml(optimizedBase)}.avif" type="image/avif"><source srcset="${escapeHtml(optimizedBase)}.webp" type="image/webp"><img src="${escapeHtml(member.photo)}" alt="${escapeHtml(member.name)}" width="${member.width}" height="${member.height}" loading="lazy" decoding="async"></picture><div><h3>${escapeHtml(member.name)}</h3><p>${escapeHtml(member.position)}</p></div>${socialLinks ? `<span class="launch-mask__member-links">${socialLinks}</span>` : ''}</article>`;
      }).join('');
    } catch { target.hidden = true; }
  };
  mask.querySelector('[data-launch-unlock]').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = mask.querySelector('[data-launch-access-status]');
    if (form.elements.password.value === TEMPORARY_PASSWORD) unlock();
    else { status.textContent = 'Access code not recognized. The launch gate remains active.'; form.elements.password.select(); }
  });
  document.addEventListener('focusin', onFocusIn);
  renderCoreBuilders();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lockBackground, { once: true }); else lockBackground();
})();
