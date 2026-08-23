# Story: Social Login (Google + GitHub) via Supabase Auth

**Status:** Draft
**Date:** 2026-08-20

## Problem Statement

WheelCheck currently requires email + password registration to use authenticated features (submitting reviews, saving favorites, adding places, commenting). This creates friction for users who want to contribute quickly. Many users abandon sign-up when faced with form-based registration, especially on mobile devices.

Adding social login (Google and GitHub) lets users authenticate with a single tap using accounts they already have, dramatically reducing the barrier to contribution.

## Architecture Decision: Supabase Auth

**Chosen approach:** Replace the custom JWT auth system with Supabase Auth.

**Rationale:**
- WheelCheck already uses Supabase for database hosting (project ref: `luiszfcgmpznsosddsaf`)
- Supabase Auth provides built-in OAuth for Google, GitHub, and 20+ other providers
- `@supabase/ssr` handles Next.js cookie-based sessions, token refresh, and SSR automatically
- Free tier supports unlimited auth users
- Eliminates need to maintain custom JWT issuance, bcrypt hashing, token expiry, and lockout logic
- Supabase JWTs can be validated by the Spring Boot backend using the project's JWT secret

**What changes:**

| Component | Before | After |
|-----------|--------|-------|
| Frontend auth | `localStorage` JWT + manual API calls to `/api/auth/*` | Supabase client (`@supabase/ssr`) + cookie-based sessions |
| OAuth providers | None | Google, GitHub (toggle-on in Supabase dashboard) |
| Email/password | Custom backend endpoints | Supabase Auth (email+password still supported) |
| Backend JWT validation | HMAC-SHA256 with `app.jwt.secret` | Validate Supabase JWT (HS256 with Supabase JWT secret) |
| Session storage | `localStorage` (4 keys) | HTTP-only cookies via `@supabase/ssr` |
| Token refresh | None (24h expiry, then re-login) | Automatic via Supabase client |

## Current State

### Frontend (`/profile` page)
- Email + password login/register forms
- JWT stored in `localStorage` under `wheelcheck_token`
- Profile data stored in `wheelcheck_user_id`, `wheelcheck_user_name`, `wheelcheck_user_email`
- Token sent as `Authorization: Bearer <token>` header to backend
- No auth context/provider - each page reads localStorage directly

### Backend (Spring Boot)
- `AuthController.kt` - `/api/auth/register` and `/api/auth/login` endpoints
- `AuthService.kt` - bcrypt password validation, lockout logic
- `JwtTokenProvider.kt` - HMAC-SHA256 JWT generation/validation
- `JwtAuthFilter.kt` - extracts JWT from `Authorization` header
- `SecurityConfig.kt` - endpoint-level auth rules

## Implementation Plan

### Phase 1: Frontend - Supabase Auth Integration

#### 1.1 Install dependencies
```bash
cd frontend
npm install @supabase/supabase-js @supabase/ssr
```

#### 1.2 Environment variables
Add to `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://luiszfcgmpznsosddsaf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-dashboard>
```

#### 1.3 Create Supabase client utilities
New files:
- `src/lib/supabase/client.ts` - Browser client (for Client Components)
- `src/lib/supabase/server.ts` - Server client (for Server Components / Route Handlers)
- `src/lib/supabase/middleware.ts` - Middleware client (for token refresh)

#### 1.4 Update middleware
Update `src/middleware.ts` to:
- Refresh Supabase auth tokens on every request (via `@supabase/ssr`)
- Continue handling `next-intl` locale routing

#### 1.5 Create auth context/hook
New file: `src/hooks/useAuth.ts`
- Wraps Supabase auth state
- Exposes: `user`, `session`, `isLoggedIn`, `signInWithGoogle()`, `signInWithGitHub()`, `signInWithEmail()`, `signUp()`, `signOut()`
- Listens to `onAuthStateChange` for reactive updates

#### 1.6 Update Profile page (`/profile`)
- Replace manual login/register forms with:
  1. "Continue with Google" button (prominent, primary)
  2. "Continue with GitHub" button
  3. Divider: "or use email"
  4. Existing email/password form (collapsed by default)
- Remove all `localStorage` auth logic
- Use `useAuth()` hook instead
- Keep existing profile display (avatar, stats, review history, saved places link)

#### 1.7 Create auth callback route
New file: `src/app/auth/callback/route.ts`
- Handles OAuth redirect callback from Supabase
- Exchanges auth code for session
- Redirects to profile page

#### 1.8 Update API client
Update `src/lib/api.ts`:
- Get Supabase session token instead of localStorage token
- Pass `Authorization: Bearer <supabase-access-token>` to backend

#### 1.9 Update all auth consumers
Pages/components that read auth from localStorage:
- `src/app/[locale]/profile/page.tsx` - main auth page
- `src/app/[locale]/add-place/page.tsx` - requires auth
- `src/app/[locale]/favorites/page.tsx` - requires auth
- `src/app/[locale]/admin/page.tsx` - requires admin role
- `src/components/places/CommentSection.tsx` - uses token for comments
- `src/components/report/ReportWizard.tsx` - uses token for reports
- `src/hooks/useFavorite.ts` - uses token for favorites

All should use `useAuth()` hook instead of direct localStorage access.

#### 1.10 Cleanup
- Remove `STORAGE_KEYS` constants from profile page
- Remove `parseToken()`, `getStoredProfile()`, `persistProfile()`, `clearStoredSession()` functions
- Remove direct `fetch` calls to `/api/auth/login` and `/api/auth/register`

### Phase 2: Backend - Supabase JWT Validation

#### 2.1 Update `JwtTokenProvider.kt`
- Accept Supabase JWTs (signed with Supabase JWT secret)
- Extract `sub` (Supabase user UUID), `email`, and `role` from Supabase JWT claims
- The Supabase JWT secret is available in: Dashboard > Settings > API > JWT Secret

#### 2.2 Update `JwtAuthFilter.kt`
- No structural changes needed - it already extracts `Authorization: Bearer` tokens
- The filter calls `JwtTokenProvider.validateToken()` which will now validate Supabase JWTs

#### 2.3 User sync
- When backend receives a request with a valid Supabase JWT for a user not in the `users` table, auto-create the user record
- Extract `email`, `user_metadata.full_name` (or `user_metadata.name`) from the JWT or Supabase user endpoint
- This replaces the explicit `/api/auth/register` flow

#### 2.4 Deprecate auth endpoints
- Mark `/api/auth/login` and `/api/auth/register` as deprecated
- Keep them temporarily for backward compatibility
- Remove in a future release

### Phase 3: Supabase Dashboard Configuration

#### 3.1 Enable Google OAuth
1. Go to Supabase Dashboard > Authentication > Providers > Google
2. Enable Google provider
3. Add Google OAuth Client ID and Secret (from Google Cloud Console)
4. Set redirect URL to: `https://luiszfcgmpznsosddsaf.supabase.co/auth/v1/callback`
5. In Google Cloud Console, add authorized redirect URI

#### 3.2 Enable GitHub OAuth
1. Go to Supabase Dashboard > Authentication > Providers > GitHub
2. Enable GitHub provider
3. Create GitHub OAuth App (Settings > Developer settings > OAuth Apps)
4. Set callback URL to Supabase callback URL
5. Add Client ID and Secret to Supabase dashboard

#### 3.3 Configure redirect URLs
- Add `https://wheelcheck-swart.vercel.app` to allowed redirect URLs
- Add `http://localhost:3000` for local development

## UI Design

### Logged-out state (Profile page)

```
+------------------------------------------+
|              [User icon]                 |
|              Profile                     |
|  Sign in to track your contributions     |
|                                          |
|  +------------------------------------+  |
|  |  [G]  Continue with Google         |  |  <- White bg, Google colors
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  [GH] Continue with GitHub         |  |  <- Dark bg, white text
|  +------------------------------------+  |
|                                          |
|  ──────── or use email ────────          |
|                                          |
|  +------------------------------------+  |
|  |  Log in with email                 |  |  <- Outline button, expands form
|  +------------------------------------+  |
|                                          |
|  Don't have an account? Create one       |
+------------------------------------------+
```

### Touch targets
- All buttons: `min-h-[48px]` (WCAG 2.5.8 compliance)
- Social login buttons: full width, prominent icons
- Accessible labels for screen readers

### i18n additions
New keys for `en.json` and `ms.json`:
```json
{
  "profile": {
    "continueWithGoogle": "Continue with Google",
    "continueWithGitHub": "Continue with GitHub",
    "orUseEmail": "or use email",
    "emailLogin": "Log in with email",
    "createAccount": "Don't have an account? Create one",
    "errors": {
      "socialLoginFailed": "Social login failed. Please try again.",
      "popupBlocked": "Pop-up was blocked. Please allow pop-ups for this site."
    }
  }
}
```

## Acceptance Criteria

- [ ] User can sign in with Google (single tap from profile page)
- [ ] User can sign in with GitHub (single tap from profile page)
- [ ] User can still sign in with email + password
- [ ] User can still register with email + password
- [ ] After social login, user lands on profile page with name/email populated
- [ ] Session persists across page navigation and browser refresh
- [ ] Token automatically refreshes (no forced re-login after 24h)
- [ ] Backend accepts Supabase JWTs for all authenticated endpoints
- [ ] Users created via social login appear in the `users` table
- [ ] Social login buttons meet WCAG 2.2 AA touch target requirements (48x48dp)
- [ ] Social login buttons have proper screen reader labels
- [ ] Social login works in both English and Bahasa Malaysia
- [ ] Existing email/password users can still log in (backward compatible)
- [ ] Logout clears session properly
- [ ] All existing authenticated features work (favorites, comments, reviews, add/edit place)

## Test Plan

### E2E (Playwright)
1. Verify social login buttons appear on profile page (logged out)
2. Verify email login form still works
3. Verify session persistence after login
4. Verify logout clears session
5. Verify authenticated features work after login (favorite, comment, review)

### Manual
1. Complete Google OAuth flow end-to-end
2. Complete GitHub OAuth flow end-to-end
3. Verify on mobile (Samsung Galaxy A-series)
4. Verify with TalkBack / VoiceOver screen readers
5. Verify popup handling on browsers that block popups

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase dashboard config requires manual setup | Blocks feature | Document exact steps, provide screenshots |
| Backend JWT validation breaks existing sessions | Users forced to re-login | Backend should accept both old and new JWT formats during migration |
| Google OAuth requires Google Cloud Console setup | Blocks Google login | Provide step-by-step guide; GitHub is simpler to set up first |
| Pop-up blockers prevent OAuth flow | Users can't login | Provide fallback redirect-based flow (Supabase supports both) |
| Supabase free tier rate limits | Auth failures under load | Free tier is generous (unlimited auth); monitor usage |

## Dependencies

- Supabase project must have Auth enabled (it is by default)
- Google Cloud Console: OAuth 2.0 Client ID (Web application type)
- GitHub Developer Settings: OAuth App registration
- Supabase JWT secret must be configured in backend environment
