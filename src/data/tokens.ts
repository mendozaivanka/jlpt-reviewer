/**
 * Nordic Rose design tokens: the single source of truth for colour.
 *
 * `scripts/gen-tokens.ts` turns this file into `src/styles/tokens.css` before every
 * build, and the design-system page computes its contrast table from it, so the
 * CSS, the docs and the numbers can never disagree.
 *
 * Names follow shadcn/ui (background, foreground, card, muted, accent = hover tint…),
 * plus the brand colours: rosas (the pink ramp, primary), fjord (the cool second colour)
 * and three quiet tints (moss, sand, heather) for categories and status.
 */

export type Theme = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  /** Pastel pink: buttons, selection, the mark. Always carries dark text. */
  primary: string;
  primaryForeground: string;
  /** Deep rose: links, emphasis, strong text accents. */
  primaryStrong: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  /** Hover / selected tint for menus and list items. */
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  /** Pink ramp, light to deep: sequential maps and charts. */
  rosas1: string;
  rosas2: string;
  rosas3: string;
  rosas4: string;
  rosas5: string;
  /** Fjord: the cool second colour as a surface tint. */
  fjord: string;
  /** Fjord that passes as text: secondary links, chart annotations, "info". */
  fjordInk: string;
  /** Quiet category tints (badges, chips, chart categories), always with foreground text. */
  moss: string;
  sand: string;
  heather: string;
};

export const light: Theme = {
  background: "#f2f4f6",
  foreground: "#18202b",
  card: "#ffffff",
  cardForeground: "#18202b",
  popover: "#ffffff",
  popoverForeground: "#18202b",
  primary: "#f4b3c6",
  primaryForeground: "#3b1626",
  primaryStrong: "#8f3a5c",
  secondary: "#e7ebef",
  secondaryForeground: "#18202b",
  muted: "#e9edf1",
  mutedForeground: "#525c68",
  accent: "#fbeef2",
  accentForeground: "#18202b",
  destructive: "#b3261e",
  border: "#dde2e8",
  input: "#7d8896",
  ring: "#b8577d",
  rosas1: "#fbeef2",
  rosas2: "#f3cbd7",
  rosas3: "#e39cb3",
  rosas4: "#c86a8c",
  rosas5: "#8f3a5c",
  fjord: "#dce6ee",
  fjordInk: "#3f6178",
  moss: "#dcebe0",
  sand: "#f1e7d4",
  heather: "#e6e1f1",
};

export const dark: Theme = {
  background: "#10151b",
  foreground: "#e9eef3",
  card: "#18202a",
  cardForeground: "#e9eef3",
  popover: "#18202a",
  popoverForeground: "#e9eef3",
  primary: "#f4b3c6",
  primaryForeground: "#2a0f1a",
  primaryStrong: "#f6bfd1",
  secondary: "#222c38",
  secondaryForeground: "#e9eef3",
  muted: "#1d2631",
  mutedForeground: "#9aa5b2",
  accent: "#2c2029",
  accentForeground: "#e9eef3",
  destructive: "#f28b82",
  border: "#28323e",
  input: "#6c7887",
  ring: "#f4b3c6",
  rosas1: "#2a1a21",
  rosas2: "#4d2a3a",
  rosas3: "#7c4560",
  rosas4: "#b9708f",
  rosas5: "#f4b3c6",
  fjord: "#22313f",
  fjordInk: "#9cc0d8",
  moss: "#20382b",
  sand: "#3b3222",
  heather: "#2e2840",
};

/** Overrides applied on top of each theme for `prefers-contrast: more` / data-contrast="high". */
export const highContrast: { light: Partial<Theme>; dark: Partial<Theme> } = {
  light: {
    foreground: "#0b1118",
    mutedForeground: "#36404b",
    primaryStrong: "#6e2443",
    border: "#8c97a4",
    input: "#56616e",
    ring: "#6e2443",
    fjordInk: "#294457",
  },
  dark: {
    foreground: "#ffffff",
    mutedForeground: "#d0d8e1",
    primaryStrong: "#ffd2e0",
    border: "#6a7686",
    input: "#9aa6b4",
    ring: "#ffd2e0",
    fjordInk: "#c4dcec",
  },
};

export const themes = {
  light,
  dark,
  "light-hc": { ...light, ...highContrast.light },
  "dark-hc": { ...dark, ...highContrast.dark },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;
