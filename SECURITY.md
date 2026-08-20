# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Use [GitHub Security Advisories](https://github.com/sirhafizho/wheelcheck/security/advisories/new) to report privately
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgement:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix & disclosure:** Coordinated with reporter

## Scope

Security concerns include but are not limited to:
- Authentication/authorization bypass
- Data exposure (user data, location data)
- SQL injection or API abuse
- Photo upload vulnerabilities
- Privacy violations (location tracking, EXIF data leaks)

## Security Measures

### Authentication & Authorization
- JWT-based authentication with HMAC signing
- Role-based access control (USER / ADMIN)
- bcrypt password hashing (via Spring Security)
- Method-level security with `@PreAuthorize`
- All write endpoints (reviews, photos, places, comments) require authentication
- Account lockout after 10 failed login attempts (15-minute window)
- Constant-time login comparison to prevent timing-based account enumeration
- Password strength validation (minimum 8 characters, email format enforced)

### Demo Account Protection
- Demo accounts are restricted from destructive admin operations
- Cannot delete users or change user roles
- Cannot trigger OSM imports, aggregation, or AI enrichment
- Cannot modify places via admin endpoints
- Rate-limited to 5 deletions and 20 creations per hour
- Register your own account for unrestricted access

### API Protection
- Per-IP tiered rate limiting (using `remoteAddr` — X-Forwarded-For not trusted):
  - Auth endpoints: 5 req/min
  - Write operations: 20 req/min
  - Search/nearby: 30 req/min  
  - General reads: 120 req/min
  - Admin endpoints: 10 req/min
- Bounded rate-limit bucket store with TTL eviction (prevents memory exhaustion DoS)
- CORS restricted to known origins (Vercel, localhost)
- CSRF disabled (stateless JWT architecture)
- Swagger UI disabled in production (available only in dev profile)
- Generic error messages (no internal details leaked in API responses)

### Input Validation
- Server-side validation on all write endpoints
- Parameterized queries via JPA/Hibernate (no raw SQL concatenation)
- XSS prevention via React's default output escaping
- Email format and password length validation on registration

### Photo Upload Security
- JPEG/PNG only (MIME type validated server-side)
- Magic byte verification (file content matches claimed type)
- Max file size enforced (10MB)
- Images re-encoded through ImageIO to sanitize content
- Images resized to max 1200px server-side
- EXIF metadata stripped from uploaded photos
- Random UUID filenames with forced .jpg extension (no user-controlled paths or extensions)

### Frontend Security Headers
- `X-Frame-Options: DENY` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- `Strict-Transport-Security` (via Vercel)

### Infrastructure
- HTTPS enforced (HF Spaces + Vercel)
- Database credentials via environment variables only
- JWT secret via environment variables only (no default fallback — app fails to start without it)
- Flyway managed database migrations
- Docker services bound to localhost only (127.0.0.1)
- Adminer pinned to specific version
- GitHub Actions security scanning (gitleaks, dependency review, npm audit)

### Automated Security Scanning
- **Gitleaks** — scans for leaked secrets in commits
- **Dependency review** — flags vulnerable dependencies on PRs
- **npm audit** — checks frontend dependencies (fails on critical severity)
- **Gradle dependency verification** — checks backend dependencies

## Privacy Considerations

WheelCheck handles sensitive data:
- User locations
- Photos of venues (may contain people)
- Disability-related information

We take extra care to:
- Strip EXIF data from uploaded photos
- Never expose user location history
- Minimize data collection
- Use generic error messages to prevent user enumeration
