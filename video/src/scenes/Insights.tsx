import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { colors, fontFamily, formatCLP } from "../theme";

type InsightsProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly style?: React.CSSProperties;
};

// Gasto del mes por categoría (datos de ejemplo, colores de la app).
const ROWS = [
  { name: "Supermercado", value: 142300, color: "#10b981" },
  { name: "Hogar y cuentas", value: 95000, color: "#06b6d4" },
  { name: "Comida y antojos", value: 68900, color: "#f97316" },
  { name: "Transporte", value: 41200, color: "#3b82f6" },
  { name: "Salidas y ocio", value: 32500, color: "#8b5cf6" },
];
const MAX = ROWS[0].value;

/** Escena 5: análisis por categoría, en modo oscuro. */
const InsightsInner: React.FC<InsightsProps> = ({ title, subtitle, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.darkBg,
        padding: "190px 100px",
        fontFamily,
        color: "white",
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -3,
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 48,
          color: "#9fb3b1",
          lineHeight: 1.3,
        }}
      >
        {subtitle}
      </div>

      <div
        style={{
          marginTop: 110,
          display: "flex",
          flexDirection: "column",
          gap: 56,
        }}
      >
        {ROWS.map((row, i) => {
          const start = 0.3 * fps + i * 0.15 * fps;
          const progress = interpolate(frame, [start, start + 0.9 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          return (
            <div key={row.name}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 44,
                  fontWeight: 600,
                  marginBottom: 18,
                  opacity: interpolate(frame, [start, start + 0.3 * fps], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                <span>{row.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCLP(row.value * progress)}
                </span>
              </div>
              <div
                style={{
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.darkSurface2,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 22,
                    backgroundColor: row.color,
                    width: `${(row.value / MAX) * 100 * progress}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const insightsSchema = {
  title: { type: "text-content", default: "", description: "Título" },
  subtitle: { type: "text-content", default: "", description: "Bajada" },
} as const satisfies InteractivitySchema;

export const Insights = Interactive.withSchema({
  Component: InsightsInner,
  componentName: "<Insights>",
  schema: insightsSchema,
  wrapInSequence: true,
});
