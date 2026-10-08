import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { brandGradient, colors, fontFamily } from "../theme";

type CtaProps = {
  readonly headline: string;
  readonly button: string;
  readonly style?: React.CSSProperties;
};

/** Escena 6: cierre con logo y llamada a la acción. */
const CtaInner: React.FC<CtaProps> = ({ headline, button, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: brandGradient,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 100px",
        fontFamily,
        color: "white",
        textAlign: "center",
        ...style,
      }}
    >
      <div
        style={{
          width: 300,
          height: 300,
          borderRadius: 80,
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          scale: interpolate(frame, [0, 0.7 * fps], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <Img
          src={staticFile("logo-mark.webp")}
          style={{ width: 210, height: 210 }}
        />
      </div>
      <div
        style={{
          marginTop: 56,
          fontSize: 140,
          fontWeight: 800,
          letterSpacing: -5,
        }}
      >
        Kontrola
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 64,
          fontWeight: 600,
          lineHeight: 1.15,
          whiteSpace: "pre-line",
          opacity: interpolate(frame, [0.4 * fps, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {headline}
      </div>
      <div
        style={{
          marginTop: 90,
          padding: "40px 72px",
          borderRadius: 999,
          backgroundColor: "white",
          color: colors.brand,
          fontSize: 52,
          fontWeight: 700,
          opacity: interpolate(frame, [0.8 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(
            frame,
            [0.8 * fps, 1.3 * fps, 2 * fps, 2.3 * fps, 2.6 * fps],
            [0.8, 1, 1, 1.05, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        {button}
      </div>
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
