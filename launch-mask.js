/* Temporary, isolated launch gate. Delete this file and its two mount tags to reopen the site. */
(() => {
  const mask = document.createElement('aside');
  mask.id = 'launch-mask';
  mask.setAttribute('role', 'dialog');
  mask.setAttribute('aria-modal', 'true');
  mask.setAttribute('aria-label', 'AWS SBG launch status');
  mask.innerHTML = `
    <div class="launch-mask__shell">
      <header class="launch-mask__top">
        <span class="launch-mask__brand"><span class="launch-mask__chip" aria-hidden="true"></span>AWS SBG / LBSCEK</span>
        <p class="launch-mask__status">Launch build active</p>
      </header>
      <main class="launch-mask__content">
        <p class="launch-mask__eyebrow">SYSTEM STATUS / ASSEMBLING PLATFORM</p>
        <h1>THE BUILD IS<br><em>IN PROGRESS.</em></h1>
        <p class="launch-mask__copy">We are wiring the next AWS Student Builder Group experience for launch. The platform is being prepared for late October—come build with the community while the final systems come online.</p>
        <div class="launch-mask__actions">
          <a class="launch-mask__button launch-mask__button--primary" href="https://www.meetup.com/aws-sbg-at-lbs-college-of-engineering/" target="_blank" rel="noopener noreferrer">JOIN THE COMMUNITY <span aria-hidden="true">↗</span></a>
          <a class="launch-mask__button launch-mask__button--ghost" href="mailto:admin@aws.iedclbsek.in">CONTACT THE BUILD TEAM <span aria-hidden="true">↗</span></a>
        </div>
      </main>
      <footer class="launch-mask__footer">
        <p class="launch-mask__meta">LAUNCH WINDOW / LATE OCTOBER<br><a class="launch-mask__email" href="mailto:admin@aws.iedclbsek.in">admin@aws.iedclbsek.in</a></p>
        <nav class="launch-mask__socials" aria-label="AWS SBG social links">
          <a href="https://www.meetup.com/aws-sbg-at-lbs-college-of-engineering/" target="_blank" rel="noopener noreferrer" aria-label="AWS SBG on Meetup">MU</a>
          <a href="https://www.linkedin.com/company/aws-cloud-club-lbscek" target="_blank" rel="noopener noreferrer" aria-label="AWS SBG on LinkedIn">IN</a>
          <a href="https://www.instagram.com/awsclub_lbscek/" target="_blank" rel="noopener noreferrer" aria-label="AWS SBG on Instagram">IG</a>
        </nav>
      </footer>
    </div>`;

  document.body.classList.add('launch-mask-active');
  document.body.prepend(mask);

  const lockBackground = () => {
    [...document.body.children].forEach((element) => {
      if (element !== mask) {
        element.inert = true;
        element.setAttribute('aria-hidden', 'true');
      }
    });
    mask.querySelector('a')?.focus({ preventScroll: true });
  };

  document.addEventListener('focusin', (event) => {
    if (!mask.contains(event.target)) mask.querySelector('a')?.focus({ preventScroll: true });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lockBackground, { once: true });
  else lockBackground();
})();
