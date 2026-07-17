import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 35_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:3017",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3017",
    url: "http://127.0.0.1:3017/demo",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
