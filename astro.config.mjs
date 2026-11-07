// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project site: https://mendozaivanka.github.io/jlpt-reviewer/
export default defineConfig({
  site: process.env.SITE_URL || "https://mendozaivanka.github.io",
  base: "/jlpt-reviewer/",
  output: "static",
  trailingSlash: "always",
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
