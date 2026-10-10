import { Bus, Check, House, ShoppingCart, Utensils } from "lucide-react";
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
import { Burst, TapRipple } from "../components/Effects";
import { KineticTitle } from "../components/KineticTitle";
import { Sfx } from "../components/Sfx";
import { colors, fontFamily, formatCLP } from "../theme";

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

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Escena 3: registrar un gasto en un teléfono (monto → categoría → guardar). */
const QuickEntryInner: React.FC<QuickEntryProps> = ({ title, amount, detail, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Momentos de la demo, en segundos dentro de la escena.
  const typeStart = 0.9;
  const typeEnd = 2.1;
  const pickAt = 2.8;
  const saveAt = 3.7;

  // El monto se "escribe" dígito a dígito, con un pequeño salto por dígito.
  const digits = String(amount);
  const typedFloat = interpolate(frame, [typeStart * fps, typeEnd * fps], [0, digits.length], clamp);
  const typed = Math.round(typedFloat);
  const shownAmount = typed === 0 ? 0 : Number(digits.slice(0, typed));
  const digitBump = typed > 0 && typed <= digits.length ? 1 + Math.max(0, 0.06 - Math.abs(typedFloat - typed) * 0.12) : 1;
  const picked = frame >= pickAt * fps;
  const saved = frame >= saveAt * fps;

  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const savedPop = spring({ frame: frame - saveAt * fps, fps, config: { damping: 8 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", fontFamily, ...style }}>
      <Backdrop variant="brand" />
      <div style={{ marginTop: 150, position: "relative" }}>
        <KineticTitle text={title} color="white" align="center" accentWords={["segundos"]} />
      </div>

      {/* Teléfono */}
      <div
        style={{
          position: "relative",
          marginTop: 80,
          width: 760,
          height: 1100,
          borderRadius: 90,
          backgroundColor: colors.bg,
          border: "14px solid #0d1f22",
          boxShadow: "0 50px 140px rgba(0,0,0,0.4)",
          padding: "70px 56px",
          display: "flex",
          flexDirection: "column",
          color: colors.text,
          transform: `perspective(2400px) rotateY(${(1 - enter) * -35 + Math.sin(t * 1.4) * 4}deg) rotateX(${(1 - enter) * 20 + 4}deg)`,
          translate: `0px ${(1 - enter) * 500 + Math.sin(t * 2) * 12}px`,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 600, color: colors.muted }}>Nuevo gasto</div>
        <div
          style={{
            marginTop: 20,
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: -5,
            fontVariantNumeric: "tabular-nums",
            scale: String(digitBump),
            transformOrigin: "0% 50%",
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
            opacity: interpolate(frame, [typeEnd * fps, (typeEnd + 0.2) * fps], [0, 1], clamp),
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
            const pop = i === PICKED ? spring({ frame: frame - pickAt * fps, fps, config: { damping: 7 } }) : 0;
            const chipIn = spring({ frame: frame - (0.5 + i * 0.08) * fps, fps, config: { damping: 12 } });
            return (
              <div
                key={name}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "26px 24px",
                  borderRadius: 28,
                  backgroundColor: active ? colors.brandSoft : colors.surface,
                  outline: active ? `5px solid ${colors.brandMid}` : "5px solid transparent",
                  fontSize: 38,
                  fontWeight: 600,
                  scale: String(chipIn * (1 + 0.08 * Math.sin(Math.min(pop, 1) * Math.PI))),
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
                    rotate: active ? `${Math.sin(pop * Math.PI * 2) * 12}deg` : "0deg",
                  }}
                >
                  <Icon size={36} color="white" strokeWidth={2.4} />
                </div>
                {name}
                {i === PICKED ? <TapRipple x={150} y={58} at={pickAt} /> : null}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Botón Guardar → confirmado */}
        <div
          style={{
            position: "relative",
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
            scale: String(saved ? 0.92 + savedPop * 0.08 : 1),
          }}
        >
          {saved ? (
            <>
              <span style={{ display: "inline-flex", scale: String(savedPop), rotate: `${(1 - savedPop) * -90}deg` }}>
                <Check size={56} strokeWidth={3} />
              </span>
              Guardado
            </>
          ) : (
            "Guardar"
          )}
          <TapRipple x={310} y={70} at={saveAt} color="rgba(255,255,255,0.5)" />
          <Burst x={310} y={70} at={saveAt} distance={340} colors={[colors.brandGreen, "#f97316", "#eab308", "white"]} />
        </div>

        {/* El gasto sale volando del teléfono */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 200,
            translate: `-50% ${interpolate(frame, [(saveAt + 0.15) * fps, (saveAt + 1) * fps], [0, -760], {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            })}px`,
            opacity: interpolate(
              frame,
              [(saveAt + 0.15) * fps, (saveAt + 0.3) * fps, (saveAt + 0.8) * fps, (saveAt + 1) * fps],
              [0, 1, 1, 0],
              clamp,
            ),
            padding: "24px 44px",
            borderRadius: 999,
            backgroundColor: "#0d1f22",
            color: "white",
            fontSize: 56,
            fontWeight: 800,
            whiteSpace: "nowrap",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          }}
        >
          −{formatCLP(amount)}
        </div>
      </div>
      {/* Sonido: teclas al escribir el monto, toque en la categoría y confirmación */}
      {digits.split("").map((_, k) => (
        <Sfx
          key={k}
          name="tick_001"
          at={typeStart + ((k + 0.5) * (typeEnd - typeStart)) / digits.length}
          volume={0.45}
        />
      ))}
      <Sfx name="click_002" at={pickAt} volume={0.6} />
      <Sfx name="select_003" at={pickAt} volume={0.45} />
      <Sfx name="confirmation_002" at={saveAt} volume={0.6} />
      <Sfx name="whoosh-2" at={saveAt + 0.15} volume={0.25} />
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
