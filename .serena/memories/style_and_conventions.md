# Code Style & Conventions

## Backend (Kotlin)
- Kotlin coding conventions (official style guide)
- Package structure: `com.wheelcheck.{module}` (e.g., `com.wheelcheck.place`, `com.wheelcheck.review`)
- Data classes for DTOs/responses
- Enum classes for fixed values (AccessLevel, Category, etc.)
- Repository pattern with Spring Data JPA
- Service layer for business logic
- Controller layer (thin, delegates to services)
- ktlint for formatting
- Meaningful function/variable names (no abbreviations)
- Tests in `src/test/kotlin/` mirroring source structure

## Frontend (TypeScript/React)
- Next.js App Router
- TypeScript strict mode
- Components in `src/components/`
- API integration in `src/lib/api/`
- Tailwind CSS for styling
- i18n files in `public/locales/{lang}/`
- ESLint + Prettier for formatting
- All interactive elements must have accessibility labels
- All images must have alt text

## Accessibility (CRITICAL)
- Touch targets: minimum 48x48dp
- Color contrast: minimum 4.5:1 ratio
- Screen reader labels on ALL interactive elements
- Map always has list view alternative
- No time-limited interactions
- Test at 200% font scale
- Single-finger operation for everything

## Git
- Descriptive commit messages
- Feature branches: `feature/description`
- Bug fix branches: `fix/description`
- No co-author trailers (user is sole author)

## Documentation
- README.md at root
- docs/ for detailed documentation
- OpenAPI spec for API documentation (auto-generated)
- JSDoc/KDoc for complex functions only
