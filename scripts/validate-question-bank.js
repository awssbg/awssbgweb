/* Strict local content gate. It never contacts Supabase or writes question data. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/validate-question-bank.js path/to/questions.json');
const source = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const questions = Array.isArray(source) ? source : source.questions;
if (!Array.isArray(questions)) throw new Error('Question bank must be an array or { questions: [] }.');
const catalogSource = fs.readFileSync('certification-data.js', 'utf8');
const sandbox = {}; vm.createContext(sandbox); vm.runInContext(`${catalogSource};this.catalog=certifications`, sandbox);
const catalog = new Map(sandbox.catalog.map(certification => [certification.id, certification]));
const allowedStatuses = new Set(['draft', 'review', 'published', 'retired']);
const errors = [], seenIds = new Set(), seenText = new Set();
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

for (const [index, question] of questions.entries()) {
  const prefix = `${question.external_id || `row ${index}`}:`;
  const certification = catalog.get(question.certification);
  if (!certification) { errors.push(`${prefix} unknown certification ${question.certification || '(missing)'}`); continue; }
  const versions = new Set((certification.examVersions || [{ exam_code: certification.code }]).map(version => version.exam_code));
  if (!versions.has(question.exam_code)) errors.push(`${prefix} ${question.exam_code || '(missing)'} is not configured for ${question.certification}`);
  if (!certification.domains.includes(question.domain)) errors.push(`${prefix} unknown domain ${question.domain || '(missing)'}`);
  if (!['easy', 'medium', 'hard'].includes(question.difficulty)) errors.push(`${prefix} invalid difficulty`);
  if (!['single_answer', 'multiple_response'].includes(question.question_type)) errors.push(`${prefix} invalid question type`);
  if (!question.question_text || question.question_text.trim().length < 20) errors.push(`${prefix} question text is too short`);
  if (!question.explanation || question.explanation.trim().length < 40) errors.push(`${prefix} explanation is too short`);
  if (!allowedStatuses.has(question.publication_status)) errors.push(`${prefix} invalid publication status`);
  if (seenIds.has(`${question.certification}:${question.external_id}`)) errors.push(`${prefix} duplicate external ID`);
  seenIds.add(`${question.certification}:${question.external_id}`);
  const normalized = `${question.certification}:${normalize(question.question_text)}`;
  if (seenText.has(normalized)) errors.push(`${prefix} normalized duplicate question text`);
  seenText.add(normalized);
  const keys = new Set((question.options || []).map(option => option.key));
  if (!Array.isArray(question.options) || question.options.length < 4 || keys.size !== question.options.length || [...keys].some(key => !/^[A-Z]$/.test(key))) errors.push(`${prefix} options must contain at least four unique A-Z keys`);
  const correct = question.correct_option_keys || [];
  if (!Array.isArray(correct) || !correct.length || correct.some(key => !keys.has(key)) || (question.question_type === 'single_answer' && correct.length !== 1)) errors.push(`${prefix} invalid correct option mapping`);
  for (const reference of question.reference_links || []) try { const url = new URL(reference.url); if (!/^https:$/.test(url.protocol) || !reference.title) errors.push(`${prefix} invalid reference`); } catch { errors.push(`${prefix} malformed reference URL`); }
}
if (errors.length) { console.error(`Validation failed with ${errors.length} issue(s):\n- ${errors.join('\n- ')}`); process.exitCode = 1; }
else console.log(`Validated ${questions.length} question(s): schema, catalog, domain, version, answer mapping, and references passed.`);
