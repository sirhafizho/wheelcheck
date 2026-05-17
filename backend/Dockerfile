# Build stage
FROM gradle:8.10-jdk21 AS build
WORKDIR /app

COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src

RUN gradle build -x test --no-daemon

# Runtime stage — HuggingFace Spaces uses port 7860
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN mkdir -p /app/uploads

COPY --from=build /app/build/libs/*.jar app.jar

# HuggingFace Spaces requires port 7860
EXPOSE 7860

ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=7860

ENTRYPOINT ["java", \
  "-Xmx400m", \
  "-Xss512k", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
