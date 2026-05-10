# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

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
