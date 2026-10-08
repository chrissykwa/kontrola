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
import { colors, fontFamily } from "../theme";

type LogoRevealProps = {
  readonly brand: string;
  readonly tagline: string;
  readonly style?: React.CSSProperties;
};

/** Escena 2: aparece el logo y el nombre. */
const LogoRevealInner: React.FC<LogoRevealProps> = ({
  brand,
  tagline,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        color: colors.text,
        ...style,
      }}
    >
      <Img
        src={staticFile("logo-mark.webp")}
        style={{
          width: 340,
          height: 340,
          scale: interpolate(frame, [0, 0.8 * fps], [0.4, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
          opacity: interpolate(frame, [0, 0.25 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          marginTop: 48,
          fontSize: 150,
          fontWeight: 800,
          letterSpacing: -5,
          opacity: interpolate(frame, [0.35 * fps, 0.7 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(
            frame,
            [0.35 * fps, 0.9 * fps],
            ["0px 40px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        {brand}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 52,
          fontWeight: 500,
          color: colors.muted,
          opacity: interpolate(frame, [0.6 * fps, 1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {tagline}
      </div>
    </AbsoluteFill>
  );
};

const logoRevealSchema = {
  brand: { type: "text-content", default: "", description: "Nombre" },
  tagline: { type: "text-content", default: "", description: "Bajada" },
} as const satisfies InteractivitySchema;

export const LogoReveal = Interactive.withSchema({
  Component: LogoRevealInner,
  componentName: "<LogoReveal>",
  schema: logoRevealSchema,
  wrapInSequence: true,
});
