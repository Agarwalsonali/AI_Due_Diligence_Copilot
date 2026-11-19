import { createBackend, TEST_CREDENTIALS } from "./mock-api";

/**
 * Install the stubbed backend for the current test.
 *
 *   cy.mockApi()                       seeded from cypress/fixtures/seed.json
 *   cy.mockApi({ delay: 800 })         slow responses, for loading states
 *   cy.mockApi({ failures: [...] })    injected error responses
 *   cy.mockApi({ seed: { companies: [] } })
 */
Cypress.Commands.add("mockApi", (options = {}) => {
  const apiUrl = Cypress.expose("apiUrl");

  return cy.fixture("seed").then((seed) => {
    const backend = createBackend({
      ...options,
      seed: { ...seed, ...(options.seed || {}) },
    });

    // Preflight, in case the browser sends one for cross-origin API calls.
    cy.intercept("OPTIONS", `${apiUrl}/api/**`, (req) =>
      req.reply({
        statusCode: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods":
            "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        },
      })
    );

    cy.intercept(`${apiUrl}/api/**`, (req) => backend.handle(req));
    cy.wrap(backend, { log: false }).as("backend");
  });
});

/**
 * Visit a route and wait until the client-rendered DOM has quiesced.
 *
 * The app's ThemeProvider renders its children without a provider until an
 * effect flips `mounted`, which remounts the whole subtree right after
 * hydration. Interacting with the first paint therefore targets nodes React
 * has already replaced. Instead of a fixed sleep, wait until the page anchor
 * has been the same DOM node across consecutive frames.
 */
Cypress.Commands.add("visitApp", (path, options = {}) => {
  cy.visit(path, options);
  cy.window().then((win) => {
    const selector = options.anchor || 'main, form, h1, [role="dialog"]';
    return new Promise((resolve) => {
      const started = win.performance.now();
      const quietMs = 250;
      let previous = null;
      let stableSince = started;

      const tick = () => {
        const node = win.document.querySelector(selector);
        const now = win.performance.now();
        if (node && node === previous) {
          if (now - stableSince >= quietMs) return resolve();
        } else {
          previous = node;
          stableSince = now;
        }
        if (now - started > 5000) return resolve();
        win.requestAnimationFrame(tick);
      };

      win.requestAnimationFrame(tick);
    });
  });
});

/** Sign in through the real login form and wait for the dashboard. */
Cypress.Commands.add("login", (credentials) => {
  const { email, password } = credentials || TEST_CREDENTIALS;
  cy.visitApp("/login");
  cy.get("#email").type(email);
  cy.get("#password").type(password);
  cy.contains("button", "Sign In").click();
  cy.location("pathname").should("eq", "/dashboard");
  cy.contains("Welcome back,");
});

/** Put a token in storage before the app boots (session persistence tests). */
Cypress.Commands.add("visitWithToken", (path, token) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("access_token", token);
    },
  });
});

/** Pick an option from a Radix <Select> by visible label. */
Cypress.Commands.add("selectOption", (trigger, optionLabel) => {
  cy.get(trigger).click();
  cy.get('[role="option"]').contains(optionLabel).click();
});
