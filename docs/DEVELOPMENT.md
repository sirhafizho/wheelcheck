# Development Guide

## Prerequisites

- Java 21+ (recommend SDKMAN for management)
- Node.js 20+ (recommend nvm)
- PostgreSQL 16+ with PostGIS extension
- Docker & Docker Compose (recommended)

## Quick Start with Docker

```bash
git clone https://github.com/sirhafizho/wheelcheck.git
cd wheelcheck
docker compose up
```

This starts:
- PostgreSQL + PostGIS on port 5432
- Spring Boot API on port 8080
- Next.js frontend on port 3000

## Manual Setup

### Database

```bash
# Install PostGIS (macOS)
brew install postgis

# Create database
createdb wheelcheck
psql wheelcheck -c "CREATE EXTENSION postgis;"
```

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
./gradlew bootRun
```

API available at http://localhost:8080
Swagger UI at http://localhost:8080/swagger-ui.html

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with API URL
npm install
npm run dev
```

Frontend available at http://localhost:3000

## Testing

### Backend
```bash
cd backend
./gradlew test          # Unit tests
./gradlew integrationTest  # Integration tests (needs DB)
```

### Frontend
```bash
cd frontend
npm test                # Unit tests
npm run test:e2e        # Playwright E2E tests
```

## Project Conventions

### Backend (Kotlin)
- Package structure: `com.wheelcheck.{module}`
- Modules: `place`, `review`, `photo`, `user`, `auth`
- Tests mirror source structure under `src/test/`

### Frontend (TypeScript)
- App Router (Next.js 14+)
- Components in `src/components/`
- API integration in `src/lib/api/`
- i18n files in `public/locales/{lang}/`

## Environment Variables

### Backend (.env)
```
DATABASE_URL=jdbc:postgresql://localhost:5432/wheelcheck
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
JWT_SECRET=your-secret-here
PHOTO_STORAGE_PATH=./uploads
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```
