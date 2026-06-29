-- V5: los nuevos tipos de alerta de salud no caben en VARCHAR(20)
-- ('ESTACION_DESCONECTADA' = 21 caracteres). Se amplía la columna.
ALTER TABLE alertas ALTER COLUMN tipo TYPE VARCHAR(30);
