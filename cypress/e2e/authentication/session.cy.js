describe("Authentication — sessions and protected routes", () => {
  it("redirects unauthenticated visitors away from a protected route", () => {
    cy.mockApi();
    cy.visitApp("/companies");

    cy.location("pathname").should("eq", "/login");
  });

  it("keeps the session across a page reload", () => {
    cy.mockApi();
    cy.login();

    cy.reload();

    cy.location("pathname").should("eq", "/dashboard");
    cy.contains("Welcome back, Test User");
  });

  it("reuses a stored token on a direct visit", () => {
    cy.mockApi();
    cy.get("@backend").then((backend) => {
      cy.visitWithToken("/reports", backend.token);
    });

    cy.location("pathname").should("eq", "/reports");
    cy.contains("Report History");
  });

  it("clears the session when logging out from the sidebar", () => {
    cy.mockApi();
    cy.login();

    cy.get('button[title="Logout"]').click();

    cy.location("pathname").should("eq", "/login");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("access_token")).to.be.null;
    });
  });

  it("sends a stale token back to the login screen", () => {
    cy.mockApi();
    cy.visitWithToken("/dashboard", "stale-token");

    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
  });
});
