/* Build non-destructive editorial reports from local question JSON. */
const fs = require('fs');
const path = require('path');
const input = process.argv[2] || 'supabase/existing-questions.seed.json';
const source = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const questions = Array.isArray(source) ? source : source.questions;
const qualityPath = path.resolve('reports/question-quality-report.json');
const quality = JSON.parse(fs.readFileSync(qualityPath, 'utf8'));
const now = new Date().toISOString();
const byId = new Map(questions.map(question => [question.external_id || question.id, question]));
const duplicateGroups = quality.normalized_question_text_duplicates.map((ids, index) => ({
  review_id: `SAA-DUP-${String(index + 1).padStart(2, '0')}`,
  question_ids: ids,
  similarity: 1,
  reason: 'Normalized question text is identical; the matching option set is also reported.',
  recommended_action: 'REVIEW — retain one canonical record only as a reference; create and review original replacement questions with new external IDs before retiring duplicate records.',
  records: ids.map(id => ({ id, domain: byId.get(id)?.domain, difficulty: byId.get(id)?.difficulty }))
}));
const review = { generated_at: now, source: input, groups: duplicateGroups, automatic_changes: 'none' };
const manifest = Object.entries(quality.by_certification).map(([certification, details]) => ({
  certification,
  exam_versions: [...new Set(questions.filter(question => question.certification === certification).map(question => question.exam_code).filter(Boolean))],
  question_count: details.total,
  published_count: questions.filter(question => question.certification === certification && (question.publication_status || 'draft') === 'published').length,
  draft_count: questions.filter(question => question.certification === certification && (question.publication_status || 'draft') === 'draft').length,
  review_count: questions.filter(question => question.certification === certification && (question.publication_status || 'draft') === 'review').length,
  retired_count: questions.filter(question => question.certification === certification && (question.publication_status || 'draft') === 'retired').length,
  exact_duplicate_groups: duplicateGroups.length,
  qa_ready: duplicateGroups.length === 0,
  last_validated_at: now
}));
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/saa-duplicate-review.json', JSON.stringify(review, null, 2));
fs.writeFileSync('reports/question-bank-manifest.json', JSON.stringify(manifest, null, 2));
const markdown = ['# SAA duplicate editorial review', '', `Generated: ${now}`, '', '| Group | Question IDs | Signal | Recommended action |', '| --- | --- | --- | --- |', ...duplicateGroups.map(group => `| ${group.review_id} | ${group.question_ids.join(', ')} | normalized text + options | Review; author replacements before retirement |`), ''];
fs.writeFileSync('reports/saa-duplicate-review.md', markdown.join('\n'));
console.log(`Wrote ${duplicateGroups.length} duplicate-review group(s) and the question-bank manifest.`);
