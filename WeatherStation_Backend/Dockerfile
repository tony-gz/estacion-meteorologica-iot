# ── Etapa 1: build ──────────────────────────────────────────────
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
# Cache de dependencias: copiar primero el pom
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY src ./src
RUN mvn -B -q -DskipTests clean package

# ── Etapa 2: runtime ────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
# Usuario no root
RUN useradd -r -u 1001 appuser
COPY --from=build /app/target/*.jar app.jar
USER appuser
# Render inyecta PORT; la app lo lee (server.port=${PORT:8080})
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
