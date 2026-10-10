import type React from "react";
import {
  AbsoluteFill,
  Img,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Burst, Shine } from "../components/Effects";
import { KineticTitle } from "../components/KineticTitle";
import { Sfx } from "../components/Sfx";
import { colors, fontFamily } from "../theme";

type CtaProps = {
  readonly headline: string;
  readonly button: string;
  readonly style?: React.CSSProperties;
};

/** Escena final: rayos girando, logo que rebota y botón que late. */
const CtaInner: React.FC<CtaProps> = ({ headline, button, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const logo = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
  const buttonIn = spring({ frame: frame - 1.2 * fps, fps, config: { damping: 9 } });
  const pulse = frame > 2 * fps ? 1 + Math.max(0, Math.sin((t - 2) * Math.PI * 1.6)) * 0.05 : 1;

  return (
    <AbsoluteFill style={{ fontFamily, color: "white", textAlign: "center", ...style }}>
      <Backdrop variant="brand" dots={false} />
      {/* Rayos que giran lentamente detrás del logo */}
      <AbsoluteFill
        style={{
          background:
            "repeating-conic-gradient(from 0deg at 50% 38%, rgba(255,255,255,0.07) 0deg 10deg, transparent 10deg 20deg)",
          rotate: `${t * 12}deg`,
          scale: "1.8",
          opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateRight: "clamp" }),
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 100px" }}>
        <div
          style={{
            position: "relative",
            width: 300,
            height: 300,
            borderRadius: 80,
            overflow: "hidden",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
            scale: String(logo),
            rotate: `${(1 - logo) * 30 + Math.sin(t * 2) * 2}deg`,
            translate: `0px ${Math.sin(t * 2.2) * 10}px`,
          }}
        >
          <Img src={staticFile("logo-mark.webp")} style={{ width: 210, height: 210 }} />
          <Shine at={0.9} duration={0.6} opacity={0.6} />
        </div>
        <div style={{ position: "relative" }}>
          <Burst x={0} y={-150} at={0.25} distance={420} count={18} colors={[colors.brandGreen, "white", "#eab308"]} />
        </div>
        <div style={{ marginTop: 56 }}>
          <KineticTitle text="Kontrola" fontSize={140} delay={0.3} align="center" />
        </div>
        <div style={{ marginTop: 24 }}>
          <KineticTitle text={headline} fontSize={64} delay={0.6} stagger={0.06} align="center" accentWords={["control"]} accentColor="#c9f5e0" />
        </div>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            marginTop: 90,
            padding: "40px 72px",
            borderRadius: 999,
            backgroundColor: "white",
            color: colors.brand,
            fontSize: 52,
            fontWeight: 700,
            opacity: buttonIn > 0.01 ? 1 : 0,
            scale: String(buttonIn * pulse),
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          {button}
          <Shine at={2.1} duration={0.7} opacity={0.8} />
        </div>
      </AbsoluteFill>
      {/* Sonido: golpe al llegar el logo, botón y brillo */}
      <Sfx name="impact" at={0.35} volume={0.55} />
      <Sfx name="pluck_002" at={1.2} volume={0.45} />
      <Sfx name="glass_002" at={2.1} volume={0.5} />
    </AbsoluteFill>
  );
};

const ctaSchema = {
  headline: { type: "text-content", default: "", description: "Frase" },
  button: { type: "text-content", default: "", description: "Botón" },
} as const satisfies InteractivitySchema;

export const Cta = Interactive.withSchema({
  Component: CtaInner,
  componentName: "<Cta>",
  schema: ctaSchema,
  wrapInSequence: true,
});
