# Contributing to WheelCheck

Thank you for your interest in contributing! WheelCheck is built for the Malaysian disability community, and every contribution helps make the world more accessible.

## 🚀 Getting Started

### Prerequisites
- Java 21+ (for backend)
- Node.js 20+ (for frontend)
- PostgreSQL 16+ with PostGIS
- Docker & Docker Compose (recommended)

### Setup

```bash
git clone https://github.com/sirhafizho/wheelcheck.git
cd wheelcheck
docker compose up
```

Or see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for manual setup.

## 📋 Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `cd backend && ./gradlew test` / `cd frontend && npm test`
5. Commit with a descriptive message
6. Push and open a Pull Request

## 🎯 What to Work On

- Check **[Good First Issues](https://github.com/sirhafizho/wheelcheck/labels/good%20first%20issue)** for beginner-friendly tasks
- Check **[Help Wanted](https://github.com/sirhafizho/wheelcheck/labels/help%20wanted)** for tasks needing contributors
- Look at the project roadmap in [docs/ROADMAP.md](docs/ROADMAP.md)

## 🧪 Code Standards

### Backend (Kotlin)
- Follow Kotlin coding conventions
- Write tests for new features
- Use meaningful variable/function names
- Keep functions focused and small

### Frontend (TypeScript/React)
- Follow the existing component patterns
- All interactive elements must be keyboard accessible
- All images must have alt text
- Test with screen readers (TalkBack on Android, VoiceOver on iOS/Mac)

## ♿ Accessibility Requirements

Since our users include people with disabilities, **all contributions must be accessible**:

- Touch targets: minimum 48x48dp
- Color contrast: minimum 4.5:1 ratio
- Screen reader labels on all interactive elements
- No functionality that requires multi-finger gestures without alternatives
- Test at 200% font scale — layout must not break

## 🌐 Translations

We support:
- 🇲🇾 Bahasa Malaysia (primary)
- 🇬🇧 English

Future:
- 🇨🇳 Mandarin
- 🇮🇳 Tamil

Translation files are in `frontend/public/locales/`. Feel free to add or improve translations.

## 💬 Communication

- **Questions?** Open a [GitHub Discussion](https://github.com/sirhafizho/wheelcheck/discussions)
- **Bugs?** Open an [Issue](https://github.com/sirhafizho/wheelcheck/issues/new?template=bug_report.md)
- **Ideas?** Open a [Feature Request](https://github.com/sirhafizho/wheelcheck/issues/new?template=feature_request.md)

## 📜 License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
