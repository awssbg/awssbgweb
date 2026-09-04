/* Trusted local question importer. It validates canonical and database slugs before any question write. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-questions.js path/to/questions.json');
const source = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const records = Array.isArray(source) ? source : source.questions;
if (!Array.isArray(records)) throw new Error('Input must be an array or { questions: [] }.');
const shouldUpdate = process.argv.includes('--update');
const shouldPublish = process.argv.includes('--publish');

const browserData = fs.readFileSync(path.resolve('certification-data.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${browserData};this.catalog=certifications`, sandbox);
const canonicalSlugs = new Set(sandbox.catalog.map(certification => certification.id));

const validationErrors = [];
const seenExternalIds = new Set();
for (const [index, question] of records.entries()) {
  const valid = question.certification && question.exam_code && question.external_id && question.domain && question.question_text && question.explanation && ['single_answer', 'multiple_response'].includes(question.question_type) && ['easy', 'medium', 'hard'].includes(question.difficulty || 'medium') && Array.isArray(question.options) && question.options.length >= 2 && Array.isArray(question.correct_option_keys) && question.correct_option_keys.length;
  if (!valid) { validationErrors.push(`index ${index}: certification, exam_code, external_id, domain, difficulty, question type, options, correct option keys, and explanation are required.`); continue; }
  if (!canonicalSlugs.has(question.certification)) { validationErrors.push(`${question.external_id}: unknown canonical certification slug ${question.certification}`); continue; }
  const externalId = `${question.certification}:${question.external_id}`;
  if (seenExternalIds.has(externalId)) validationErrors.push(`${question.external_id}: duplicate external ID in this batch.`);
  seenExternalIds.add(externalId);
  const optionKeys = new Set(question.options.map(option => option.key));
  if (optionKeys.size !== question.options.length || question.correct_option_keys.some(key => !optionKeys.has(key))) validationErrors.push(`${question.external_id}: invalid or duplicate option keys.`);
  if (question.options.length < 4 || question.options.some(option => !option.key || !option.text)) validationErrors.push(`${question.external_id}: at least four complete options are required.`);
  if (question.question_type === 'single_answer' && question.correct_option_keys.length !== 1) validationErrors.push(`${question.external_id}: a single-answer question must have exactly one correct option.`);
  if (question.question_type === 'multiple_response' && question.correct_option_keys.length < 2) validationErrors.push(`${question.external_id}: a multiple-response question must have at least two correct options.`);
}
if (validationErrors.length) throw new Error(`Question batch rejected before writes:\n- ${validationErrors.join('\n- ')}`);

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
  const versions = await api('certification_exam_versions?select=id,certification_id,exam_code');
  const versionByCertificationAndCode = new Map(versions.map(version => [`${version.certification_id}:${version.exam_code}`, version]));
  const missingVersions = [...new Set(records.filter(question => !versionByCertificationAndCode.has(`${certificationsBySlug.get(question.certification).id}:${question.exam_code}`)).map(question => `${question.certification} / ${question.exam_code}`))];
  if (missingVersions.length) throw new Error(`Database is missing exam version(s): ${missingVersions.join(', ')}. Run npm.cmd run certifications:seed successfully before importing questions.`);
  return { certificationsBySlug, domainByCertificationAndName, versionByCertificationAndCode };
}

(async () => {
  const { certificationsBySlug, domainByCertificationAndName, versionByCertificationAndCode } = await preflight();
  let created = 0;
  let skipped = 0;
  for (const question of records) {
    const certification = certificationsBySlug.get(question.certification);
    const domain = domainByCertificationAndName.get(`${certification.id}:${question.domain}`);
    const examVersion = versionByCertificationAndCode.get(`${certification.id}:${question.exam_code}`);
    const existing = (await api(`questions?certification_id=eq.${certification.id}&external_id=eq.${encodeURIComponent(question.external_id)}&select=id`))[0];
    if (existing && !shouldUpdate) { skipped++; continue; }
    const [storedQuestion] = await api('questions', 'POST', [{
      id: existing?.id, certification_id: certification.id, exam_version_id: examVersion.id, domain_id: domain.id, external_id: question.external_id,
      question_text: question.question_text, question_type: question.question_type, difficulty: question.difficulty || 'medium',
      explanation: question.explanation, reference_links: question.reference_links || [], active: question.active !== false,
      // Publication is deliberately opt-in. Draft/review records never reach the
      // public catalog or an exam attempt unless an authorized operator supplies --publish.
      publication_status: shouldPublish ? 'published' : (question.publication_status || 'draft'), version: question.version || 1
    }]);
    await api(`question_answers?question_id=eq.${storedQuestion.id}`, 'DELETE');
    await api(`question_options?question_id=eq.${storedQuestion.id}`, 'DELETE');
    const options = await api('question_options', 'POST', question.options.map((option, index) => ({ question_id: storedQuestion.id, option_key: option.key, option_text: option.text, display_order: index + 1, is_active: true })));
    const correctOptionIds = question.correct_option_keys.map(optionKey => options.find(option => option.option_key === optionKey).id);
    await api('question_answers', 'POST', [{ question_id: storedQuestion.id, correct_option_ids: correctOptionIds }]);
    existing ? skipped++ : created++;
  }
  console.log(`Import complete: ${created} created, ${skipped} existing/skipped, ${records.length} validated, publication=${shouldPublish ? 'published' : 'source-status'}.`);
})().catch(error => { console.error(`Import failed: ${error.message}`); process.exitCode = 1; });
