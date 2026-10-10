import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import type React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ---------- Zoom a través: la escena saliente se acerca y se desenfoca ---------- */

type ZoomProps = Record<string, never>;

const ZoomThrough: React.FC<TransitionPresentationComponentProps<ZoomProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
}) => {
  const entering = presentationDirection === "entering";
  const style: React.CSSProperties = entering
    ? {
        opacity: interpolate(p, [0.35, 0.75], [0, 1], clamp),
        scale: String(interpolate(p, [0.35, 1], [0.8, 1], { ...clamp, easing: Easing.out(Easing.cubic) })),
        filter: `blur(${interpolate(p, [0.35, 1], [24, 0], clamp)}px)`,
      }
    : {
        opacity: interpolate(p, [0.3, 0.7], [1, 0], clamp),
        scale: String(interpolate(p, [0, 0.7], [1, 1.6], { ...clamp, easing: Easing.in(Easing.cubic) })),
        filter: `blur(${interpolate(p, [0, 0.7], [0, 30], clamp)}px)`,
      };
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const zoomThrough = (): TransitionPresentation<ZoomProps> => ({
  component: ZoomThrough,
  props: {},
});

/* ---------- Paneo rápido con desenfoque de movimiento ---------- */

type WhipProps = { direction: "left" | "up" };

const Whip: React.FC<TransitionPresentationComponentProps<WhipProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const p = Easing.inOut(Easing.cubic)(presentationProgress);
  const entering = presentationDirection === "entering";
  const offset = entering ? (1 - p) * 100 : -p * 100;
  const blur = Math.sin(presentationProgress * Math.PI) * 40;
  const horizontal = passedProps.direction === "left";
  return (
    <AbsoluteFill
      style={{
        translate: horizontal ? `${offset}% 0%` : `0% ${offset}%`,
        filter: `blur(${blur}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const whip = (direction: WhipProps["direction"] = "left"): TransitionPresentation<WhipProps> => ({
  component: Whip,
  props: { direction },
});

/* ---------- Barrido de color: un panel diagonal tapa y destapa ---------- */

type SweepProps = { color: string; accent: string };

const ColorSweep: React.FC<TransitionPresentationComponentProps<SweepProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  if (presentationDirection === "exiting") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  // El panel entra hasta cubrir todo (0 → 0.5) y sigue de largo (0.5 → 1).
  const x = interpolate(p, [0, 0.5, 1], [-160, 0, 160], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const accentX = interpolate(p, [0, 0.5, 1], [-190, -10, 140], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const panel: React.CSSProperties = {
    position: "absolute",
    top: "-20%",
    height: "140%",
    width: "160%",
    left: "-30%",
    rotate: "-12deg",
  };
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: p >= 0.5 ? 1 : 0 }}>{children}</AbsoluteFill>
      <div style={{ ...panel, background: passedProps.accent, translate: `${accentX}% 0%` }} />
      <div style={{ ...panel, background: passedProps.color, translate: `${x}% 0%` }} />
    </AbsoluteFill>
  );
};

export const colorSweep = (color: string, accent: string): TransitionPresentation<SweepProps> => ({
  component: ColorSweep,
  props: { color, accent },
});
