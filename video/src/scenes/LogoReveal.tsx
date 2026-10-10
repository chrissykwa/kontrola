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
import { colors, fontFamily } from "../theme";

type LogoRevealProps = {
  readonly brand: string;
  readonly tagline: string;
  readonly style?: React.CSSProperties;
};

const RINGS = [colors.brand, colors.brandMid, colors.brandGreen];

/** Escena 2: anillos que se expanden, el logo entra girando y el nombre letra a letra. */
const LogoRevealInner: React.FC<LogoRevealProps> = ({ brand, tagline, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 9, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ fontFamily, color: colors.text, ...style }}>
      <Backdrop variant="light" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {RINGS.map((color, i) => {
          const start = 0.15 * fps + i * 0.12 * fps;
          const p = interpolate(frame, [start, start + 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 400,
                height: 400,
                marginTop: -260,
                borderRadius: "50%",
                border: `${16 - i * 4}px solid ${color}`,
                scale: String(0.4 + p * 2.6),
                opacity: p === 0 ? 0 : 1 - p,
              }}
            />
          );
        })}
        <Img
          src={staticFile("logo-mark.webp")}
          style={{
            width: 340,
            height: 340,
            scale: String(logo),
            rotate: `${(1 - logo) * -90}deg`,
          }}
        />
        <div style={{ marginTop: 48, display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -5 }}>
          {brand.split("").map((ch, i) => {
            const s = spring({ frame: frame - (0.4 * fps + i * 2), fps, config: { damping: 10 } });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: s > 0 ? 1 : 0,
                  translate: `0px ${(1 - s) * 120}px`,
                  scale: String(0.5 + s * 0.5),
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 52,
            fontWeight: 500,
            color: colors.muted,
            opacity: interpolate(frame, [0.9 * fps, 1.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            letterSpacing: interpolate(frame, [0.9 * fps, 1.6 * fps], [14, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {tagline}
        </div>
      </AbsoluteFill>
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
