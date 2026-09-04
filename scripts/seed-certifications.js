/* Generate trusted local catalog seed data; this file is never shipped to the browser. */
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('certification-data.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${source};this.catalog=certifications`, sandbox);
const payload = sandbox.catalog.map(certification => {
  const weights = new Map((certification.domainDistribution || []).map(item => [item.domain, item.weight]));
  const fallbackWeight = Number((1 / certification.domains.length).toFixed(6));
  return {
    slug: certification.id, code: certification.code, name: certification.name,
    short_name: certification.shortName, level: certification.level,
    description: certification.description, official_url: certification.officialUrl,
    official_question_count: certification.exam.officialQuestionCount,
    official_duration_minutes: certification.exam.durationMinutes,
    domains: certification.domains.map((name, index) => ({ name, weight: weights.get(name) ?? fallbackWeight, display_order: index + 1 })),
    exam_versions: certification.examVersions || [{ exam_code: certification.code, version_name: certification.code, status: 'current', official_url: certification.officialUrl }]
  };
});
fs.writeFileSync('supabase/catalog.seed.json', JSON.stringify(payload, null, 2));
console.log('Created supabase/catalog.seed.json with domain weights and current exam-version metadata.');
