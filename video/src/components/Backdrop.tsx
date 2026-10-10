import type React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../theme";

type Variant = "dark" | "light" | "brand" | "soft";

const BASE: Record<Variant, string> = {
  dark: colors.darkBg,
  light: colors.bg,
  brand: "linear-gradient(160deg, #0a5b6b 0%, #127a78 55%, #2daa80 100%)",
  soft: colors.surface,
};

// Manchas de color que se desplazan lentamente (posición en %, tamaño en px).
const BLOBS: Record<Variant, { color: string; x: number; y: number; size: number; speed: number }[]> = {
  dark: [
    { color: "#0a5b6b", x: 10, y: 15, size: 900, speed: 0.6 },
    { color: "#2daa80", x: 85, y: 70, size: 800, speed: 0.45 },
    { color: "#5b3fc4", x: 30, y: 95, size: 600, speed: 0.7 },
  ],
  light: [
    { color: "#e5f6ee", x: 90, y: 10, size: 900, speed: 0.5 },
    { color: "#d6eef0", x: 5, y: 80, size: 800, speed: 0.6 },
  ],
  brand: [
    { color: "#4cd898", x: 90, y: 90, size: 900, speed: 0.55 },
    { color: "#0d1f22", x: 0, y: 0, size: 800, speed: 0.4 },
  ],
  soft: [
    { color: "#e7defc", x: 90, y: 20, size: 800, speed: 0.5 },
    { color: "#dcefe7", x: 10, y: 85, size: 800, speed: 0.6 },
  ],
};

/** Fondo animado: color base, manchas difuminadas que flotan y una trama de puntos. */
export const Backdrop: React.FC<{ variant: Variant; dots?: boolean }> = ({
  variant,
  dots = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dotColor =
    variant === "dark" || variant === "brand"
      ? "rgba(255,255,255,0.07)"
      : "rgba(13,31,34,0.06)";

  return (
    <AbsoluteFill style={{ background: BASE[variant], overflow: "hidden" }}>
      {BLOBS[variant].map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.size,
            height: b.size,
            marginLeft: -b.size / 2,
            marginTop: -b.size / 2,
            borderRadius: "50%",
            backgroundColor: b.color,
            opacity: variant === "dark" ? 0.55 : 0.7,
            filter: "blur(140px)",
            translate: `${Math.sin(t * b.speed + i) * 120}px ${Math.cos(t * b.speed * 0.8 + i) * 160}px`,
          }}
        />
      ))}
      {dots ? (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(${dotColor} 3px, transparent 3px)`,
            backgroundSize: "48px 48px",
            backgroundPosition: `0px ${-t * 12}px`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
