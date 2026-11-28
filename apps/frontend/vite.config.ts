/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { checker } from "vite-plugin-checker"
import svgr from "vite-plugin-svgr"

const DEV_PORT = 3050

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  // index.html's og:image needs an absolute URL (#475). An older .env without it gets the dev
  // server's own origin; Vite reads process.env after this file, so %VITE_PUBLIC_URL% is set.
  if (!env.VITE_PUBLIC_URL) {
    process.env.VITE_PUBLIC_URL = `http://localhost:${DEV_PORT}`
  }

  return {
    plugins: [
      TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      svgr(),
      checker({
        typescript: true,
        eslint: {
          useFlatConfig: true,
          lintCommand: 'eslint "./src/**/*.{ts,tsx,js,cjs,mjs}"',
        },
        overlay: { initialIsOpen: false },
      }),
    ],
    // Vite 8 resolves tsconfig `paths` (the `@/` alias) natively.
    resolve: { tsconfigPaths: true },
    server: {
      port: DEV_PORT,
      // Fail loudly instead of silently moving to 3001, which the backend's
      // CORS allow-list would then reject with an opaque browser error.
      strictPort: true,
      allowedHosts: env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(",") : [],
    },
    build: { outDir: "build" },
  }
})
