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

    cy.location("pathname").should("eq", "/dashboard");
    cy.contains("Welcome back, Ada Lovelace");
    cy.contains("Account created successfully");
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

  it("enforces the 8-character password minimum", () => {
    cy.get("#password").type("short");
    cy.get("#password").then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
  });

  it("links back to sign in", () => {
    cy.contains("a", "Sign In").click();
    cy.location("pathname").should("eq", "/login");
  });
});
