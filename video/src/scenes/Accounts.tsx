import { Banknote, CreditCard, Landmark, Wallet } from "lucide-react";
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

/** Escena: varias cuentas y tarjetas, cada una con su saldo. */
const AccountsInner: React.FC<AccountsProps> = ({ title, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalStart = 0.5 * fps + ACCOUNTS.length * 0.45 * fps;

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

      <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 28 }}>
        {ACCOUNTS.map(({ name, note, value, color, Icon }, i) => {
          const start = 0.5 * fps + i * 0.45 * fps;
          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                padding: "40px 44px",
                borderRadius: 44,
                backgroundColor: colors.darkSurface2,
                opacity: interpolate(frame, [start, start + 0.35 * fps], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                translate: interpolate(
                  frame,
                  [start, start + 0.6 * fps],
                  ["120px 0px", "0px 0px"],
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
                  width: 100,
                  height: 100,
                  borderRadius: 30,
                  backgroundColor: color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
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
                {formatCLP(value)}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "0 8px",
          opacity: interpolate(frame, [totalStart, totalStart + 0.4 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={{ fontSize: 46, color: "#9fb3b1" }}>Total en cuentas</span>
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
            interpolate(frame, [totalStart, totalStart + 1 * fps], [0, TOTAL], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.33, 1, 0.68, 1),
            }),
          )}
        </span>
      </div>
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
