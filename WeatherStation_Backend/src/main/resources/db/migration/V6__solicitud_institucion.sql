ALTER TABLE solicitudes_registro ALTER COLUMN escuela_id DROP NOT NULL;
ALTER TABLE solicitudes_registro ADD COLUMN institucion VARCHAR(255);
