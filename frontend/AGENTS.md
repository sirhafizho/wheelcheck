<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git Workflow

- Commit directly to `main` and push. Do NOT create feature branches or PRs — Vercel deploys on every push to main, and PRs trigger redundant preview deployments.

## Verification

- Run `npx playwright test <spec> --project=chromium --reporter=list` for E2E tests
- Vercel preview: `https://wheelcheck-swart.vercel.app`
- HuggingFace backend: `https://sirhafizho-wheelcheck-api.hf.space/api`

## UI Layout Convention

- Content pages: `max-w-4xl` (places, detail, favorites, profile, settings, report)
- Form pages: `max-w-lg` (add-place, edit-place)
- Data-heavy pages: `max-w-7xl` (admin)
- Home: full-width (map view)
