-- Valores por defecto de configuración (umbrales de alertas y límites de IA).
-- Editables en caliente sin recompilar (tabla 'configuracion').
INSERT INTO configuracion (clave, valor, descripcion, updated_at) VALUES
    ('alerta.humedad.umbral',   '90',  'Humedad (%) para alerta de lluvia',                 now()),
    ('alerta.presion.caida_hpa','1.0', 'Caída de presión (hPa) en la ventana para lluvia',  now()),
    ('alerta.viento.umbral',    '40',  'Viento (km/h) para alerta de viento fuerte',        now()),
    ('alerta.temp.umbral',      '38',  'Temperatura (°C) para alerta de calor extremo',     now()),
    ('estacion.offline.minutos','10',  'Minutos sin publicar para considerar estación offline', now());
