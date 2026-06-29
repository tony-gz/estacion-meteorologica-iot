package com.tony.wheatherstation.gemini;

import com.tony.wheatherstation.domain.EstacionInfo;
import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.dto.estacion.EstadisticasResponse;
import org.springframework.stereotype.Component;

/**
 * Construye el prompt para Gemini. La instrucción de sistema fuerza respuestas
 * fundamentadas únicamente en los datos provistos (constitución, principio VI —
 * la IA no inventa).
 */
@Component
public class PromptBuilder {

    private static final String SISTEMA = """
            Eres un asistente meteorológico de una red de estaciones. Responde SIEMPRE
            en español, de forma breve y clara. Usa ÚNICAMENTE los datos proporcionados
            sobre la estación; no inventes valores ni pronósticos sin respaldo. Si los
            datos son insuficientes, dilo explícitamente. Limítate a temas meteorológicos
            de esta estación; si te preguntan otra cosa, indícalo amablemente.""";

    public String sistema() {
        return SISTEMA;
    }

    /** Serializa el contexto de datos (estación + última lectura + estadísticas). */
    public String construirContexto(EstacionInfo info, LecturaMeteorologica actual,
                                    EstadisticasResponse stats) {
        StringBuilder sb = new StringBuilder();
        sb.append("Estación: ").append(info.nombre())
                .append(" (").append(info.ubicacion()).append(") [id=").append(info.id()).append("]\n");

        if (actual != null) {
            sb.append("Última lectura (").append(actual.timestamp()).append("): ")
                    .append("temperatura ").append(fmt(actual.temperatura())).append(" °C, ")
                    .append("humedad ").append(fmt(actual.humedad())).append(" %, ")
                    .append("presión ").append(fmt(actual.presion())).append(" hPa, ")
                    .append("viento ").append(fmt(actual.vientoKmh())).append(" km/h ")
                    .append(actual.vientoDir() != null ? actual.vientoDir() : "")
                    .append(", lluvia ").append(fmt(actual.lluviaMm())).append(" mm\n");
        } else {
            sb.append("Sin lectura actual disponible.\n");
        }

        if (stats.muestras() > 0) {
            sb.append("Resumen de ").append(stats.muestras()).append(" muestras (")
                    .append(stats.desde()).append(" .. ").append(stats.hasta()).append("):\n")
                    .append(agregado("Temperatura", stats.temperatura(), "°C"))
                    .append(agregado("Humedad", stats.humedad(), "%"))
                    .append(agregado("Presión", stats.presion(), "hPa"))
                    .append(agregado("Viento", stats.vientoKmh(), "km/h"))
                    .append("- Lluvia total: ").append(fmt(stats.lluviaTotalMm())).append(" mm\n");
        } else {
            sb.append("Sin histórico en la ventana consultada.\n");
        }
        return sb.toString();
    }

    private String agregado(String nombre, EstadisticasResponse.Agregado a, String unidad) {
        if (a == null) {
            return "";
        }
        return "- " + nombre + ": min " + fmt(a.min()) + " / max " + fmt(a.max())
                + " / prom " + fmt(a.promedio()) + " " + unidad + "\n";
    }

    private String fmt(double v) {
        return String.format("%.1f", v);
    }
}
