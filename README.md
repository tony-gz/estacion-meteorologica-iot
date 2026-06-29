# Estación Meteorológica IoT

Plataforma IoT para estaciones meteorológicas con sensores conectados vía ESP32.
Backend REST (Spring Boot + PostgreSQL), frontend web (React/Vite), app móvil (Flutter).

## Componentes

- **ESP32** — firmware con sensores (temperatura, humedad, viento, lluvia)
- **Backend** — API REST con autenticación JWT, historial, alertas e IA (Gemini)
- **Web** — dashboard con clima en vivo, históricos y asistente IA
- **Móvil** — app Flutter (Android/iOS)

## Despliegue

- Backend → [Render](https://render.com) (Docker)
- Frontend → [Vercel](https://vercel.com)
- Base de datos → PostgreSQL (Render)
