const fs = require('fs');
const assert = require('assert');
const shipped = fs.readdirSync('site', { recursive: true }).map(String);
for (const unsafe of ['certification-data.js', 'certification-practice.js', 'existing-questions.seed.json', 'catalog.seed.json', 'import-questions.js']) assert(!shipped.includes(unsafe), `${unsafe} must not ship to browsers`);
for (const required of ['certification-practice.html', 'certification-services.js', 'certification-cloud-flow.js', 'supabase-public-config.js']) assert(shipped.includes(required), `${required} is missing from production build`);
console.log('Public build boundary checks passed.');
