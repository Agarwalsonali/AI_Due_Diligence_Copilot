import { TEST_CREDENTIALS } from "../../support/mock-api";

describe("Authentication — login", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.visitApp("/login");
  });

  it("renders the sign-in form", () => {
    cy.contains("Sign in to your due diligence workspace");
    cy.get("#email").should("be.visible");
    cy.get("#password").should("be.visible");
    cy.contains("button", "Sign In").should("be.enabled");
  });

  it("signs in with valid credentials and lands on the dashboard", () => {
    cy.get("#email").type(TEST_CREDENTIALS.email);
    cy.get("#password").type(TEST_CREDENTIALS.password);
    cy.contains("button", "Sign In").click();

    cy.location("pathname").should("eq", "/dashboard");
    cy.contains("Welcome back, Test User");
    cy.contains("Logged in successfully");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("access_token")).to.be.a("string").and.not
        .be.empty;
    });
  });

  it("shows the API error for invalid credentials", () => {
    cy.get("#email").type(TEST_CREDENTIALS.email);
    cy.get("#password").type("wrong-password");
    cy.contains("button", "Sign In").click();

    cy.contains("Invalid email or password");
    cy.contains("Login failed");
    cy.location("pathname").should("eq", "/login");
  });

  it("does not submit an empty form", () => {
    cy.contains("button", "Sign In").click();

    cy.location("pathname").should("eq", "/login");
    cy.get("#email").then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
  });

  it("toggles password visibility", () => {
    cy.get("#password").should("have.attr", "type", "password");
    cy.get('button[aria-label="Show password"]').click();
    cy.get("#password").should("have.attr", "type", "text");
    cy.get('button[aria-label="Hide password"]').click();
    cy.get("#password").should("have.attr", "type", "password");
  });

  it("navigates to the registration page", () => {
    cy.contains("a", "Register").click();
    cy.location("pathname").should("eq", "/register");
  });
});

describe("Authentication — login feedback", () => {
  it("shows the pending state while signing in", () => {
    cy.mockApi({ delay: 1500 });
    cy.visitApp("/login");
    cy.get("#email").type(TEST_CREDENTIALS.email);
    cy.get("#password").type(TEST_CREDENTIALS.password);
    cy.contains("button", "Sign In").click();

    cy.contains("button", "Signing in...").should("be.disabled");
  });
});
