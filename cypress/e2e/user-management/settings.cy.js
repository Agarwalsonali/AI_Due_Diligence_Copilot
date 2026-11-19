describe("Settings", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/settings");
  });

  it("shows the signed-in profile", () => {
    cy.contains("Profile");
    cy.contains("Test User");
    cy.contains("test@freebuff.com");
    cy.contains("Research Analyst");
    cy.contains("Standard");
  });

  it("switches the theme from settings", () => {
    cy.get("html").should("have.class", "dark");

    cy.contains("button", /Switch to Light/).click();

    cy.get("html").should("have.class", "light");
    cy.contains("Current: Light Mode");
  });

  it("shows the application versions", () => {
    cy.contains("Application");
    cy.contains("FastAPI");
    cy.contains("Qdrant");
  });

  it("signs out from the account card", () => {
    cy.contains("button", "Sign Out").click();

    cy.location("pathname").should("eq", "/login");
  });
});
