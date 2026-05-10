# 🚀 WheelCheck Frontend - Quick Start Guide

## Prerequisites
- Node.js 20+ installed
- npm (comes with Node.js)

## Getting Started (3 steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local with your settings
# NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests (Playwright)
npm run lint         # Run ESLint
```

## Project Highlights

✅ **Accessibility First** - WCAG 2.2 AA compliant  
✅ **Bilingual** - English & Bahasa Malaysia  
✅ **PWA Ready** - Installable on mobile devices  
✅ **Fully Tested** - 19 unit tests passing  
✅ **Type Safe** - TypeScript throughout  

## Next Steps

1. **Connect to Backend API** - Update `NEXT_PUBLIC_API_URL` in `.env.local`
2. **Customize Branding** - Replace placeholder icons in `public/icons/`
3. **Enhance PWA** - Improve service worker in `public/sw.js`
4. **Add More Tests** - Expand test coverage in `tests/`
5. **Deploy** - Push to GitHub and deploy on Vercel

## Need Help?

- See [README.md](./README.md) for full documentation
- Check [SETUP_SUMMARY.md](./SETUP_SUMMARY.md) for detailed setup info

Happy coding! 🎉
