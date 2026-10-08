import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Misma tipografía que la app (Geist, variable 100–900), servida desde public/.
export const fontFamily = "Geist";
loadFont({
  family: fontFamily,
  url: staticFile("Geist-Variable.woff2"),
  weight: "100 900",
});

// Tokens tomados de src/styles/app.css de la app.
export const colors = {
  bg: "#ffffff",
  surface: "#f4f7f6",
  surface2: "#eaf0ee",
  border: "#e4eae8",
  text: "#0d1f22",
  text2: "#33484b",
  muted: "#5e7275",
  brand: "#0a5b6b",
  brandSoft: "#e5f6ee",
  brandGreen: "#4cd898",
  brandMid: "#2daa80",
  danger: "#b8341d",
  darkBg: "#0b1416",
  darkSurface: "#121e21",
  darkSurface2: "#1a2a2d",
};

export const brandGradient =
  "linear-gradient(135deg, #0a5b6b 0%, #127a78 55%, #2daa80 100%)";

/** Formato de pesos chilenos: 6500 → "$6.500". */
export const formatCLP = (value: number) =>
  "$" +
  Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
