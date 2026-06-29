# CLIMBOT — Frontend web

SPA del panel web de **CLIMBOT** (Red de Estaciones Meteorológicas Inteligentes).
Consume **únicamente** la API del backend Spring (nunca Firebase directo).

## Stack

- React 19 + Vite + TypeScript
- React Router 7 (rutas + protección por rol)
- TanStack Query (datos/caché)
- Axios (cliente con JWT + refresh automático)
- Tailwind CSS v4 (con modo oscuro por clase)
- Recharts (gráficas)
- Canvas 2D para fondos animados (aurora + cielo por clima)

## Cómo correr en local

Requiere el backend corriendo (ver `../WeatherStation_Backend`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de producción a dist/
```

En desarrollo, las llamadas a `/api/**` se redirigen al backend
(`http://localhost:8080`) mediante el proxy de Vite (ver `vite.config.ts`), por lo
que **no hay problemas de CORS** en local.

> El backend debe permitir el origen del front en `CORS_ALLOWED_ORIGINS`
> (ya incluye `http://localhost:5173`). En producción, añade el dominio de Vercel.

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `VITE_API_URL` | URL del backend en **producción** (ej. `https://climbot-backend.onrender.com`). En dev se usa el proxy `/api`. Ver `.env.example`. |

## Estructura

```
src/
├── main.tsx              # providers (QueryClient + Router + Auth) + tema inicial
├── App.tsx               # rutas: / · /login · /estaciones/:id · /admin/*
├── lib/
│   ├── api.ts            # Axios + Bearer + refresh automático en 401
│   ├── tokens.ts         # tokens en localStorage
│   ├── types.ts          # tipos espejo de los DTOs del backend
│   ├── queries.ts        # hooks de estaciones/historial/estadísticas
│   ├── adminQueries.ts   # hooks de usuarios/alertas/metadata estación
│   ├── csv.ts            # exportación CSV del histórico
│   ├── format.ts         # formato de números/fechas
│   └── theme.ts          # modo claro/oscuro
├── auth/                 # AuthContext + RutaProtegida (gateo por rol)
├── components/
│   ├── Layout.tsx        # header CLIMBOT + nav + avatar + tema
│   ├── ThemeToggle.tsx   # botón 🌙/☀️
│   ├── FondoAurora.tsx   # fondo animado de la home (degradados que rotan de color)
│   ├── FondoClima.tsx    # cielo animado por clima (sol/luna/lluvia/tormenta)
│   ├── EstacionCard.tsx, SensorCard.tsx, EstadoBadge.tsx, Grafica.tsx, Modal.tsx
│   └── AsistenteIA.tsx   # caja de preguntas a la IA
└── pages/
    ├── HomePage.tsx             # hero CLIMBOT (aurora) + lista de estaciones
    ├── EstacionDetallePage.tsx  # hero por clima + sensores + IA + histórico + CSV
    ├── LoginPage.tsx            # login + registro
    └── admin/                   # AdminPage (tabs) + Usuarios/Estaciones/Alertas
```

## Funcionalidades

- **Vista pública** (autenticado, cualquier rol): lista de estaciones con clima
  actual y estado; detalle con hero animado por clima y tarjetas de sensores.
- **Asistente IA**: preguntas en lenguaje natural + resumen + predicción (Gemini,
  vía backend; con rate limit y manejo de errores).
- **Histórico y estadísticas** (INVESTIGADOR/ADMIN): gráficas por rango (24 h/48 h/
  7 días) y **descarga CSV** de los registros.
- **Panel admin** (ADMIN): CRUD de usuarios; **activar/desactivar estaciones**
  (controla qué se muestra al público, sin tocar Firebase); consulta de alertas.
- **Modo oscuro** con persistencia.
- **Fondos animados**: aurora (home, colores en movimiento) y cielo realista por
  clima en el detalle (día/atardecer/noche, lluvia, tormenta con relámpagos, luna
  y estrellas).

## Despliegue (Vercel)

1. `VITE_API_URL` = URL del backend en Render.
2. Build command `npm run build`, output `dist/`.
3. SPA: configurar rewrite de todas las rutas a `/index.html` (`vercel.json`,
   pendiente en la fase de despliegue).
4. Añadir el dominio de Vercel a `CORS_ALLOWED_ORIGINS` del backend.
