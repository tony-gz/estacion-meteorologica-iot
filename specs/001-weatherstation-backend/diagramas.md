# Diagramas — WeatherStation Backend v3 (PostgreSQL único)

Cubre los deliverables **5 (flujos)**, **6 (arquitectura)**, **11 (flujo IA)**,
**12 (autenticación)**, **13 (ingesta/consulta de datos)**, más los flujos de
**registro/aprobación de estaciones** e **ingesta de datos del dispositivo**.
Todos en Mermaid. **No hay Firebase**: el backend persiste y consulta las lecturas
en PostgreSQL.

---

## 1. Arquitectura del Sistema (contexto)

```mermaid
flowchart TB
    subgraph Campo["Estaciones (campo)"]
        ESP1["ESP32 estacion A"]
        ESP2["ESP32 estacion B"]
        ESPn["ESP32 estacion N"]
    end

    subgraph Backend["WeatherStation Backend (Spring Boot · Render)"]
        DEV["API Dispositivo\n/api/device/**"]
        API["API REST usuarios\n(controllers)"]
        SVC["Services (negocio)\n+ Ingesta + Gobernanza"]
        GADP["Cliente Gemini"]
        REPO["Repositories JPA"]
        SEC["Security (JWT usuarios + JWT dispositivo + roles)"]
    end

    PG[("PostgreSQL\nusuarios, escuelas, estaciones, tokens,\nsolicitudes, conexiones, LECTURAS,\nalertas, logs, config")]
    GEM["Gemini API"]

    subgraph Clientes
        FL["Móvil (React Native)"]
        WEB["Web (CLIMBOT)"]
    end

    ESP1 & ESP2 & ESPn -- "REST + token/JWT estación" --> DEV
    DEV --> SVC
    API --> SVC
    SVC --> REPO
    REPO <--> PG
    SVC --> GADP
    GADP -- "HTTPS" --> GEM
    SEC -. protege .-> API
    SEC -. protege .-> DEV
    FL & WEB -- "REST + JWT usuario" --> API

    classDef ext fill:#fde,stroke:#b59;
    class GEM,PG ext;
```

**Clave (v3)**: el ESP32 publica al backend; el backend valida y **persiste todo
en PostgreSQL** (datos del sistema + lecturas meteorológicas). Un único almacén,
una única frontera de confianza.

---

## 2. Arquitectura en capas

```mermaid
flowchart LR
    DC["controller device\n/api/device/**"] --> S
    C["controller usuarios\n(HTTP, DTOs)"] --> S["service\n(negocio + ingesta + gobernanza)"]
    S --> R["repository\n(JPA: sistema + lecturas)"]
    S --> G["gemini\n(cliente)"]
    R --> PG[("PostgreSQL")]
    G --> GE["Gemini API"]
    C -. usa .-> DTO["dto / mapper"]
    DC -. usa .-> DTO
    S -. usa .-> DTO
    ALL["exception (global)\nconfig · security · util"] -. transversal .-> C
```

Dependencias unidireccionales; Gemini tras la interfaz `GeminiClient`. Las lecturas
viven en repositorios JPA (`LecturaActualRepository`, `LecturaRepository`).

---

## 3. Registro y aprobación de una estación

```mermaid
sequenceDiagram
    autonumber
    participant Sol as Solicitante (ADMIN/RESPONSABLE o ESP32)
    participant EC as EstacionController / DeviceController
    participant ES as EstacionService
    participant SR as SolicitudRepository
    participant ER as EstacionRepository
    participant TS as TokenService
    participant Adm as ADMIN

    alt alta por panel (ADMIN/RESPONSABLE)
        Sol->>EC: POST /estaciones {nombre, escuelaId, ...}
        EC->>ES: registrar(req, usuario)
        ES->>ER: crear Estacion(estado=PENDING)
    else auto-registro del dispositivo
        Sol->>EC: POST /api/device/register {nombre, escuelaId, ...}
        EC->>ES: solicitar(req)
        ES->>SR: crear SolicitudRegistro(PENDING)
    end
    ES-->>Sol: 201/202 (PENDING, sin token)

    Note over Adm,ES: El ADMIN revisa el panel de pendientes
    Adm->>EC: POST /estaciones/{id}/aprobar (o /solicitudes/{id}/aprobar)
    EC->>ES: aprobar(id, admin)
    alt estación/solicitud en estado aprobable
        ES->>ER: estado = APPROVED (materializa estación si venía de solicitud)
        ES->>TS: generarToken(estacion)
        TS->>TS: token aleatorio + guardar HASH (StationToken activo)
        TS-->>ES: token en claro (solo memoria)
        ES-->>Adm: 200 StationTokenResponse (token UNA sola vez)
    else estado no aprobable
        ES-->>Adm: 409 ApiError
    end
```

Rechazar/deshabilitar/reactivar siguen el mismo patrón cambiando `estado`.
`regenerar-token` revoca el `StationToken` activo y emite uno nuevo.

---

## 4. Autenticación del dispositivo — handshake (deliverable 12b)

```mermaid
sequenceDiagram
    autonumber
    participant ESP as ESP32
    participant DC as DeviceController
    participant DS as DeviceAuthService
    participant ER as EstacionRepository
    participant TR as StationTokenRepository
    participant DJ as DeviceJwtService
    participant CL as ConnectionLog

    ESP->>DC: POST /api/device/auth {uuid, token, firmware}
    DC->>DS: autenticar(req, ip)
    DS->>ER: findByUuid(uuid)
    alt estación no existe
        DS->>CL: log(UNAUTHORIZED, uuid, ip)
        DS-->>ESP: 401 ApiError
    else existe
        DS->>TR: token activo de la estación
        DS->>DS: comparar hash(token) con tokenHash
        alt token inválido/revocado
            DS->>CL: log(AUTH_FAIL, ip, "token inválido")
            DS-->>ESP: 401 ApiError
        else estación no APPROVED
            DS->>CL: log(AUTH_FAIL, ip, "estado=" + estado)
            DS-->>ESP: 403 ApiError
        else OK
            DS->>DJ: emitir JWT dispositivo (sub=uuid, type=DEVICE, exp corto)
            DS->>ER: actualizar firmware reportado
            DS->>CL: log(AUTH_OK, ip, firmware)
            DS-->>ESP: 200 {deviceToken, expiresIn}
        end
    end
```

---

## 5. Ingesta de datos — el backend persiste en PostgreSQL (deliverable 13)

```mermaid
sequenceDiagram
    autonumber
    participant ESP as ESP32
    participant RL as RateLimitFilter (/api/device/**)
    participant DC as DeviceController
    participant DF as DeviceJwtFilter
    participant IS as IngestaService
    participant VAL as Validador de lectura
    participant LA as LecturaActualRepository
    participant LR as LecturaRepository
    participant ER as EstacionRepository
    participant CL as ConnectionLog

    ESP->>RL: POST /api/device/data (Bearer deviceJWT) {lectura}
    alt límite excedido
        RL-->>ESP: 429 ApiError (Retry-After)
    else dentro de límite
        RL->>DF: validar JWT dispositivo
        alt JWT inválido/expirado
            DF-->>ESP: 401 ApiError
        else válido
            DF->>DC: continúa (estacionUuid en contexto)
            DC->>IS: ingerir(uuid, lectura)
            IS->>ER: estación APPROVED y no DISABLED?
            alt no autorizada
                IS->>CL: log(DATA_REJECTED, "estado")
                IS-->>ESP: 403 ApiError
            else autorizada
                IS->>VAL: validar formato/rangos (presión>0, humedad 0-100, ts en ventana)
                alt inválida
                    IS->>CL: log(DATA_REJECTED, motivo)
                    IS-->>ESP: 422 ApiError
                else válida
                    IS->>LA: upsert lectura_actual (1 fila/estación)
                    opt cadencia de histórico cumplida
                        IS->>LR: insert lecturas (idempotente por estacion+timestamp)
                    end
                    IS->>ER: ultimaConexion = now, firmware
                    IS->>CL: log(DATA_OK)
                    IS-->>ESP: 202 {estado: ACEPTADA}
                end
            end
        end
    end
```

> Todo en una transacción de PostgreSQL: la lectura actual, el histórico (si toca)
> y la actualización de la estación se confirman juntos. El histórico es idempotente
> por `(estacion_id, timestamp)`.

---

## 6. Flujo de Autenticación de usuario — Login (deliverable 12)

```mermaid
sequenceDiagram
    autonumber
    participant Cli as Cliente (Móvil RN/Web)
    participant AC as AuthController
    participant AS as AuthService
    participant UR as UsuarioRepository
    participant PE as PasswordEncoder (BCrypt)
    participant JS as JwtService
    participant TR as RefreshTokenRepository

    Cli->>AC: POST /auth/login {email, password}
    AC->>AS: login(LoginRequest)
    AS->>UR: findByEmail(email)
    alt usuario no existe o inactivo
        AS-->>Cli: 401 ApiError
    else existe
        AS->>PE: matches(password, hash)
        alt no coincide
            AS-->>Cli: 401 ApiError
        else coincide
            AS->>JS: generarAccessToken(usuario) [claim rol]
            AS->>JS: generarRefreshToken()
            AS->>TR: guardar(hash(refresh), expiraEn)
            AS-->>Cli: 200 AuthResponse(access, refresh, usuario)
        end
    end
```

Acceso a endpoint protegido (rol) y refresh con rotación: como antes. El filtro JWT
distingue `type=DEVICE` y lo rechaza en rutas de usuario, y viceversa.

---

## 7. Flujo de Consulta de datos (lectura desde PostgreSQL)

```mermaid
sequenceDiagram
    autonumber
    participant Cli as Cliente
    participant EC as EstacionController
    participant ES as EstacionService
    participant ER as EstacionRepository
    participant LA as LecturaActualRepository
    participant MP as LecturaMapper

    Cli->>EC: GET /estaciones/{uuid}/actual (Bearer usuario)
    EC->>ES: obtenerActual(uuid, usuario)
    ES->>ER: estación visible para el rol?
    alt no visible / inexistente
        ES-->>Cli: 404 ApiError
    else visible
        ES->>LA: findById(estacionId)
        alt sin lectura
            ES-->>Cli: 404 ApiError (sin datos)
        else con datos
            LA-->>ES: LecturaActual
            ES->>MP: toResponse(lectura)
            ES-->>Cli: 200 LecturaResponse
        end
    end
```

Historial: `LecturaRepository.findByEstacionAndTimestampBetween(...)` ordenado por
`timestamp`. Estadísticas: consulta de agregados SQL (`MIN/MAX/AVG`, `SUM`) sobre
`lecturas` en `EstadisticaService`.

---

## 8. Flujo completo de la IA (deliverable 11)

```mermaid
sequenceDiagram
    autonumber
    participant Cli as Cliente
    participant RL as RateLimitFilter (/ia/**)
    participant IC as IaController
    participant IS as IaService
    participant LR as Lectura(Actual)Repository
    participant PB as PromptBuilder
    participant GC as GeminiClient
    participant GE as Gemini API
    participant LOG as LogAuditoria

    Cli->>RL: POST /ia/preguntar {estacionId(uuid), pregunta}
    alt límite excedido
        RL-->>Cli: 429 ApiError (Retry-After)
    else dentro de límite
        RL->>IC: continúa
        IC->>IS: preguntar(request, usuario)
        IS->>LR: leer actual + histórico(ventana) de PostgreSQL
        alt datos insuficientes
            IS->>PB: prompt (marca "faltan datos")
        else suficientes
            IS->>PB: prompt (sistema + datos + pregunta)
        end
        IS->>GC: generar(prompt)
        GC->>GE: POST generateContent (HTTPS, API key)
        alt Gemini falla/timeout
            GC-->>IS: ExternalServiceException
            IS-->>Cli: 503 ApiError
        else OK
            GE-->>GC: texto
            IS->>LOG: registrar uso de IA (sin secretos)
            IS-->>Cli: 200 IaResponse (texto + rango + advertencias)
        end
    end
```

Prompt (grounded, principio VI): `[SYSTEM]` con reglas de no-invención + `[DATOS]`
de la estación + `[PREGUNTA]`.

---

## 9. Motor de Alertas (programado)

```mermaid
sequenceDiagram
    autonumber
    participant SCH as Scheduler (@Scheduled)
    participant RE as AlertaRuleEngine
    participant ER as EstacionRepository
    participant LR as Lectura(Actual)Repository
    participant CFG as ConfiguracionRepository
    participant AR as AlertaRepository

    SCH->>RE: evaluar() (cada N min)
    RE->>ER: estaciones APPROVED + habilitadas
    loop por estación
        RE->>LR: leer actual + histórico corto (tendencia presión)
        RE->>CFG: umbrales (humedad/presion/viento/temp)
        RE->>RE: evaluar reglas
        alt condición cumplida y sin alerta ACTIVA del tipo
            RE->>AR: crear Alerta(ACTIVA) por estacionUuid
        else condición cesó y existe alerta ACTIVA
            RE->>AR: marcar RESUELTA (resueltaEn)
        else sin cambios
            RE->>RE: no-op (dedupe)
        end
    end
```

Reglas (FR-031): `humedad>90 ∧ presión↓` → **LLUVIA**; `viento_kmh>40` →
**VIENTO_FUERTE**; `temperatura>38` → **CALOR_EXTREMO**.

---

## 10. Ciclo de vida de una estación (máquina de estados)

```mermaid
stateDiagram-v2
    [*] --> PENDING: registrar / solicitar
    PENDING --> APPROVED: ADMIN aprueba (genera token)
    PENDING --> REJECTED: ADMIN rechaza
    APPROVED --> DISABLED: ADMIN deshabilita
    DISABLED --> APPROVED: ADMIN reactiva
    APPROVED --> MAINTENANCE: ADMIN mantenimiento
    MAINTENANCE --> APPROVED: ADMIN reactiva
    APPROVED --> APPROVED: regenerar-token (revoca anterior)
    REJECTED --> [*]
    note right of APPROVED
        Solo APPROVED puede autenticarse y publicar.
        Conectividad ONLINE/OFFLINE es DERIVADA
        (último latido/publicación), no un estado.
    end note
```

> **Latido y config**: una estación `APPROVED` envía `POST /api/device/heartbeat`
> (firmware/hardware/RSSI, sin batería) y obtiene `GET /api/device/config`
> (intervalo/muestreo/tz). El backend deriva `ONLINE`/`OFFLINE` del último latido y
> dispara `ESTACION_DESCONECTADA` al superar el umbral.
>
> **Acceso público**: `/api/public/**` (sin cuenta) sirve estaciones aprobadas,
> clima actual y stats agregadas; la IA queda detrás de autenticación.

---

## 11. Diagrama de despliegue (Render)

```mermaid
flowchart LR
    subgraph Render
        APP["WeatherStation Backend\n(contenedor JVM 21)"]
        ENV["Env vars / Secrets\nJWT_SECRET, DEVICE_JWT_SECRET,\nGEMINI_API_KEY, DATASOURCE"]
        ENV -. inyecta .-> APP
        PG[("PostgreSQL\n(Render Postgres)")]
        APP -- "lee + escribe (sistema + lecturas)" --> PG
    end
    GE["Gemini API"]
    APP --> GE
    ESP["ESP32 (campo)"] -- "/api/device/**" --> APP
    Clientes["Móvil (React Native) / Web"] -- "REST + JWT" --> APP
```
