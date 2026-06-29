-- V4: retira la tabla de metadata administrativa de v1. La identidad y el ciclo
-- de vida de las estaciones viven ahora en 'estaciones' (V3), y la consulta lee
-- las lecturas de 'lectura_actual'/'lecturas'. Firebase queda completamente fuera.
DROP TABLE IF EXISTS estaciones_admin;
