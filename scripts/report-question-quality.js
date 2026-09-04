/* Local, non-destructive question-bank quality report. No network access. */
const fs = require('fs');
const path = require('path');

const input = process.argv.find(arg => arg.endsWith('.json')) || 'supabase/existing-questions.seed.json';
const source = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const questions = Array.isArray(source) ? source : source.questions;
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const tokens = value => new Set(normalize(value).split(' ').filter(token => token.length > 2));
const similarity = (a, b) => {
  const left = tokens(a), right = tokens(b);
  const union = new Set([...left, ...right]);
  return union.size ? [...left].filter(token => right.has(token)).length / union.size : 0;
};
const grouped = (key, items = questions) => {
  const map = new Map();
  for (const item of items) { const value = key(item); if (!value) continue; map.set(value, [...(map.get(value) || []), item]); }
  return [...map.values()].filter(group => group.length > 1).map(group => group.map(item => item.external_id || item.id));
};
const optionSignature = question => (question.options || []).map(option => normalize(option.text || option)).sort().join('|');
const nearDuplicates = [];
for (let left = 0; left < questions.length; left++) for (let right = left + 1; right < questions.length; right++) {
  const score = similarity(questions[left].question_text || questions[left].question, questions[right].question_text || questions[right].question);
  if (score >= 0.82) nearDuplicates.push({ left: questions[left].external_id || questions[left].id, right: questions[right].external_id || questions[right].id, similarity: Number(score.toFixed(3)) });
}
const counts = {};
for (const question of questions) {
  const certification = question.certification || question.certification_slug || 'unknown';
  const record = counts[certification] ||= { total: 0, domains: {}, difficulty: {}, question_types: {} };
  record.total++; record.domains[question.domain] = (record.domains[question.domain] || 0) + 1;
  record.difficulty[question.difficulty || 'missing'] = (record.difficulty[question.difficulty || 'missing'] || 0) + 1;
  record.question_types[question.question_type || question.type || 'missing'] = (record.question_types[question.question_type || question.type || 'missing'] || 0) + 1;
}
const report = {
  source: path.normalize(input), total_questions: questions.length, by_certification: counts,
  duplicate_external_ids: grouped(question => question.external_id || question.id),
  exact_question_text_duplicates: grouped(question => question.question_text || question.question),
  normalized_question_text_duplicates: grouped(question => normalize(question.question_text || question.question)),
  duplicate_option_sets: grouped(optionSignature),
  near_duplicate_candidates: nearDuplicates
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--write-report')) {
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/question-quality-report.json', JSON.stringify(report, null, 2));
  console.error('Wrote reports/question-quality-report.json');
}
