const { defineConfig } = require("cypress");

/**
 * The application is a Next.js 14 frontend (frontend/, dev server on :3000)
 * talking to a FastAPI backend on :8000 (frontend/.env.local -> NEXT_PUBLIC_API_URL).
 *
 * `baseUrl` therefore points at the frontend; the API origin is exposed as
 * Cypress env `apiUrl` because the specs stub it (see cypress/support/mock-api.js).
 */
module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    fixturesFolder: "cypress/fixtures",
    viewportWidth: 1280,
    viewportHeight: 800,
    // Next.js compiles routes on first request in dev, which can take a while.
    defaultCommandTimeout: 20000,
    pageLoadTimeout: 60000,
    requestTimeout: 20000,
    responseTimeout: 30000,
    video: false,
    screenshotOnRunFailure: true,
    // Cypress 16 replaced the `env`/`Cypress.env()` API with public "expose"
    // variables read through Cypress.expose().
    expose: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
