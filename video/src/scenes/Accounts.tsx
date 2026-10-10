import { Banknote, CreditCard, Landmark, Wallet } from "lucide-react";
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
import { Burst } from "../components/Effects";
import { KineticTitle } from "../components/KineticTitle";
import { Sfx } from "../components/Sfx";
import { colors, fontFamily, formatCLP } from "../theme";

type AccountsProps = {
  readonly title: string;
  readonly style?: React.CSSProperties;
};

// Cuentas de ejemplo. La tarjeta muestra deuda, no saldo disponible.
const ACCOUNTS = [
  { name: "Cuenta corriente", note: "Banco", value: 412300, color: "#0a5b6b", Icon: Landmark },
  { name: "Cuenta vista", note: "Sueldo", value: 85200, color: "#2daa80", Icon: Wallet },
  { name: "Efectivo", note: "Billetera", value: 23000, color: "#eab308", Icon: Banknote },
  { name: "Tarjeta", note: "Crédito · por pagar", value: -134280, color: "#8b5cf6", Icon: CreditCard },
];
const TOTAL = ACCOUNTS.filter((a) => a.value > 0).reduce((s, a) => s + a.value, 0);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Escena: varias cuentas y tarjetas, cada una con su saldo. */
const AccountsInner: React.FC<AccountsProps> = ({ title, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const firstAt = 0.6;
  const gap = 0.32;
  const totalAt = firstAt + ACCOUNTS.length * gap + 0.3;
  const totalPop = spring({ frame: frame - totalAt * fps, fps, config: { damping: 8 } });

  return (
    <AbsoluteFill style={{ fontFamily, color: "white", ...style }}>
      <Backdrop variant="dark" />
      <AbsoluteFill style={{ padding: "190px 100px" }}>
        <KineticTitle text={title} accentWords={["todas", "cuentas"]} />

        <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 28 }}>
          {ACCOUNTS.map(({ name, note, value, color, Icon }, i) => {
            const start = (firstAt + i * gap) * fps;
            const s = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 140 } });
            const fromLeft = i % 2 === 0;
            const icon = spring({ frame: frame - start - 6, fps, config: { damping: 8 } });
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 32,
                  padding: "40px 44px",
                  borderRadius: 44,
                  backgroundColor: "rgba(26,42,45,0.85)",
                  border: "2px solid rgba(255,255,255,0.06)",
                  opacity: s > 0.01 ? 1 : 0,
                  translate: `${(1 - s) * (fromLeft ? -1100 : 1100)}px 0px`,
                  rotate: `${(1 - s) * (fromLeft ? -8 : 8)}deg`,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 30,
                    backgroundColor: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    scale: String(icon),
                    rotate: `${(1 - icon) * 180}deg`,
                  }}
                >
                  <Icon size={54} color="white" strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 46, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 36, color: "#9fb3b1" }}>{note}</div>
                </div>
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: value < 0 ? "#ff8a73" : "white",
                  }}
                >
                  {value < 0 ? "−" : ""}
                  {formatCLP(
                    interpolate(frame, [start + 4, start + 0.8 * fps], [0, value], {
                      ...clamp,
                      easing: Easing.out(Easing.cubic),
                    }),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "relative",
            marginTop: 56,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "36px 44px",
            borderRadius: 44,
            backgroundColor: "rgba(76,216,152,0.12)",
            border: `3px solid ${colors.brandGreen}`,
            opacity: totalPop > 0.01 ? 1 : 0,
            scale: String(0.7 + totalPop * 0.3),
          }}
        >
          <span style={{ fontSize: 46, color: "#cfe9df", fontWeight: 600 }}>Total en cuentas</span>
          <span
            style={{
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: -2,
              color: colors.brandGreen,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCLP(
              interpolate(frame, [totalAt * fps, (totalAt + 0.8) * fps], [0, TOTAL], {
                ...clamp,
                easing: Easing.bezier(0.33, 1, 0.68, 1),
              }),
            )}
          </span>
          <Burst x={700} y={70} at={totalAt + 0.8} distance={300} colors={[colors.brandGreen, "white", "#eab308"]} />
        </div>
      </AbsoluteFill>
      {/* Sonido: cada cuenta cae como una carta; el total suena a monedas */}
      {ACCOUNTS.map((a, i) => (
        <Sfx key={a.name} name="card-place-1" at={firstAt + i * gap} volume={0.45} />
      ))}
      <Sfx name="pluck_002" at={totalAt} volume={0.4} />
      <Sfx name="chips-stack-2" at={totalAt + 0.8} volume={0.6} />
    </AbsoluteFill>
  );
};

const accountsSchema = {
  title: { type: "text-content", default: "", description: "Título" },
} as const satisfies InteractivitySchema;

export const Accounts = Interactive.withSchema({
  Component: AccountsInner,
  componentName: "<Accounts>",
  schema: accountsSchema,
  wrapInSequence: true,
});
