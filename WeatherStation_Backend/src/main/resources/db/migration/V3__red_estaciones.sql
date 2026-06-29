-- V3: Red de Estaciones (multi-escuela) + consolidación en PostgreSQL.
-- Los datos meteorológicos pasan a vivir aquí (lectura_actual + lecturas);
-- Firebase se retira en una fase posterior. La tabla estaciones_admin (v1) se
-- conserva durante la transición y se retirará cuando la consulta migre a Postgres.
-- Columnas en snake_case (mapeo por defecto de Hibernate). UUID generados por la app.

-- ───────────────────────────── ESCUELAS ─────────────────────────────
CREATE TABLE escuelas (
    id             UUID PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    clave          VARCHAR(50) UNIQUE,
    municipio      VARCHAR(120),
    ubicacion      VARCHAR(255),
    latitud        DOUBLE PRECISION,
    longitud       DOUBLE PRECISION,
    director       VARCHAR(150),
    contacto_email VARCHAR(150),
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL
);

-- Usuario RESPONSABLE ligado a una escuela (nullable para el resto de roles).
ALTER TABLE usuarios ADD COLUMN escuela_id UUID REFERENCES escuelas (id) ON DELETE SET NULL;
CREATE INDEX idx_usuarios_escuela ON usuarios (escuela_id);

-- ──────────────────────────── ESTACIONES ────────────────────────────
CREATE TABLE estaciones (
    id                  UUID PRIMARY KEY,
    uuid                UUID NOT NULL UNIQUE,
    nombre              VARCHAR(120) NOT NULL,
    descripcion         VARCHAR(500),
    escuela_id          UUID NOT NULL REFERENCES escuelas (id),
    responsable_id      UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    ubicacion           VARCHAR(255),
    municipio           VARCHAR(120),
    latitud             DOUBLE PRECISION,
    longitud            DOUBLE PRECISION,
    altitud             DOUBLE PRECISION,
    firmware            VARCHAR(40),
    hardware            VARCHAR(60),
    ultimo_rssi         INTEGER,
    estado              VARCHAR(20) NOT NULL,
    fecha_registro      TIMESTAMPTZ NOT NULL,
    ultima_conexion     TIMESTAMPTZ,
    motivo_rechazo      VARCHAR(300),
    intervalo_envio_seg INTEGER NOT NULL DEFAULT 60,
    muestreo_seg        INTEGER NOT NULL DEFAULT 5,
    zona_horaria        VARCHAR(60) NOT NULL DEFAULT 'America/Mexico_City',
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_estaciones_escuela ON estaciones (escuela_id);
CREATE INDEX idx_estaciones_estado ON estaciones (estado);

-- ─────────────────────────── STATION TOKENS ─────────────────────────
CREATE TABLE station_tokens (
    id            UUID PRIMARY KEY,
    estacion_id   UUID NOT NULL REFERENCES estaciones (id) ON DELETE CASCADE,
    token_hash    VARCHAR(255) NOT NULL UNIQUE,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en     TIMESTAMPTZ NOT NULL,
    revocado_en   TIMESTAMPTZ,
    ultimo_uso_en TIMESTAMPTZ
);
CREATE INDEX idx_station_tokens_estacion ON station_tokens (estacion_id);

-- ─────────────────────── SOLICITUDES DE REGISTRO ────────────────────
CREATE TABLE solicitudes_registro (
    id             UUID PRIMARY KEY,
    uuid_propuesto UUID NOT NULL,
    nombre         VARCHAR(120) NOT NULL,
    escuela_id     UUID NOT NULL REFERENCES escuelas (id),
    solicitante_id UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    ubicacion      VARCHAR(255),
    municipio      VARCHAR(120),
    latitud        DOUBLE PRECISION,
    longitud       DOUBLE PRECISION,
    firmware       VARCHAR(40),
    estado         VARCHAR(20) NOT NULL,
    motivo_rechazo VARCHAR(300),
    estacion_id    UUID REFERENCES estaciones (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL,
    resuelta_en    TIMESTAMPTZ,
    resuelta_por   UUID REFERENCES usuarios (id) ON DELETE SET NULL
);
CREATE INDEX idx_solicitudes_estado ON solicitudes_registro (estado);
CREATE INDEX idx_solicitudes_escuela ON solicitudes_registro (escuela_id);

-- ─────────────────────────── CONNECTION LOGS ────────────────────────
CREATE TABLE connection_logs (
    id             UUID PRIMARY KEY,
    estacion_id    UUID REFERENCES estaciones (id) ON DELETE SET NULL,
    uuid_reportado VARCHAR(64),
    ip             VARCHAR(64),
    firmware       VARCHAR(40),
    evento         VARCHAR(20) NOT NULL,
    detalle        VARCHAR(255),
    created_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_connlog_estacion ON connection_logs (estacion_id, created_at DESC);

-- ───────────────────────── PERMISOS (granularidad) ──────────────────
CREATE TABLE permisos (
    id          UUID PRIMARY KEY,
    nombre      VARCHAR(60) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);
CREATE TABLE rol_permisos (
    rol        VARCHAR(20) NOT NULL,
    permiso_id UUID NOT NULL REFERENCES permisos (id) ON DELETE CASCADE,
    PRIMARY KEY (rol, permiso_id)
);

-- ───────────────────── LECTURAS (datos meteorológicos) ──────────────
-- Snapshot por estación (una fila/estación, upsert por PK).
CREATE TABLE lectura_actual (
    estacion_id   UUID PRIMARY KEY REFERENCES estaciones (id) ON DELETE CASCADE,
    medido_en     TIMESTAMPTZ NOT NULL,
    recibido_en   TIMESTAMPTZ NOT NULL,
    temperatura   DOUBLE PRECISION,
    humedad       DOUBLE PRECISION,
    presion       DOUBLE PRECISION,
    viento_kmh    DOUBLE PRECISION,
    viento_dir    VARCHAR(8),
    viento_grados DOUBLE PRECISION,
    lluvia_mm     DOUBLE PRECISION
);

-- Histórico time-series. Idempotente por (estacion, medido_en).
CREATE TABLE lecturas (
    id          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    estacion_id UUID NOT NULL REFERENCES estaciones (id) ON DELETE CASCADE,
    medido_en   TIMESTAMPTZ NOT NULL,
    recibido_en TIMESTAMPTZ NOT NULL,
    temperatura DOUBLE PRECISION,
    humedad     DOUBLE PRECISION,
    presion     DOUBLE PRECISION,
    viento_kmh  DOUBLE PRECISION,
    viento_dir  VARCHAR(8),
    lluvia_mm   DOUBLE PRECISION,
    CONSTRAINT uq_lecturas_estacion_medido UNIQUE (estacion_id, medido_en)
);
CREATE INDEX idx_lecturas_estacion_medido ON lecturas (estacion_id, medido_en DESC);

-- ──────────────────── Seed: permisos finos (documentales) ───────────
INSERT INTO permisos (id, nombre, descripcion) VALUES
    (gen_random_uuid(), 'ESTACION_REGISTRAR', 'Registrar estaciones de su escuela'),
    (gen_random_uuid(), 'ESTACION_APROBAR',   'Aprobar/rechazar/deshabilitar estaciones'),
    (gen_random_uuid(), 'HISTORICO_VER',      'Consultar históricos y estadísticas'),
    (gen_random_uuid(), 'USUARIO_GESTIONAR',  'Gestionar usuarios y escuelas');

-- Mapeo rol→permiso (la autorización efectiva en v3 es por rol; esto documenta).
INSERT INTO rol_permisos (rol, permiso_id)
    SELECT 'ADMIN', id FROM permisos;
INSERT INTO rol_permisos (rol, permiso_id)
    SELECT 'RESPONSABLE', id FROM permisos WHERE nombre IN ('ESTACION_REGISTRAR', 'HISTORICO_VER');
INSERT INTO rol_permisos (rol, permiso_id)
    SELECT 'INVESTIGADOR', id FROM permisos WHERE nombre = 'HISTORICO_VER';

-- ──────────────────── Seed: claves de configuración nuevas ──────────
INSERT INTO configuracion (clave, valor, descripcion, updated_at) VALUES
    ('device.ratelimit.por_min',  '30', 'Peticiones por minuto permitidas a /api/device/**',  now()),
    ('device.jwt.exp_min',        '60', 'Vida (min) del JWT de dispositivo',                  now()),
    ('device.timestamp.ventana_min','15','Ventana (min) de validez del timestamp reportado',  now()),
    ('ingesta.historial.cada_min','10', 'Cada cuántos minutos se inserta en el histórico',    now());
