import { Bus, Check, House, ShoppingCart, Utensils } from "lucide-react";
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
import { brandGradient, colors, fontFamily, formatCLP } from "../theme";

type QuickEntryProps = {
  readonly title: string;
  readonly amount: number;
  readonly detail: string;
  readonly style?: React.CSSProperties;
};

const CATEGORIES = [
  { name: "Súper", color: "#10b981", Icon: ShoppingCart },
  { name: "Comida", color: "#f97316", Icon: Utensils },
  { name: "Transporte", color: "#3b82f6", Icon: Bus },
  { name: "Hogar", color: "#06b6d4", Icon: House },
];
/** La categoría que se elige en la demo ("Comida"). */
const PICKED = 1;

/** Escena 3: registrar un gasto en un teléfono (monto → categoría → guardar). */
const QuickEntryInner: React.FC<QuickEntryProps> = ({
  title,
  amount,
  detail,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Momentos de la demo, en segundos dentro de la escena.
  const typeStart = 0.6 * fps;
  const typeEnd = 1.5 * fps;
  const pickAt = 1.9 * fps;
  const saveAt = 2.6 * fps;

  // El monto se "escribe" dígito a dígito.
  const digits = String(amount);
  const typed = Math.round(
    interpolate(frame, [typeStart, typeEnd], [0, digits.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const shownAmount = typed === 0 ? 0 : Number(digits.slice(0, typed));
  const picked = frame >= pickAt;
  const saved = frame >= saveAt;

  return (
    <AbsoluteFill
      style={{
        background: brandGradient,
        alignItems: "center",
        fontFamily,
        ...style,
      }}
    >
      <div
        style={{
          marginTop: 150,
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -3,
          color: "white",
          textAlign: "center",
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>

      {/* Teléfono */}
      <div
        style={{
          marginTop: 90,
          width: 760,
          height: 1100,
          borderRadius: 90,
          backgroundColor: colors.bg,
          border: "14px solid #0d1f22",
          boxShadow: "0 40px 120px rgba(0,0,0,0.35)",
          padding: "70px 56px",
          display: "flex",
          flexDirection: "column",
          color: colors.text,
          translate: interpolate(frame, [0, 0.6 * fps], ["0px 300px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 600, color: colors.muted }}>
          Nuevo gasto
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: -5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatCLP(shownAmount)}
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 120,
              marginLeft: 8,
              verticalAlign: "-10px",
              backgroundColor: colors.brandMid,
              opacity: !picked && Math.floor(frame / (0.25 * fps)) % 2 === 0 ? 1 : 0,
            }}
          />
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 44,
            color: colors.text2,
            opacity: interpolate(frame, [typeEnd, typeEnd + 0.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {detail}
        </div>

        <div
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 24,
          }}
        >
          {CATEGORIES.map(({ name, color, Icon }, i) => {
            const active = picked && i === PICKED;
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "26px 24px",
                  borderRadius: 28,
                  backgroundColor: active ? colors.brandSoft : colors.surface,
                  outline: active
                    ? `5px solid ${colors.brandMid}`
                    : "5px solid transparent",
                  fontSize: 38,
                  fontWeight: 600,
                  scale:
                    i === PICKED
                      ? interpolate(
                          frame,
                          [pickAt, pickAt + 0.1 * fps, pickAt + 0.3 * fps],
                          [1, 0.94, 1],
                          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                        )
                      : 1,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={36} color="white" strokeWidth={2.4} />
                </div>
                {name}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Botón Guardar → confirmado */}
        <div
          style={{
            height: 140,
            borderRadius: 40,
            backgroundColor: saved ? colors.brandMid : colors.brand,
            color: "white",
            fontSize: 48,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            scale: interpolate(
              frame,
              [saveAt - 0.1 * fps, saveAt, saveAt + 0.25 * fps],
              [1, 0.95, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          {saved ? (
            <>
              <Check size={56} strokeWidth={3} />
              Guardado
            </>
          ) : (
            "Guardar"
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const quickEntrySchema = {
  title: { type: "text-content", default: "", description: "Título" },
  amount: {
    type: "number",
    default: 6500,
    min: 0,
    step: 100,
    integer: true,
    keyframable: false,
    hiddenFromList: false,
    description: "Monto (CLP)",
  },
  detail: { type: "text-content", default: "", description: "Detalle" },
} as const satisfies InteractivitySchema;

export const QuickEntry = Interactive.withSchema({
  Component: QuickEntryInner,
  componentName: "<QuickEntry>",
  schema: quickEntrySchema,
  wrapInSequence: true,
});
