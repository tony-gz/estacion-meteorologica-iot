-- Corrige el rol de los dueños de estación: deben ser RESPONSABLE, no INVESTIGADOR.
-- Contexto: SolicitudService.aprobar() ascendía al solicitante a INVESTIGADOR (solo
-- lectura de red), dejando al dueño (responsable_id = solicitante) sin poder gestionar
-- su propia estación, ya que la gestión (editar, conexiones, provisioning BLE, ver
-- no-aprobadas) está gated a RESPONSABLE.
-- Ver specs/002-app-movil/plan-provisioning-completo.md §7 y specs/001-.../spec.md (US2, corrección).

-- 1) Ligar al dueño con la escuela de su estación si aún no tiene una (un RESPONSABLE
--    debe estar asociado a una escuela). estaciones.escuela_id es NOT NULL.
UPDATE usuarios u
SET escuela_id = e.escuela_id
FROM estaciones e
WHERE e.responsable_id = u.id
  AND u.escuela_id IS NULL;

-- 2) Los dueños de estación con rol INVESTIGADOR o USUARIO pasan a RESPONSABLE.
UPDATE usuarios u
SET rol = 'RESPONSABLE'
WHERE u.rol IN ('INVESTIGADOR', 'USUARIO')
  AND EXISTS (SELECT 1 FROM estaciones e WHERE e.responsable_id = u.id);
