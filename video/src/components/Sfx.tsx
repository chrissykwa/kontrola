import { Audio } from "@remotion/media";
import type React from "react";
import { staticFile, useVideoConfig } from "remotion";

export type SfxName =
  | "whoosh-1"
  | "whoosh-2"
  | "whip"
  | "swoosh-low"
  | "impact"
  | "riser"
  | "click_002"
  | "tick_001"
  | "select_003"
  | "confirmation_002"
  | "pluck_001"
  | "pluck_002"
  | "maximize_003"
  | "drop_002"
  | "glass_002"
  | "chips-stack-2"
  | "chips-collide-1"
  | "card-slide-1"
  | "card-place-1";

/** Efecto de sonido (public/audio/sfx) que suena en el segundo `at` de la escena. */
export const Sfx: React.FC<{ name: SfxName; at: number; volume?: number }> = ({
  name,
  at,
  volume = 0.6,
}) => {
  const { fps } = useVideoConfig();
  return (
    <Audio
      name={`SFX ${name}`}
      src={staticFile(`audio/sfx/${name}.ogg`)}
      from={Math.max(0, Math.round(at * fps))}
      premountFor={fps}
      volume={volume}
    />
  );
};
