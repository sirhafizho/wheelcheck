# WheelCheck Backend

Spring Boot Kotlin backend for the WheelCheck wheelchair accessibility checker application.

## Tech Stack

- **Spring Boot 3.3.5** with Kotlin
- **Java 21**
- **Gradle 8.10** (Kotlin DSL)
- **PostgreSQL + PostGIS** for spatial queries
- **Spring Data JPA** with Hibernate Spatial
- **Spring Security** with JWT authentication
- **SpringDoc OpenAPI** for API documentation
- **Flyway** for database migrations
- **JUnit 5 + MockK** for testing
- **Testcontainers** for integration tests
- **Bucket4j** for rate limiting

## Prerequisites

- Java 21
- PostgreSQL 15+ with PostGIS extension
- Gradle 8.10+ (or use included wrapper)

## Quick Start

1. **Setup PostgreSQL with PostGIS:**

```bash
# Create database
createdb wheelcheck

# Connect to database
psql wheelcheck

# Enable PostGIS extension
CREATE EXTENSION postgis;
```

2. **Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

3. **Build the project:**

```bash
./gradlew build
```

4. **Run the application:**

```bash
./gradlew bootRun
```

The server will start on `http://localhost:8080`

## API Documentation

Once the application is running, visit:
- **Swagger UI:** http://localhost:8080/swagger-ui.html
- **OpenAPI Spec:** http://localhost:8080/v3/api-docs

## Database Migrations

Flyway migrations are automatically applied on startup. Migration files are located in `src/main/resources/db/migration/`

## Testing

Run all tests:
```bash
./gradlew test
```

Run only unit tests:
```bash
./gradlew test --tests '*Test'
```

Run integration tests (requires Docker for Testcontainers):
```bash
./gradlew test --tests '*IntegrationTest'
```

## Project Structure

```
src/main/kotlin/com/wheelcheck/
├── WheelcheckApplication.kt
├── config/              # Security, CORS, OpenAPI, Rate Limiting
├── place/               # Place entity, repository, service, controller
├── review/              # Review entity, repository, service, controller
├── photo/               # Photo entity, repository, service, controller
├── user/                # User entity, repository, service
├── auth/                # JWT authentication
└── common/              # Shared enums and DTOs
```

## Key Features

### Spatial Queries
Uses PostGIS for efficient geographical queries to find nearby places within a radius.

### Anonymous Reviews
Allows users to submit accessibility reviews without authentication.

### JWT Authentication
Optional authentication for user-specific features.

### Rate Limiting
- Anonymous users: 10 requests/hour for POST endpoints
- Authenticated users: 30 requests/hour for POST endpoints
- GET requests are not rate limited

### Photo Upload
- Maximum file size: 10MB
- Automatic EXIF stripping
- Automatic resizing to max 1200px
- Supported formats: JPEG, PNG

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/wheelcheck` |
| `DATABASE_USERNAME` | Database username | `wheelcheck` |
| `DATABASE_PASSWORD` | Database password | `wheelcheck` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | - |
| `UPLOAD_DIRECTORY` | Directory for uploaded photos | `uploads` |
| `SERVER_PORT` | Server port | `8080` |

## Docker

Build and run with Docker:

```bash
docker build -t wheelcheck-backend .
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5432/wheelcheck \
  -e DATABASE_USERNAME=wheelcheck \
  -e DATABASE_PASSWORD=your_password \
  -e JWT_SECRET=your-secret-key-min-32-chars \
  wheelcheck-backend
```

## API Endpoints

### Places
- `GET /api/places` - Get all places
- `GET /api/places/{id}` - Get place by ID
- `POST /api/places/nearby` - Find nearby places
- `GET /api/places/search?name=...` - Search places by name
- `POST /api/places` - Create new place

### Reviews
- `GET /api/reviews/{id}` - Get review by ID
- `GET /api/reviews/place/{placeId}` - Get reviews for a place
- `POST /api/reviews` - Create review (anonymous allowed)

### Photos
- `GET /api/photos/place/{placeId}` - Get photos for a place
- `POST /api/photos/upload` - Upload photo
- `GET /api/photos/{photoId}` - Download photo

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

## License

MIT License
