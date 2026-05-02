import { defineConfig, devices } from "@playwright/test";

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 26135);
const API_PORT = Number(process.env.E2E_API_PORT ?? 8080);

const BASE_URL =
  process.env.E2E_BASE_URL ?? `http://127.0.0.1:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "tests/e2e-report",
        open: "never",
      },
    ],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    /* Record every test as a WebM video — saved under tests/e2e-videos/ */
    video: {
      mode: "on",
      size: { width: 1280, height: 800 },
    },
    /* Also capture a screenshot on failure for easier debugging */
    screenshot: "only-on-failure",
    /* Slow down actions slightly so the recording is easier to follow */
    launchOptions: {
      slowMo: 120,
    },
  },
  outputDir: "tests/e2e-results",

  /* Reuse the already-running dev servers when available */
  webServer: [
    {
      command: "pnpm run dev",
      cwd: ".",
      port: FRONTEND_PORT,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { PORT: String(FRONTEND_PORT) },
    },
    {
      command: "pnpm --filter @workspace/api-server run dev",
      cwd: "../..",
      port: API_PORT,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { PORT: String(API_PORT) },
    },
  ],

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
