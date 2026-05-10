# WheelCheck Frontend

A Progressive Web App (PWA) for finding wheelchair-accessible places across Malaysia.

## Features

- 🗺️ **Interactive Map** - Leaflet-based map showing accessible places
- 🌐 **Bilingual** - Full support for English and Bahasa Malaysia (next-intl)
- ♿ **Accessibility First** - WCAG 2.2 AA compliant from day one
- 📱 **PWA Ready** - Works offline, installable on mobile devices
- 🎨 **Modern UI** - Tailwind CSS with accessible components
- 🧪 **Well Tested** - Jest unit tests + Playwright E2E tests
- 📊 **TypeScript** - Type-safe development

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Maps:** Leaflet.js + react-leaflet
- **i18n:** next-intl
- **Icons:** Heroicons
- **Testing:** Jest + React Testing Library + Playwright
- **Linting:** ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 20+ and npm

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npm run playwright:install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local with your backend API URL
```

### Development

```bash
# Start dev server
npm run dev

# Open http://localhost:3000
```

### Testing

```bash
# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/
│   ├── [locale]/           # Locale-based routing
│   │   ├── layout.tsx      # Root layout with i18n
│   │   ├── page.tsx        # Home/Map page
│   │   ├── places/         # Places list and detail
│   │   └── report/         # Report submission flow
│   ├── layout.tsx          # Global root layout
│   ├── globals.css         # Global styles + a11y
│   └── not-found.tsx       # 404 page
├── components/
│   ├── map/                # Map components
│   ├── places/             # Place-related components
│   ├── report/             # Report wizard components
│   ├── layout/             # Header, nav, etc.
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── api.ts              # API client
│   ├── types.ts            # TypeScript types
│   └── constants.ts        # App constants
├── hooks/
│   ├── useGeolocation.ts   # Browser geolocation
│   └── usePlaces.ts        # Places data fetching
├── messages/
│   ├── en.json             # English translations
│   └── ms.json             # Bahasa Malaysia translations
└── middleware.ts           # i18n middleware
```

## Accessibility Features

All components are built with WCAG 2.2 AA compliance:

- ✅ Minimum 48x48px touch targets (WCAG 2.5.5)
- ✅ Color contrast ratio ≥ 4.5:1 (WCAG 1.4.3)
- ✅ Keyboard navigation support
- ✅ Screen reader friendly (proper ARIA labels)
- ✅ Semantic HTML throughout
- ✅ Focus indicators visible (WCAG 2.4.7)
- ✅ Skip navigation link
- ✅ Responsive text sizing
- ✅ Reduced motion support

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_DEFAULT_LAT=3.139
NEXT_PUBLIC_DEFAULT_LNG=101.6869
NEXT_PUBLIC_DEFAULT_ZOOM=13
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

Vercel will automatically:
- Build the app
- Generate static pages
- Enable PWA features
- Provide preview URLs for PRs

### Manual Deployment

```bash
npm run build
npm start
```

Or use Docker, AWS, etc.

## PWA Configuration

The app includes:
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Basic service worker
- `public/icons/` - App icons (192px, 512px)

To test PWA features locally:
1. Build the app (`npm run build`)
2. Start production server (`npm start`)
3. Open Chrome DevTools > Application > Service Workers

## Contributing

1. Write accessible code (follow existing patterns)
2. Add tests for new features
3. Run `npm test` before committing
4. Use meaningful commit messages

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari (latest 2 versions)
- Android Chrome (latest 2 versions)

## License

MIT
