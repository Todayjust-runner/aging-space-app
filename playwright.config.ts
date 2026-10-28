import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:35173",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 35173 --strictPort",
      url: "http://127.0.0.1:35173",
      reuseExistingServer: false,
    },
    {
      command: "npm run preview -- --host 127.0.0.1 --port 35174 --strictPort",
      url: "http://127.0.0.1:35174",
      reuseExistingServer: false,
    },
  ],
});
