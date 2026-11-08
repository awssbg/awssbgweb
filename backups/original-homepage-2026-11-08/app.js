// CONTENT DATA — replace every [PLACEHOLDER] value with verified community information.
const practicePath = location.protocol === 'file:' ? 'certification-practice.html' : '/certification-practice';
const navigation = [
  { label: 'Home', href: '#home' }, { label: 'About', href: '#about' }, { label: 'Events', href: '#events' },
  { label: 'Team', href: '#team' }, { label: 'Practice', href: practicePath }, { label: 'Contact', href: '#contact' }
];
const stats = [
  { value: '500+', label: 'Community members' }, { value: '8+', label: 'Events conducted' }, { value: '2', label: 'Hands-on workshops' }
];
const events = [
  { type: 'UPCOMING / WORKSHOP', title: 'Coming soon', date: 'DATE TBA', mode: 'LOCATION / MODE TBA', description: 'Details will be announced soon.' },
  { type: 'UPCOMING / COMMUNITY', title: 'Coming soon', date: 'DATE TBA', mode: 'LOCATION / MODE TBA', description: 'Details will be announced soon.' },
  { type: 'UPCOMING / HANDS-ON LAB', title: 'Coming soon', date: 'DATE TBA', mode: 'LOCATION / MODE TBA', description: 'Details will be announced soon.' }
];
// Exactly nine editable core member entries. Keep photos in assets/team/.
const coreMembers = [
  { name: 'Fathima Rasha', position: 'Lead', photo: 'assets/team/member-01.jpg', width: 1000, height: 1000, bio: 'Core team lead.', linkedin: '#', github: '#' },
  { name: 'Jyothish', position: 'Tech Lead', photo: 'assets/team/member-02.jpg', width: 1000, height: 1000, bio: 'Technical lead.', linkedin: 'https://www.linkedin.com/in/jyothish-nalinakshan/', github: 'https://github.com/gunnerjyo' },
  { name: 'Shankerdev', position: 'Design Lead', photo: 'assets/team/member-03.jpg', width: 1000, height: 1000, bio: 'Design lead.', linkedin: 'https://www.linkedin.com/in/shankar-dev-k-a28b8037a?utm_source=share_via&utm_content=profile&utm_medium=member_android', github: 'https://github.com/shankardevk' },
  { name: 'SreeVishnu', position: 'Media Lead', photo: 'assets/team/member-04.jpg', width: 1000, height: 1000, bio: 'Media lead.', linkedin: 'https://www.linkedin.com/in/sree-vishnu-p-s-790a46385/', github: '#' },
  { name: 'Vaibhav', position: 'Event Lead', photo: 'assets/team/member-05.jpg', width: 1000, height: 1000, bio: 'Event lead.', linkedin: '#', github: '#' },
  { name: 'Shasin', position: 'Core', photo: 'assets/team/member-06.jpg', width: 1000, height: 1000, bio: 'Core team member.', linkedin: '#', github: '#' },
  { name: 'Vaseem', position: 'Core', photo: 'assets/team/member-07.jpg', width: 1000, height: 1000, bio: 'Core team member.', linkedin: '#', github: '#' },
  { name: 'Diya', position: 'Core', photo: 'assets/team/member-08.jpg', width: 1000, height: 1000, bio: 'Core team member.', linkedin: '#', github: '#' },
  { name: 'Nafiya', position: 'Core', photo: 'assets/team/member-09.jpg', width: 1000, height: 1000, bio: 'Core team member.', linkedin: '#', github: '#' }
];

const $ = (selector) => document.querySelector(selector);
$('#site-nav').innerHTML = navigation.map(item => `<a href="${item.href}">${item.label}</a>`).join('');
$('#footer-nav').innerHTML = navigation.slice(1).map(item => `<a href="${item.href}">${item.label}</a>`).join('');
$('#stats-grid').innerHTML = stats.map((item, i) => `<article class="stat"><span class="mono">0${i + 1}</span><strong>${item.value}</strong><p>${item.label}</p></article>`).join('');
$('#events-list').innerHTML = events.map((event, i) => `<article class="event-row"><div class="event-number mono">0${i + 1}</div><div><p class="event-type mono">${event.type}</p><h3>${event.title}</h3><p>${event.description}</p></div><div class="event-meta mono"><span>${event.date}</span><span>${event.mode}</span></div><a class="event-link" href="#contact" aria-label="Register interest for ${event.title}">↗</a></article>`).join('');
$('#team-grid').innerHTML = coreMembers.map((member, i) => {
  const optimizedBase = member.photo.replace(/^assets\/team\//, 'assets/team/optimized/').replace(/\.[^.]+$/, '');
  const imageLoading = i === 0 ? 'eager' : 'lazy';
  const priority = i === 0 ? 'high' : 'auto';
  const photoMarkup = member.photo ? `<picture><source srcset="${optimizedBase}.avif" type="image/avif"><source srcset="${optimizedBase}.webp" type="image/webp"><img src="${member.photo}" alt="${member.name}" width="${member.width}" height="${member.height}" loading="${imageLoading}" decoding="async" fetchpriority="${priority}"></picture>` : `<span class="member-placeholder mono">PHOTO<br>0${i + 1}</span>`;
  return `<article class="member-card"><div class="member-photo">${photoMarkup}<span class="member-index mono">0${i + 1}</span></div><div class="member-info"><div><h3>${member.name}</h3><p class="mono">${member.position}</p></div><div class="member-reveal"><a href="${member.linkedin}" aria-label="${member.name} LinkedIn">in</a><a href="${member.github}" aria-label="${member.name} GitHub">gh</a></div></div></article>`;
}).join('');
$('#year').textContent = new Date().getFullYear();
const toggle = $('.menu-toggle'); const nav = $('#site-nav');
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!open)); nav.classList.toggle('open', !open); });
nav.addEventListener('click', () => { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); });
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); }), { threshold: .08 });
document.querySelectorAll('.section, .stats-section, .cta-section').forEach(el => { el.classList.add('reveal'); observer.observe(el); });
