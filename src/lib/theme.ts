export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const EVENT = "themechange";
const THEME_BG = { light: "#f2f4f6", dark: "#10151b" } as const; // = tokens background (light, dark)

const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getMode(): ThemeMode {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

export function effectiveTheme(): "light" | "dark" {
  const mode = getMode();
  if (mode !== "system") return mode;
  return systemQuery().matches ? "dark" : "light";
}

/** Keep the mobile browser chrome (address bar) matching the page. */
function syncThemeColor() {
  const bg = THEME_BG[effectiveTheme()];
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = bg));
}

export function setMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage blocked: the choice still applies for this page view */
  }
  syncThemeColor();
  window.dispatchEvent(new CustomEvent<ThemeMode>(EVENT, { detail: mode }));
}

/** Subscribe to theme changes (from any island, or the OS). Returns an unsubscribe function. */
export function onThemeChange(cb: (mode: ThemeMode) => void) {
  const handler = () => {
    syncThemeColor();
    cb(getMode());
  };
  const mq = systemQuery();
  window.addEventListener(EVENT, handler);
  mq.addEventListener("change", handler);
  syncThemeColor();
  return () => {
    window.removeEventListener(EVENT, handler);
    mq.removeEventListener("change", handler);
  };
}
