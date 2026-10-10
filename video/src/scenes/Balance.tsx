import { Utensils } from "lucide-react";
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
import { Shine } from "../components/Effects";
import { KineticTitle } from "../components/KineticTitle";
import { colors, fontFamily, formatCLP } from "../theme";

type BalanceProps = {
  readonly title: string;
  readonly balanceBefore: number;
  readonly expense: number;
  readonly budgetUsed: number;
  readonly style?: React.CSSProperties;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Escena 4: el gasto cae sobre el saldo y se descuenta. */
const BalanceInner: React.FC<BalanceProps> = ({ title, balanceBefore, expense, budgetUsed, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hitAt = 1.3; // el gasto choca con la tarjeta
  const countEnd = 2.4;
  const balance = interpolate(frame, [hitAt * fps, countEnd * fps], [balanceBefore, balanceBefore - expense], {
    ...clamp,
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });
  const cardIn = spring({ frame: frame - 0.3 * fps, fps, config: { damping: 13 } });
  const hit = spring({ frame: frame - hitAt * fps, fps, config: { damping: 6, stiffness: 200 } });
  const rowIn = spring({ frame: frame - 1.6 * fps, fps, config: { damping: 11 } });
  const budgetIn = spring({ frame: frame - 2 * fps, fps, config: { damping: 12 } });
  const budget = interpolate(frame, [2.2 * fps, 3.4 * fps], [0, budgetUsed], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const card: React.CSSProperties = {
    width: "100%",
    borderRadius: 56,
    backgroundColor: colors.bg,
    padding: "56px 60px",
    boxShadow: "0 20px 60px rgba(13,31,34,0.08)",
  };

  return (
    <AbsoluteFill style={{ fontFamily, color: colors.text, ...style }}>
      <Backdrop variant="light" />
      <AbsoluteFill style={{ padding: "190px 100px" }}>
        <KineticTitle text={title} accentWords={["queda"]} accentColor={colors.brandMid} />

        <div style={{ position: "relative" }}>
          {/* El gasto que cae desde arriba */}
          <div
            style={{
              position: "absolute",
              right: 40,
              top: 0,
              zIndex: 2,
              padding: "20px 36px",
              borderRadius: 999,
              backgroundColor: colors.danger,
              color: "white",
              fontSize: 52,
              fontWeight: 800,
              translate: `0px ${interpolate(frame, [0.6 * fps, hitAt * fps], [-500, 60], {
                ...clamp,
                easing: Easing.in(Easing.quad),
              })}px`,
              opacity: interpolate(frame, [0.6 * fps, 0.8 * fps, hitAt * fps, (hitAt + 0.15) * fps], [0, 1, 1, 0], clamp),
              rotate: "6deg",
            }}
          >
            −{formatCLP(expense)}
          </div>

          <div
            style={{
              ...card,
              position: "relative",
              overflow: "hidden",
              marginTop: 100,
              background: "linear-gradient(135deg, #0a5b6b 0%, #127a78 70%, #2daa80 100%)",
              color: "white",
              scale: String(cardIn * (1 - Math.sin(Math.min(hit, 1) * Math.PI) * 0.04)),
              rotate: `${Math.sin(Math.min(hit, 1) * Math.PI * 2) * 1.5}deg`,
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 500, opacity: 0.85 }}>Disponible</div>
            <div
              style={{
                marginTop: 12,
                fontSize: 150,
                fontWeight: 800,
                letterSpacing: -5,
                fontVariantNumeric: "tabular-nums",
                color: frame > hitAt * fps && frame < countEnd * fps ? "#ffd2c8" : "white",
              }}
            >
              {formatCLP(balance)}
            </div>
            <div style={{ fontSize: 44, opacity: 0.85 }}>para el resto del mes</div>
            <Shine at={countEnd} />
          </div>
        </div>

        {/* El movimiento recién anotado */}
        <div
          style={{
            ...card,
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 32,
            opacity: rowIn > 0.01 ? 1 : 0,
            translate: `${(1 - rowIn) * 900}px 0px`,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 30,
              backgroundColor: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Utensils size={52} color="white" strokeWidth={2.4} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 48, fontWeight: 600 }}>Almuerzo</div>
            <div style={{ fontSize: 38, color: colors.muted }}>Comida · hoy</div>
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, color: colors.danger }}>−{formatCLP(expense)}</div>
        </div>

        {/* Presupuesto del mes */}
        <div
          style={{
            ...card,
            marginTop: 40,
            opacity: budgetIn > 0.01 ? 1 : 0,
            translate: `${(1 - budgetIn) * -900}px 0px`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 44, fontWeight: 600 }}>
            <span>Presupuesto del mes</span>
            <span style={{ color: colors.brandMid }}>{Math.round(budget)}%</span>
          </div>
          <div
            style={{
              marginTop: 32,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 20,
                width: `${budget}%`,
                backgroundColor: colors.brandMid,
                backgroundImage:
                  "repeating-linear-gradient(-45deg, rgba(255,255,255,0.18) 0 18px, transparent 18px 36px)",
                backgroundPosition: `${frame * 2}px 0px`,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const balanceSchema = {
  title: { type: "text-content", default: "", description: "Título" },
  balanceBefore: {
    type: "number",
    default: 290000,
    min: 0,
    step: 500,
    integer: true,
    keyframable: false,
    hiddenFromList: false,
    description: "Saldo antes del gasto (CLP)",
  },
  expense: {
    type: "number",
    default: 6500,
    min: 0,
    step: 100,
    integer: true,
    keyframable: false,
    hiddenFromList: false,
    description: "Gasto (CLP)",
  },
  budgetUsed: {
    type: "number",
    default: 64,
    min: 0,
    max: 100,
    integer: true,
    keyframable: false,
    hiddenFromList: false,
    description: "Presupuesto usado (%)",
  },
} as const satisfies InteractivitySchema;

export const Balance = Interactive.withSchema({
  Component: BalanceInner,
  componentName: "<Balance>",
  schema: balanceSchema,
  wrapInSequence: true,
});
