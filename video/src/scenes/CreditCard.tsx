import { CalendarClock } from "lucide-react";
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

type CreditCardProps = {
  readonly title: string;
  readonly dueLabel: string;
  readonly footnote: string;
  readonly style?: React.CSSProperties;
};

// Compras del ciclo de facturación (datos de ejemplo).
const PURCHASES = [
  { name: "Supermercado", note: "12 oct", value: 54300 },
  { name: "Zapatillas", note: "Cuota 2 de 3", value: 29990 },
  { name: "Bencina", note: "18 oct", value: 42000 },
  { name: "Streaming", note: "20 oct", value: 7990 },
];
const TOTAL = PURCHASES.reduce((s, p) => s + p.value, 0);

/** Escena: tarjeta de crédito con fecha de corte, vencimiento y lo que hay que pagar. */
const CreditCardInner: React.FC<CreditCardProps> = ({
  title,
  dueLabel,
  footnote,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const listStart = 1.1 * fps;
  const totalStart = listStart + PURCHASES.length * 0.3 * fps;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.surface,
        padding: "150px 100px",
        fontFamily,
        color: colors.text,
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

      {/* La tarjeta */}
      <div
        style={{
          marginTop: 60,
          height: 420,
          flexShrink: 0,
          borderRadius: 48,
          padding: "48px 56px",
          background: "linear-gradient(135deg, #2a1f5c 0%, #5b3fc4 60%, #8b5cf6 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(42, 31, 92, 0.35)",
          rotate: interpolate(frame, [0, 0.8 * fps], ["-8deg", "0deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [0, 0.8 * fps], ["0px 200px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, fontWeight: 600 }}>
          <span>Tarjeta de crédito</span>
          <span style={{ opacity: 0.8 }}>•••• 4821</span>
        </div>
        <div
          style={{
            marginTop: 32,
            width: 110,
            height: 80,
            borderRadius: 16,
            background: "linear-gradient(135deg, #f5d98b, #c9a13b)",
          }}
        />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 70, fontSize: 34 }}>
          <div>
            <div style={{ opacity: 0.75 }}>Corte</div>
            <div style={{ fontSize: 48, fontWeight: 700 }}>Día 25</div>
          </div>
          <div>
            <div style={{ opacity: 0.75 }}>Vence</div>
            <div style={{ fontSize: 48, fontWeight: 700 }}>Día 10</div>
          </div>
        </div>
      </div>

      {/* Compras del ciclo */}
      <div
        style={{
          marginTop: 44,
          flexShrink: 0,
          borderRadius: 44,
          backgroundColor: colors.bg,
          padding: "20px 48px",
        }}
      >
        {PURCHASES.map((p, i) => {
          const start = listStart + i * 0.3 * fps;
          return (
            <div
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "18px 0",
                borderBottom: `2px solid ${colors.border}`,
                opacity: interpolate(frame, [start, start + 0.3 * fps], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 42, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 34, color: colors.muted }}>{p.note}</div>
              </div>
              <div style={{ fontSize: 44, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {formatCLP(p.value)}
              </div>
            </div>
          );
        })}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "30px 0 22px",
            opacity: interpolate(frame, [totalStart, totalStart + 0.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <CalendarClock size={48} color="#5b3fc4" strokeWidth={2.4} />
          <div style={{ flex: 1, fontSize: 42, fontWeight: 600 }}>{dueLabel}</div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: -1,
              color: "#5b3fc4",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCLP(
              interpolate(frame, [totalStart, totalStart + 0.8 * fps], [0, TOTAL], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.33, 1, 0.68, 1),
              }),
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          fontSize: 44,
          lineHeight: 1.3,
          color: colors.text2,
          opacity: interpolate(frame, [totalStart + 0.8 * fps, totalStart + 1.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {footnote}
      </div>
    </AbsoluteFill>
  );
};

const creditCardSchema = {
  title: { type: "text-content", default: "", description: "Título" },
  dueLabel: { type: "text-content", default: "", description: "Texto del total" },
  footnote: { type: "text-content", default: "", description: "Nota final" },
} as const satisfies InteractivitySchema;

export const CreditCardScene = Interactive.withSchema({
  Component: CreditCardInner,
  componentName: "<CreditCardScene>",
  schema: creditCardSchema,
  wrapInSequence: true,
});
