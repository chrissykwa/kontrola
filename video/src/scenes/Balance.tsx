import { Utensils } from "lucide-react";
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

type BalanceProps = {
  readonly title: string;
  readonly balanceBefore: number;
  readonly expense: number;
  readonly budgetUsed: number;
  readonly style?: React.CSSProperties;
};

/** Escena 4: el gasto se descuenta del saldo disponible. */
const BalanceInner: React.FC<BalanceProps> = ({
  title,
  balanceBefore,
  expense,
  budgetUsed,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const balance = interpolate(
    frame,
    [1.4 * fps, 2.8 * fps],
    [balanceBefore, balanceBefore - expense],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    },
  );

  const card: React.CSSProperties = {
    width: "100%",
    borderRadius: 56,
    backgroundColor: colors.surface,
    padding: "56px 60px",
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        padding: "190px 100px",
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

      <div
        style={{
          ...card,
          marginTop: 100,
          backgroundColor: colors.brand,
          color: "white",
          scale: interpolate(frame, [0, 0.5 * fps], [0.92, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
          opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 500, opacity: 0.85 }}>
          Disponible
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: -5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatCLP(balance)}
        </div>
        <div style={{ fontSize: 44, opacity: 0.85 }}>
          para el resto del mes
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
          opacity: interpolate(frame, [0.8 * fps, 1.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(
            frame,
            [0.8 * fps, 1.3 * fps],
            ["0px -40px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
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
          <div style={{ fontSize: 38, color: colors.muted }}>
            Comida · hoy
          </div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, color: colors.danger }}>
          −{formatCLP(expense)}
        </div>
      </div>

      {/* Presupuesto del mes */}
      <div style={{ ...card, marginTop: 40 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 44,
            fontWeight: 600,
          }}
        >
          <span>Presupuesto del mes</span>
          <span style={{ color: colors.brandMid }}>
            {Math.round(
              interpolate(frame, [1.8 * fps, 3.4 * fps], [0, budgetUsed], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            )}
            %
          </span>
        </div>
        <div
          style={{
            marginTop: 32,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surface2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 18,
              backgroundColor: colors.brandMid,
              width: `${interpolate(frame, [1.8 * fps, 3.4 * fps], [0, budgetUsed], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}%`,
            }}
          />
        </div>
      </div>
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
