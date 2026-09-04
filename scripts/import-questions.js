/* Trusted local question importer. It validates canonical and database slugs before any question write. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-questions.js path/to/questions.json');
const source = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const records = Array.isArray(source) ? source : source.questions;
if (!Array.isArray(records)) throw new Error('Input must be an array or { questions: [] }.');

const browserData = fs.readFileSync(path.resolve('certification-data.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${browserData};this.catalog=certifications`, sandbox);
const canonicalSlugs = new Set(sandbox.catalog.map(certification => certification.id));

for (const [index, question] of records.entries()) {
  const valid = question.certification && question.external_id && question.domain && question.question_text && question.explanation && ['single_answer', 'multiple_response'].includes(question.question_type) && Array.isArray(question.options) && question.options.length >= 2 && Array.isArray(question.correct_option_keys) && question.correct_option_keys.length;
  if (!valid) throw new Error(`Invalid question at index ${index}: certification, external_id, domain, options, correct_option_keys and explanation are required.`);
  if (!canonicalSlugs.has(question.certification)) throw new Error(`Question ${question.external_id} uses unknown canonical certification slug: ${question.certification}`);
  const optionKeys = new Set(question.options.map(option => option.key));
  if (optionKeys.size !== question.options.length || question.correct_option_keys.some(key => !optionKeys.has(key))) throw new Error(`Invalid option keys for ${question.external_id}.`);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally. Never use this script in browser code.');
async function api(route, method = 'GET', body) {
  const response = await fetch(`${url}/rest/v1/${route}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
    body: body && JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${method} ${route}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function preflight() {
  const databaseCertifications = await api('certifications?select=id,slug');
  const certificationsBySlug = new Map(databaseCertifications.map(certification => [certification.slug, certification]));
  const requiredSlugs = [...new Set(records.map(question => question.certification))];
  const missingSlugs = requiredSlugs.filter(slug => !certificationsBySlug.has(slug));
  if (missingSlugs.length) throw new Error(`Database is missing certification slug(s): ${missingSlugs.join(', ')}. Run npm.cmd run certifications:seed successfully before importing questions.`);

  const domains = await api('certification_domains?select=id,certification_id,name');
  const domainByCertificationAndName = new Map(domains.map(domain => [`${domain.certification_id}:${domain.name}`, domain]));
  const missingDomains = [...new Set(records.filter(question => !domainByCertificationAndName.has(`${certificationsBySlug.get(question.certification).id}:${question.domain}`)).map(question => `${question.certification} / ${question.domain}`))];
  if (missingDomains.length) throw new Error(`Database is missing certification domain(s): ${missingDomains.join(', ')}. Run npm.cmd run certifications:seed successfully before importing questions.`);
  return { certificationsBySlug, domainByCertificationAndName };
}

(async () => {
  const { certificationsBySlug, domainByCertificationAndName } = await preflight();
  let created = 0;
  let skipped = 0;
  for (const question of records) {
    const certification = certificationsBySlug.get(question.certification);
    const domain = domainByCertificationAndName.get(`${certification.id}:${question.domain}`);
    const existing = (await api(`questions?certification_id=eq.${certification.id}&external_id=eq.${encodeURIComponent(question.external_id)}&select=id`))[0];
    if (existing && !process.argv.includes('--update')) { skipped++; continue; }
    const [storedQuestion] = await api('questions', 'POST', [{
      id: existing?.id, certification_id: certification.id, domain_id: domain.id, external_id: question.external_id,
      question_text: question.question_text, question_type: question.question_type, difficulty: question.difficulty || 'medium',
      explanation: question.explanation, reference_links: question.reference_links || [], active: question.active !== false, version: question.version || 1
    }]);
    await api(`question_options?question_id=eq.${storedQuestion.id}`, 'DELETE');
    const options = await api('question_options', 'POST', question.options.map((option, index) => ({ question_id: storedQuestion.id, option_key: option.key, option_text: option.text, display_order: index + 1, is_active: true })));
    const correctOptionIds = question.correct_option_keys.map(optionKey => options.find(option => option.option_key === optionKey).id);
    await api('question_answers', 'POST', [{ question_id: storedQuestion.id, correct_option_ids: correctOptionIds }]);
    existing ? skipped++ : created++;
  }
  console.log(`Import complete: ${created} created, ${skipped} existing/skipped, ${records.length} validated.`);
})().catch(error => { console.error(`Import failed: ${error.message}`); process.exitCode = 1; });
