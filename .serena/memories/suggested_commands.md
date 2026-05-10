# Suggested Commands

## System (macOS / Darwin)
- `git`, `ls`, `cd`, `grep`, `find` — standard unix tools
- `brew` — package manager

## Backend (Spring Boot Kotlin)
```bash
cd backend
./gradlew bootRun          # Run the backend
./gradlew test             # Run unit tests
./gradlew integrationTest  # Run integration tests
./gradlew build            # Full build
./gradlew ktlintCheck      # Lint check
./gradlew ktlintFormat     # Auto-format
```

## Frontend (Next.js)
```bash
cd frontend
npm install                # Install dependencies
npm run dev                # Dev server
npm run build              # Production build
npm run lint               # ESLint
npm test                   # Jest unit tests
npm run test:e2e           # Playwright E2E
```

## Docker
```bash
docker compose up          # Start all services
docker compose down        # Stop all services
docker compose up --build  # Rebuild and start
```

## Git
```bash
git add -A && git commit -m "message"
git push origin main
export GITHUB_TOKEN=$GITHUB_PAT_TOKEN  # For gh CLI
gh pr create --fill
gh issue create --title "..." --body "..."
```

## Database
```bash
# With Docker
docker compose exec db psql -U postgres wheelcheck

# Manual
psql wheelcheck
```

## Useful
```bash
npx skills find <query>    # Search for agent skills
npx skills add <pkg> -y    # Install a skill
```
