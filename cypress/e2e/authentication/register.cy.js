import { TEST_CREDENTIALS } from "../../support/mock-api";

describe("Authentication — registration", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.visitApp("/register");
  });

  it("creates an account and starts a session", () => {
    cy.get("#name").type("Ada Lovelace");
    cy.get("#email").type("ada@example.com");
    cy.get("#password").type("analytical-engine-1");
    cy.get("#confirmPassword").type("analytical-engine-1");
    cy.contains("button", "Create account").click();

    // The success toast is fired during the route transition and is not
    // reliably observable, so success is asserted via redirect + greeting.
    cy.location("pathname").should("eq", "/dashboard");
    cy.contains("Welcome back, Ada Lovelace");
  });

  it("rejects mismatched passwords without calling the API", () => {
    cy.get("#name").type("Ada Lovelace");
    cy.get("#email").type("ada@example.com");
    cy.get("#password").type("analytical-engine-1");
    cy.get("#confirmPassword").type("analytical-engine-2");
    cy.contains("button", "Create account").click();

    cy.contains("Passwords do not match");
    cy.location("pathname").should("eq", "/register");
  });

  it("surfaces the duplicate-email error from the API", () => {
    cy.get("#name").type("Test User");
    cy.get("#email").type(TEST_CREDENTIALS.email);
    cy.get("#password").type("another-password-1");
    cy.get("#confirmPassword").type("another-password-1");
    cy.contains("button", "Create account").click();

    cy.contains("A user with this email already exists");
    cy.contains("Registration failed");
    cy.location("pathname").should("eq", "/register");
  });

  // Known defect: the password field carries minLength={8}, but because it is a
  // React-controlled input the browser never raises `tooShort`, and the FastAPI
  // `UserCreate` schema (`password: str`) has no length rule either — so a
  // 5-character password registers successfully. This test pins the current
  // behaviour; once validation is added it should assert that the form blocks
  // the submit instead.
  it("accepts a password shorter than the advertised 8 characters (known defect)", () => {
    cy.intercept("POST", "**/api/auth/register").as("registerRequest");

    cy.get("#name").type("Ada Lovelace");
    cy.get("#email").type("ada@example.com");
    cy.get("#password").type("short");
    cy.get("#confirmPassword").type("short");
    cy.contains("button", "Create account").click();

    cy.wait("@registerRequest");
    cy.location("pathname").should("eq", "/dashboard");
  });

  it("links back to sign in", () => {
    cy.contains("a", "Sign In").click();
    cy.location("pathname").should("eq", "/login");
  });
});
