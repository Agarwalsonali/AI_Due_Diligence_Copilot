// Loaded automatically before every spec file.
import "./commands";

/**
 * The app uses Radix primitives (dialogs, selects, tabs) which trigger the
 * browser's "ResizeObserver loop completed with undelivered notifications"
 * warning. It is a browser scheduling warning, not an application error, but
 * Cypress reports it as an uncaught exception and fails the running test.
 * Ignore exactly that message; every other uncaught error still fails.
 */
Cypress.on("uncaught:exception", (err) => {
  if (
    err &&
    typeof err.message === "string" &&
    err.message.includes("ResizeObserver loop")
  ) {
    return false;
  }
  return true;
});
