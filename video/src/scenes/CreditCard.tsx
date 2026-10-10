import { CalendarClock } from "lucide-react";
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Burst, Shine } from "../components/Effects";
import { KineticTitle } from "../components/KineticTitle";
import { colors, fontFamily, formatCLP } from "../theme";

type CreditCardProps = {
  readonly title: string;
  readonly dueLabel: string;
  readonly footnote: string;
  readonly style?: React.CSSProperties;
};

// Compras del ciclo de facturación (datos de ejemplo). `installment` = cuota pagada de un total.
const PURCHASES = [
  { name: "Supermercado", note: "12 oct", value: 54300 },
  { name: "Zapatillas", note: "Cuota 2 de 3", value: 29990, installment: [2, 3] },
  { name: "Bencina", note: "18 oct", value: 42000 },
  { name: "Streaming", note: "20 oct", value: 7990 },
];
const TOTAL = PURCHASES.reduce((s, p) => s + p.value, 0);
const PURPLE = "#5b3fc4";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Escena: tarjeta que gira en 3D, con corte, vencimiento y lo que hay que pagar. */
const CreditCardInner: React.FC<CreditCardProps> = ({ title, dueLabel, footnote, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // La tarjeta gira 360° y se asienta; el reverso se ve entre 90° y 270°.
  const flip = interpolate(frame, [0.2 * fps, 1.3 * fps], [180, 360], {
    ...clamp,
    easing: Easing.out(Easing.back(1.4)),
  });
  const showingBack = flip % 360 > 90 && flip % 360 < 270;
  const listStart = 1.3;
  const totalAt = listStart + PURCHASES.length * 0.22 + 0.2;
  const totalPop = spring({ frame: frame - totalAt * fps, fps, config: { damping: 8 } });
  const datesPop = (i: number) => spring({ frame: frame - (1.1 + i * 0.12) * fps, fps, config: { damping: 7 } });

  return (
    <AbsoluteFill style={{ fontFamily, color: colors.text, ...style }}>
      <Backdrop variant="soft" />
      <AbsoluteFill style={{ padding: "150px 100px" }}>
        <KineticTitle text={title} accentWords={["control"]} accentColor={PURPLE} />

        {/* La tarjeta */}
        <div
          style={{
            position: "relative",
            marginTop: 60,
            height: 420,
            flexShrink: 0,
            borderRadius: 48,
            overflow: "hidden",
            padding: "48px 56px",
            background: showingBack
              ? "linear-gradient(135deg, #1b1340, #3a2a85)"
              : "linear-gradient(135deg, #2a1f5c 0%, #5b3fc4 60%, #8b5cf6 100%)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 40px 90px rgba(42, 31, 92, 0.4)",
            transform: `perspective(2000px) rotateY(${flip}deg) rotateX(${Math.sin(t * 1.5) * 4}deg)`,
            translate: `0px ${Math.sin(t * 2) * 10}px`,
          }}
        >
          {showingBack ? (
            <div style={{ marginTop: 40, marginLeft: -56, marginRight: -56, height: 90, backgroundColor: "#0d0a1f" }} />
          ) : (
            <>
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
              <div style={{ display: "flex", gap: 30, fontSize: 34 }}>
                {[
                  ["Corte", "Día 25"],
                  ["Vence", "Día 10"],
                ].map(([label, value], i) => (
                  <div
                    key={label}
                    style={{
                      padding: "14px 28px",
                      borderRadius: 24,
                      backgroundColor: "rgba(255,255,255,0.16)",
                      scale: String(datesPop(i)),
                    }}
                  >
                    <div style={{ opacity: 0.8 }}>{label}</div>
                    <div style={{ fontSize: 48, fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
              <Shine at={1.4} duration={0.8} opacity={0.35} />
            </>
          )}
        </div>

        {/* Compras del ciclo */}
        <div
          style={{
            marginTop: 44,
            flexShrink: 0,
            borderRadius: 44,
            backgroundColor: colors.bg,
            padding: "20px 48px",
            boxShadow: "0 20px 60px rgba(13,31,34,0.08)",
          }}
        >
          {PURCHASES.map((p, i) => {
            const s = spring({ frame: frame - (listStart + i * 0.22) * fps, fps, config: { damping: 13 } });
            return (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "18px 0",
                  borderBottom: `2px solid ${colors.border}`,
                  opacity: s > 0.01 ? 1 : 0,
                  translate: `${(1 - s) * 200}px 0px`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 42, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, color: colors.muted }}>
                    {p.note}
                    {p.installment ? (
                      <span style={{ display: "inline-flex", gap: 8 }}>
                        {Array.from({ length: p.installment[1] }, (_, k) => (
                          <span
                            key={k}
                            style={{
                              width: 40,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: k < p.installment[0] ? PURPLE : colors.surface2,
                            }}
                          />
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ fontSize: 44, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {formatCLP(p.value)}
                </div>
              </div>
            );
          })}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "30px 0 22px",
              opacity: totalPop > 0.01 ? 1 : 0,
              scale: String(0.8 + totalPop * 0.2),
            }}
          >
            <CalendarClock size={48} color={PURPLE} strokeWidth={2.4} />
            <div style={{ flex: 1, fontSize: 42, fontWeight: 600 }}>{dueLabel}</div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: -1,
                color: PURPLE,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatCLP(
                interpolate(frame, [totalAt * fps, (totalAt + 0.7) * fps], [0, TOTAL], {
                  ...clamp,
                  easing: Easing.bezier(0.33, 1, 0.68, 1),
                }),
              )}
            </div>
            <Burst x={720} y={60} at={totalAt + 0.7} distance={260} colors={[PURPLE, "#8b5cf6", "#eab308"]} />
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 44,
            lineHeight: 1.3,
            color: colors.text2,
            opacity: interpolate(frame, [(totalAt + 0.8) * fps, (totalAt + 1.2) * fps], [0, 1], clamp),
            translate: `0px ${interpolate(frame, [(totalAt + 0.8) * fps, (totalAt + 1.2) * fps], [30, 0], clamp)}px`,
          }}
        >
          {footnote}
        </div>
      </AbsoluteFill>
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
