import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'iphone-13', use: { ...devices['iPhone 13'] } }],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      // Mismo build pero bajo subruta, como en GitHub Pages de proyecto.
      command: 'BASE_PATH=/clarita/ npx vite build --outDir dist-subruta && npx vite preview --base /clarita/ --outDir dist-subruta --port 4174 --strictPort',
      url: 'http://localhost:4174/clarita/',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
