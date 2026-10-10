import { TrendingDown } from "lucide-react";
import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Backdrop } from "../components/Backdrop";
import { KineticTitle } from "../components/KineticTitle";
import { Sfx } from "../components/Sfx";
import { colors, fontFamily, formatCLP } from "../theme";

type InsightsProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly badge: string;
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

/** Escena: análisis por categoría con barras que rebotan y una insignia de ahorro. */
const InsightsInner: React.FC<InsightsProps> = ({ title, subtitle, badge, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badgeAt = 0.5 + ROWS.length * 0.18 + 0.5;
  const badgePop = spring({ frame: frame - badgeAt * fps, fps, config: { damping: 7 } });

  return (
    <AbsoluteFill style={{ fontFamily, color: "white", ...style }}>
      <Backdrop variant="dark" />
      <AbsoluteFill style={{ padding: "190px 100px" }}>
        <KineticTitle text={title} accentWords={["plata"]} />
        <div
          style={{
            marginTop: 28,
            fontSize: 48,
            color: "#9fb3b1",
            lineHeight: 1.3,
            opacity: interpolate(frame, [0.5 * fps, 0.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {subtitle}
        </div>

        <div style={{ marginTop: 100, display: "flex", flexDirection: "column", gap: 52 }}>
          {ROWS.map((row, i) => {
            // Las barras crecen con un rebote (el resorte pasa un poco de 1 y vuelve).
            const s = spring({
              frame: frame - (0.5 + i * 0.18) * fps,
              fps,
              config: { damping: 9, stiffness: 90 },
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
                    opacity: Math.min(1, s * 2),
                  }}
                >
                  <span>{row.name}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatCLP(row.value * Math.min(s, 1))}</span>
                </div>
                <div style={{ height: 48, borderRadius: 24, backgroundColor: colors.darkSurface2 }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 24,
                      backgroundColor: row.color,
                      width: `${(row.value / MAX) * 100 * s}%`,
                      boxShadow: `0 0 40px ${row.color}66`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 70,
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "24px 40px",
            borderRadius: 999,
            backgroundColor: colors.brandGreen,
            color: colors.text,
            fontSize: 46,
            fontWeight: 700,
            opacity: badgePop > 0.01 ? 1 : 0,
            scale: String(badgePop),
            rotate: `${(1 - badgePop) * -20}deg`,
          }}
        >
          <TrendingDown size={52} strokeWidth={2.6} />
          {badge}
        </div>
      </AbsoluteFill>
      {/* Sonido: cada barra y la insignia */}
      {ROWS.map((row, i) => (
        <Sfx key={row.name} name="pluck_002" at={0.5 + i * 0.18} volume={0.3} />
      ))}
      <Sfx name="maximize_003" at={badgeAt} volume={0.6} />
    </AbsoluteFill>
  );
};

const insightsSchema = {
  title: { type: "text-content", default: "", description: "Título" },
  subtitle: { type: "text-content", default: "", description: "Bajada" },
  badge: { type: "text-content", default: "", description: "Insignia" },
} as const satisfies InteractivitySchema;

export const Insights = Interactive.withSchema({
  Component: InsightsInner,
  componentName: "<Insights>",
  schema: insightsSchema,
  wrapInSequence: true,
});
