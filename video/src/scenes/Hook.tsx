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
import { colors, fontFamily } from "../theme";

type HookProps = {
  readonly line1: string;
  readonly line2: string;
  readonly highlight: string;
  readonly style?: React.CSSProperties;
};

/** Escena 1: la pregunta que engancha. */
const HookInner: React.FC<HookProps> = ({ line1, line2, highlight, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = (start: number) => ({
    opacity: interpolate(frame, [start, start + 0.4 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    translate: interpolate(
      frame,
      [start, start + 0.6 * fps],
      ["0px 60px", "0px 0px"],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.darkBg,
        justifyContent: "center",
        padding: "0 100px",
        fontFamily,
        color: "white",
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -3,
        }}
      >
        <div style={appear(0.1 * fps)}>{line1}</div>
        <div style={appear(0.45 * fps)}>{line2}</div>
        <div style={{ ...appear(0.8 * fps), color: colors.brandGreen }}>
          {highlight}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const hookSchema = {
  line1: { type: "text-content", default: "", description: "Línea 1" },
  line2: { type: "text-content", default: "", description: "Línea 2" },
  highlight: {
    type: "text-content",
    default: "",
    description: "Línea destacada",
  },
} as const satisfies InteractivitySchema;

export const Hook = Interactive.withSchema({
  Component: HookInner,
  componentName: "<Hook>",
  schema: hookSchema,
  wrapInSequence: true,
});
