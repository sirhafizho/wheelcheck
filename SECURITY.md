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
- JWT-based authentication with HS512 signing
- Role-based access control (USER / ADMIN)
- bcrypt password hashing (via Spring Security)
- Method-level security with `@PreAuthorize`

### Demo Account Protection
- Demo accounts are restricted from destructive admin operations
- Cannot delete users or change user roles
- Rate-limited to 5 deletions and 20 creations per hour
- Register your own account for unrestricted access

### API Protection
- Per-IP tiered rate limiting:
  - Auth endpoints: 5 req/min
  - Write operations: 20 req/min
  - Search/nearby: 30 req/min  
  - General reads: 120 req/min
  - Admin endpoints: 10 req/min
- CORS restricted to known origins (Vercel, localhost)
- CSRF disabled (stateless JWT architecture)

### Input Validation
- Server-side validation on all write endpoints
- Parameterized queries via JPA/Hibernate (no raw SQL concatenation)
- XSS prevention via React's default output escaping

### Photo Upload Security
- JPEG/PNG only (MIME type validated server-side)
- Max file size enforced (10MB)
- Images resized to max 1200px server-side
- EXIF metadata stripped from uploaded photos
- Random UUID filenames (no user-controlled paths)

### Infrastructure
- HTTPS enforced (HF Spaces + Vercel)
- Database credentials via environment variables only
- JWT secret via environment variables only
- Flyway managed database migrations
- GitHub Actions security scanning (gitleaks, dependency review, npm audit)

### Automated Security Scanning
- **Gitleaks** — scans for leaked secrets in commits
- **Dependency review** — flags vulnerable dependencies on PRs
- **npm audit** — checks frontend dependencies
- **Gradle dependency verification** — checks backend dependencies

## Privacy Considerations

WheelCheck handles sensitive data:
- User locations
- Photos of venues (may contain people)
- Disability-related information

We take extra care to:
- Strip EXIF data from uploaded photos
- Never expose user location history
- Allow anonymous contributions
- Minimize data collection
