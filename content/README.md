# Question authoring workflow

Author records as JSON using `question-bank.schema.json`. Every new record starts as `draft`.

1. Validate: `node scripts/validate-question-bank.js path/to/bank.json`
2. Review duplicate signals: `node scripts/report-question-quality.js path/to/bank.json --write-report`
3. Obtain technical and explanation review.
4. Set reviewed records to `published` only after review.
5. Import with `node scripts/import-questions.js path/to/bank.json` using the trusted local service-role environment.

The importer and these content files must never be served in the public build. Questions require a canonical certification slug, an explicit current or historical exam code, a configured domain, stable option keys, and official reference URLs when a reference is supplied.
