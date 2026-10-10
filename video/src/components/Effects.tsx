import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Toque de dedo: un punto y una onda que se expande, en (x, y) del contenedor. */
export const TapRipple: React.FC<{ x: number; y: number; at: number; color?: string }> = ({
  x,
  y,
  at,
  color = "rgba(13,31,34,0.35)",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = at * fps;
  const p = interpolate(frame, [start, start + 0.45 * fps], [0, 1], clamp);
  if (frame < start - 0.25 * fps || p >= 1) return null;
  const pressing = frame < start;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 45,
          top: y - 45,
          width: 90,
          height: 90,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: pressing ? interpolate(frame, [start - 0.25 * fps, start], [0, 1], clamp) : 1 - p,
          scale: pressing ? "1" : String(1 - p * 0.3),
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 45,
          top: y - 45,
          width: 90,
          height: 90,
          borderRadius: "50%",
          border: `6px solid ${color}`,
          opacity: pressing ? 0 : 1 - p,
          scale: String(1 + p * 2.2),
          pointerEvents: "none",
        }}
      />
    </>
  );
};

/** Explosión de partículas radiales en (x, y), en el segundo `at`. */
export const Burst: React.FC<{
  x: number;
  y: number;
  at: number;
  colors: readonly string[];
  count?: number;
  distance?: number;
}> = ({ x, y, at, colors, count = 14, distance = 260 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = at * fps;
  const p = interpolate(frame, [start, start + 0.7 * fps], [0, 1], {
    ...clamp,
    easing: (v) => 1 - Math.pow(1 - v, 3),
  });
  if (frame < start || p >= 1) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.2;
        const d = distance * (i % 3 === 0 ? 1.15 : 0.85) * p;
        const size = i % 2 === 0 ? 22 : 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(angle) * d - size / 2,
              top: y + Math.sin(angle) * d - size / 2,
              width: size,
              height: size,
              borderRadius: i % 3 === 0 ? 4 : "50%",
              backgroundColor: colors[i % colors.length],
              opacity: 1 - p,
              rotate: `${p * 180}deg`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

/** Brillo diagonal que cruza el contenedor (el padre debe tener overflow hidden). */
export const Shine: React.FC<{ at: number; duration?: number; opacity?: number }> = ({
  at,
  duration = 0.7,
  opacity = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [at * fps, (at + duration) * fps], [-0.6, 1.6], clamp);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(105deg, transparent ${p * 100 - 20}%, rgba(255,255,255,${opacity}) ${p * 100}%, transparent ${p * 100 + 20}%)`,
        pointerEvents: "none",
      }}
    />
  );
};
