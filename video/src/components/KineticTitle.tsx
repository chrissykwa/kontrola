import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  readonly text: string;
  /** Segundo en que entra la primera palabra. */
  readonly delay?: number;
  /** Segundos entre palabra y palabra. */
  readonly stagger?: number;
  readonly fontSize?: number;
  readonly color?: string;
  /** Palabras (sin puntuación) que van en el color de acento. */
  readonly accentWords?: readonly string[];
  readonly accentColor?: string;
  readonly align?: "left" | "center";
};

/** Título que entra palabra por palabra con un rebote. Respeta los "\n". */
export const KineticTitle: React.FC<Props> = ({
  text,
  delay = 0.1,
  stagger = 0.07,
  fontSize = 96,
  color = "inherit",
  accentWords = [],
  accentColor = "#4cd898",
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let index = 0;

  return (
    <div
      style={{
        fontSize,
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: -fontSize * 0.03,
        color,
        textAlign: align,
      }}
    >
      {text.split("\n").map((line, li) => (
        <div
          key={li}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: `0 ${fontSize * 0.26}px`,
            justifyContent: align === "center" ? "center" : "flex-start",
          }}
        >
          {line.split(" ").map((word, wi) => {
            const start = (delay + index++ * stagger) * fps;
            const s = spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 160 } });
            const clean = word.replace(/[¿?¡!,.]/g, "");
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  color: accentWords.some((w) => w.toLowerCase() === clean.toLowerCase()) ? accentColor : undefined,
                  opacity: interpolate(frame, [start, start + 4], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  translate: `0px ${(1 - s) * fontSize * 0.9}px`,
                  rotate: `${(1 - s) * 10}deg`,
                  scale: String(0.6 + s * 0.4),
                  transformOrigin: "0% 100%",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
