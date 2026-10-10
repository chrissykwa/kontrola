import {
  Bus,
  Coffee,
  CreditCard,
  Fuel,
  Pizza,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Ticket,
} from "lucide-react";
import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Backdrop } from "../components/Backdrop";
import { KineticTitle } from "../components/KineticTitle";
import { Sfx } from "../components/Sfx";
import { fontFamily } from "../theme";

type HookProps = {
  readonly question: string;
  readonly highlight: string;
  readonly style?: React.CSSProperties;
};

// Gastos que vuelan por la pantalla (x en px, fase y velocidad para variar el recorrido).
const FLYING = [
  { Icon: Coffee, color: "#f97316", x: 140, phase: 0.1, speed: 1.0 },
  { Icon: Bus, color: "#3b82f6", x: 860, phase: 0.55, speed: 0.8 },
  { Icon: ShoppingCart, color: "#10b981", x: 420, phase: 0.8, speed: 1.15 },
  { Icon: Pizza, color: "#ef4444", x: 700, phase: 0.25, speed: 0.95 },
  { Icon: Smartphone, color: "#8b5cf6", x: 240, phase: 0.45, speed: 0.85 },
  { Icon: Fuel, color: "#eab308", x: 960, phase: 0.05, speed: 1.1 },
  { Icon: Shirt, color: "#ec4899", x: 560, phase: 0.65, speed: 0.9 },
  { Icon: Ticket, color: "#06b6d4", x: 80, phase: 0.9, speed: 1.05 },
  { Icon: Receipt, color: "#a3a3a3", x: 780, phase: 0.7, speed: 1.2 },
  { Icon: CreditCard, color: "#5b3fc4", x: 330, phase: 0.15, speed: 0.75 },
];

/** Escena 1: la pregunta, con gastos volando por todos lados. */
const HookInner: React.FC<HookProps> = ({ question, highlight, style }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;

  // Al final, los íconos se van hacia afuera y la pregunta da un golpe.
  const scatter = interpolate(frame, [2.2 * fps, 2.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily, color: "white", ...style }}>
      <Backdrop variant="dark" />
      {FLYING.map(({ Icon, color, x, phase, speed }, i) => {
        // Suben desde abajo en bucle, girando un poco.
        const cycle = (t * 0.45 * speed + phase) % 1;
        const y = height + 200 - cycle * (height + 400);
        const size = 150 + (i % 3) * 30;
        const awayX = (x - 540) * scatter * 1.6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y,
              width: size,
              height: size,
              borderRadius: size * 0.3,
              backgroundColor: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.85 * (1 - scatter),
              rotate: `${Math.sin(t * 2 + i) * 18}deg`,
              translate: `${awayX}px 0px`,
              filter: i % 3 === 0 ? "blur(3px)" : undefined,
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            }}
          >
            <Icon size={size * 0.5} color="white" strokeWidth={2.2} />
          </div>
        );
      })}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          padding: "0 90px",
          scale: String(
            interpolate(frame, [2.2 * fps, 2.4 * fps, 2.7 * fps], [1, 1.08, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          ),
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(11,20,22,0.55)",
            borderRadius: 60,
            padding: "60px 56px",
          }}
        >
          <KineticTitle
            text={`${question}\n${highlight}`}
            fontSize={124}
            stagger={0.12}
            accentWords={highlight.replace(/[¿?¡!,.]/g, "").split(" ")}
          />
        </div>
      </AbsoluteFill>
      {/* Sonido */}
      <Sfx name="pluck_001" at={0.1} volume={0.5} />
      <Sfx name="pluck_001" at={0.46} volume={0.5} />
      <Sfx name="glass_002" at={0.82} volume={0.6} />
      <Sfx name="whoosh-2" at={2.15} volume={0.35} />
    </AbsoluteFill>
  );
};

const hookSchema = {
  question: { type: "text-content", default: "", description: "Pregunta" },
  highlight: { type: "text-content", default: "", description: "Final destacado" },
} as const satisfies InteractivitySchema;

export const Hook = Interactive.withSchema({
  Component: HookInner,
  componentName: "<Hook>",
  schema: hookSchema,
  wrapInSequence: true,
});
