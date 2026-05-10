# 🦽 WheelCheck

**Malaysia's open-source wheelchair accessibility checker.**

Crowd-sourced venue accessibility data with Waze-style reporting. Check if a place is wheelchair-accessible before you visit.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🎯 What is WheelCheck?

WheelCheck helps people with mobility impairments find accessible venues in Malaysia. Users can:

- **Search** venues and see accessibility verdicts (✅ Accessible / ⚠️ Partial / ❌ Not Accessible)
- **Report** accessibility info in under 30 seconds (Waze-style quick reporting)
- **Upload photos** as evidence (ramps, doorways, toilets, parking)
- **Confirm or update** existing reports
- **Browse** via map or accessible list view

## 🤔 Why?

- Google Maps accessibility data is inconsistent and not granular enough
- No open-source, SEA-focused accessibility checker exists
- 15% of the world's population lives with a disability
- Malaysia's Persons with Disabilities Act 2008 requires accessible buildings, but compliance varies greatly

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Spring Boot 3.x + Kotlin |
| **Frontend** | Next.js (PWA) + TypeScript |
| **Database** | PostgreSQL + PostGIS |
| **Maps** | Leaflet.js + OpenStreetMap |
| **Geocoding** | Nominatim (OSM) |

## 🚀 Quick Start

### Prerequisites
- Java 21+
- Node.js 20+
- PostgreSQL 16+ with PostGIS extension
- Docker & Docker Compose (recommended)

### One-command setup (Docker)

```bash
git clone https://github.com/sirhafizho/wheelcheck.git
cd wheelcheck
docker compose up
```

Backend: http://localhost:8080
Frontend: http://localhost:3000
API Docs: http://localhost:8080/swagger-ui.html

### Manual setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed instructions.

## 📱 Features

### MVP (Phase 1)
- [ ] Venue search with map + list view
- [ ] Accessibility verdict display (Full / Partial / None / Unknown)
- [ ] Granular breakdown (entrance, toilet, parking, internal navigation)
- [ ] Waze-style quick report flow (< 30 seconds)
- [ ] Photo evidence upload
- [ ] Confirm/deny existing reports
- [ ] Anonymous contributions (no sign-up required to report)
- [ ] Offline access for saved venues
- [ ] Bilingual (Bahasa Malaysia + English)

### Phase 2
- [ ] User profiles with contribution history
- [ ] Gamification (badges, contributor levels)
- [ ] Venue owner self-certification
- [ ] Route planning between accessible venues
- [ ] OpenStreetMap data integration

## ♿ Accessibility

This app is built **for** people with disabilities, so accessibility of the app itself is non-negotiable:

- WCAG 2.2 Level AA compliance
- 48x48dp minimum touch targets
- TalkBack + VoiceOver tested
- List view alternative to map (for screen reader users)
- Single-finger operation for all interactions
- Large text support (200% font scale)
- High contrast mode support
- No time limits on any interaction

## 🗂️ Project Structure

```
wheelcheck/
├── backend/          # Spring Boot Kotlin API
├── frontend/         # Next.js PWA
├── docs/             # Documentation
├── docker-compose.yml
└── .github/          # CI/CD, issue templates
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first issues** are tagged and waiting for you.

### Ways to contribute:
- 🐛 Report bugs
- 💡 Suggest features
- 🗺️ Submit accessibility data for venues
- 🌐 Help with translations (BM, Mandarin, Tamil)
- 💻 Submit code (backend, frontend, or both)
- 📖 Improve documentation
- ♿ Test with assistive technologies

## 📊 Data

- **Code License:** Apache 2.0
- **Data License:** ODbL (Open Database License) — same as OpenStreetMap
- All crowd-sourced accessibility data is open and exportable

## 🇲🇾 Malaysia Focus

- Bilingual: Bahasa Malaysia + English
- Key venues: Malls, hospitals, mosques, MRT/LRT stations, government offices
- Aligned with Persons with Disabilities Act 2008 (Act 685)
- Partnership-ready for OKU organizations

## 📬 Contact

- **Issues:** [GitHub Issues](https://github.com/sirhafizho/wheelcheck/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sirhafizho/wheelcheck/discussions)

---

Built with ❤️ for the Malaysian OKU community.
