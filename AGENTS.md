# WheelCheck — Infrastructure & Deployment Guide

This file documents all infrastructure access, deployment procedures, and environment configuration so any AI agent or developer can work on this project without prior context.

## Architecture Overview

| Component | Stack | Hosted On | URL |
|-----------|-------|-----------|-----|
| Frontend | Next.js 16 + Tailwind + Leaflet | Vercel | https://wheelcheck-swart.vercel.app |
| Backend | Spring Boot 3.3 + Kotlin + PostGIS | HuggingFace Spaces | https://sirhafizho-wheelcheck-api.hf.space/api |
| Database | PostgreSQL 17 + PostGIS + pgvector | Supabase | Project ref: `luiszfcgmpznsosddsaf` |
| Auth | Supabase Auth (Google + GitHub OAuth) | Supabase | Same project as database |
| Map Tiles | OpenStreetMap (free, no API key) | OSM CDN | `tile.openstreetmap.org` |

---

## GitHub Repository

- **Repo:** https://github.com/sirhafizho/wheelcheck
- **Auth:** Uses `$GITHUB_PAT_TOKEN` from `~/.zshrc`
- **Workflow:** Commit directly to `main` and push. No PRs — Vercel auto-deploys on push.

---

## Frontend Deployment (Vercel)

- **Auto-deploys** on every push to `main` branch
- **Project:** `wheelcheck` under `hafizs-projects-089e38f1`
- **Dashboard:** https://vercel.com (login required)
- **CLI:** `vercel` (run `vercel login` if token expired)

### Environment Variables (Vercel Dashboard > Settings > Environment Variables)

| Variable | Value | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://sirhafizho-wheelcheck-api.hf.space/api` | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://luiszfcgmpznsosddsaf.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_YIxrr3wocmdI4Lgd6dWMgA_mALPVFPX` | Production, Preview |
| `NEXT_PUBLIC_MAP_TILE_URL` | (uses default OSM in code) | Production |
| `NEXT_PUBLIC_DEFAULT_LAT` | `3.139` | Production |
| `NEXT_PUBLIC_DEFAULT_LNG` | `101.6869` | Production |
| `NEXT_PUBLIC_DEFAULT_ZOOM` | `13` | Production |

### Local Frontend Dev

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run test:e2e     # Playwright tests
```

Local env: `frontend/.env.local` (gitignored)

---

## Backend Deployment (HuggingFace Spaces)

- **Space:** https://huggingface.co/spaces/sirhafizho/wheelcheck-api
- **API URL:** https://sirhafizho-wheelcheck-api.hf.space/api
- **Deploys via git push** to the HuggingFace repo (NOT the GitHub repo)

### How to Deploy Backend Changes

```bash
# 1. Clone the HuggingFace Space repo
git clone https://sirhafizho:$HF_TOKEN@huggingface.co/spaces/sirhafizho/wheelcheck-api /tmp/wheelcheck-hf-deploy

# 2. Copy updated backend source files
cp -r backend/src/ /tmp/wheelcheck-hf-deploy/src/
cp backend/build.gradle.kts /tmp/wheelcheck-hf-deploy/build.gradle.kts
# Copy any other changed files (Dockerfile, etc.) as needed

# 3. Commit and push
cd /tmp/wheelcheck-hf-deploy
git add -A
git commit -m "description of changes"
git push origin main

# 4. HuggingFace rebuilds automatically (takes 3-5 min for Spring Boot)
```

### HuggingFace Credentials

- **Token:** `$HF_TOKEN` (set in `~/.zshrc`)
- **Username:** `sirhafizho`
- **Git URL:** `https://huggingface.co/spaces/sirhafizho/wheelcheck-api`

### HuggingFace Environment Variables (Space Settings > Variables and secrets)

| Name | Type | Purpose |
|------|------|---------|
| `SUPABASE_URL` | Variable | `https://luiszfcgmpznsosddsaf.supabase.co` — for JWKS public key fetch |
| `DATABASE_URL` | Secret | PostgreSQL connection string (Supabase pooler) |
| `DATABASE_USERNAME` | Secret | DB username |
| `DATABASE_PASSWORD` | Secret | DB password |
| `JWT_SECRET` | Secret | Legacy app JWT signing key |

### Local Backend Dev

```bash
cd backend
./gradlew bootRun    # http://localhost:8080
./gradlew test
```

Local env: `backend/.env` (gitignored, auto-loaded by bootRun task)

---

## Supabase

- **Project ref:** `luiszfcgmpznsosddsaf`
- **Dashboard:** https://supabase.com/dashboard/project/luiszfcgmpznsosddsaf
- **URL:** `https://luiszfcgmpznsosddsaf.supabase.co`
- **Publishable key:** `sb_publishable_YIxrr3wocmdI4Lgd6dWMgA_mALPVFPX`

### Supabase MCP Server

Configured at `~/.config/devin/mcp_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.supabase.com/mcp?project_ref=luiszfcgmpznsosddsaf&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
      ]
    }
  }
}
```

Use `mcp_list_tools` then `mcp_call_tool` to interact. Available tools include `execute_sql`, `list_tables`, `apply_migration`, `search_docs`, `get_advisors`, etc.

### Auth Providers (configured in Supabase Dashboard > Authentication > Providers)

- **Google OAuth:** Enabled (credentials in Google Cloud Console)
- **GitHub OAuth:** Enabled (credentials in GitHub Developer Settings)
- **Email/Password:** Enabled

### JWT Signing

Supabase uses **ES256 (ECC P-256)** for JWT signing. The backend fetches the public key from the JWKS endpoint at startup:

```
https://luiszfcgmpznsosddsaf.supabase.co/auth/v1/.well-known/jwks.json
```

The legacy HS256 shared secret is **not used** — the backend verifies tokens using the ECC public key.

### Auth Redirect URLs (Supabase Dashboard > Authentication > URL Configuration)

- Site URL: `https://wheelcheck-swart.vercel.app`
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://wheelcheck-swart.vercel.app/auth/callback`

---

## Map Tiles

Using **free OpenStreetMap tiles** (`tile.openstreetmap.org`). No API key required. CSS filters applied in `frontend/src/app/globals.css` to desaturate tiles for a clean, minimal look. Dark mode uses CSS invert+hue-rotate.

Previous CARTO/CartoDB tiles were removed because they now require an API key.

---

## Key File Locations

| File | Purpose |
|------|---------|
| `frontend/.env.local` | Frontend local env (gitignored) |
| `frontend/.env.local.example` | Template for frontend env |
| `backend/.env` | Backend local env (gitignored, auto-loaded) |
| `backend/.env.example` | Template for backend env |
| `frontend/src/lib/supabase/` | Supabase client utilities (browser, server, middleware) |
| `frontend/src/hooks/useAuth.ts` | Supabase auth hook (Google, GitHub, email login) |
| `frontend/src/app/auth/callback/route.ts` | OAuth callback handler |
| `backend/src/main/kotlin/com/wheelcheck/auth/` | JWT validation + auth filter |
| `_bmad/docs/` | Product specs, stories, architecture docs |
