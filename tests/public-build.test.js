const fs = require('fs');
const assert = require('assert');
const shipped = fs.readdirSync('site', { recursive: true }).map(String);
for (const unsafe of ['certification-data.js', 'certification-practice.js', 'existing-questions.seed.json', 'catalog.seed.json', 'import-questions.js']) assert(!shipped.includes(unsafe), `${unsafe} must not ship to browsers`);
for (const required of ['certification-practice.html', 'certification-services.js', 'certification-cloud-flow.js', 'certification-auth.css', 'certification-mobile.css', 'supabase-public-config.js']) assert(shipped.includes(required), `${required} is missing from production build`);
for (const file of shipped) {
  const full = `site/${file.replaceAll('\\','/')}`;
  if (!fs.statSync(full).isFile()) continue;
  const contents = fs.readFileSync(full, 'utf8');
  for (const unsafe of ['SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'sb_secret_', 'correctAnswer', 'questionBank']) assert(!contents.includes(unsafe), `${unsafe} leaked into ${file}`);
}
console.log('Public build boundary checks passed.');
