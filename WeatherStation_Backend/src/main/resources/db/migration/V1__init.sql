-- Esquema inicial del sistema (PostgreSQL). Solo datos propios del backend;
-- los datos meteorológicos viven en Firebase. Columnas en snake_case para
-- coincidir con el mapeo por defecto de Hibernate.

CREATE TABLE usuarios (
    id            UUID PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol           VARCHAR(20)  NOT NULL,
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY,
    usuario_id      UUID         NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    expira_en       TIMESTAMPTZ  NOT NULL,
    revocado        BOOLEAN      NOT NULL DEFAULT FALSE,
    reemplazado_por UUID,
    created_at      TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_refresh_usuario ON refresh_tokens (usuario_id);

CREATE TABLE alertas (
    id               UUID PRIMARY KEY,
    estacion_id      VARCHAR(100)     NOT NULL,
    tipo             VARCHAR(20)      NOT NULL,
    severidad        VARCHAR(10)      NOT NULL,
    mensaje          VARCHAR(255)     NOT NULL,
    valor_disparo    DOUBLE PRECISION NOT NULL DEFAULT 0,
    variable_disparo VARCHAR(50),
    estado           VARCHAR(10)      NOT NULL,
    detectada_en     TIMESTAMPTZ      NOT NULL,
    resuelta_en      TIMESTAMPTZ
);
CREATE INDEX idx_alertas_estacion ON alertas (estacion_id);
CREATE INDEX idx_alertas_estado ON alertas (estado);

CREATE TABLE estaciones_admin (
    id            VARCHAR(100) PRIMARY KEY,
    notas         VARCHAR(500),
    habilitada    BOOLEAN     NOT NULL DEFAULT TRUE,
    registrada_en TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE logs_auditoria (
    id         UUID PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    accion     VARCHAR(50) NOT NULL,
    recurso    VARCHAR(255),
    ip         VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_logs_usuario ON logs_auditoria (usuario_id);

CREATE TABLE configuracion (
    clave       VARCHAR(100) PRIMARY KEY,
    valor       VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255),
    updated_at  TIMESTAMPTZ  NOT NULL
);
