# Task Completion Checklist

When completing any task on this project, ensure:

## Code Changes
1. ✅ Code follows style conventions (Kotlin conventions / TypeScript strict)
2. ✅ All interactive UI elements have accessibility labels
3. ✅ Touch targets are ≥ 48x48dp
4. ✅ Color contrast ≥ 4.5:1
5. ✅ No time-limited interactions added
6. ✅ Works at 200% font scale (if UI change)

## Testing
1. ✅ Unit tests pass: `./gradlew test` (backend) / `npm test` (frontend)
2. ✅ Build passes: `./gradlew build` / `npm run build`
3. ✅ Lint passes: `./gradlew ktlintCheck` / `npm run lint`

## Before Pushing
1. ✅ No secrets or credentials in code
2. ✅ No hardcoded URLs (use env vars)
3. ✅ Bilingual strings added (BM + EN) for any user-facing text
4. ✅ API endpoints documented in OpenAPI
5. ✅ Commit message is descriptive

## Accessibility (for any UI change)
1. ✅ Test with keyboard navigation
2. ✅ Verify screen reader announces correctly
3. ✅ List view alternative exists for any map-based feature
4. ✅ No multipoint gestures without single-finger alternative
