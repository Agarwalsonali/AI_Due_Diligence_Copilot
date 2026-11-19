describe("Dashboard", () => {
  it("summarises companies, documents and processed files", () => {
    cy.mockApi();
    cy.login();

    cy.get('[data-cy="stat-companies"]').should("have.text", "5");
    cy.get('[data-cy="stat-documents"]').should("have.text", "4");
    // Three of the four seeded documents finished processing.
    cy.get('[data-cy="stat-processed"]').should("have.text", "3");
  });

  it("lists recent companies with their industry", () => {
    cy.mockApi();
    cy.login();

    cy.contains("Recent Companies");
    cy.get('a[href="/companies/1"]').contains("Acme Corp");
    cy.get('a[href="/companies/1"]').contains("Technology");
  });

  it("lists recent documents with a status badge", () => {
    cy.mockApi();
    cy.login();

    cy.contains("Recent Documents");
    cy.contains("FY2025 Annual Report");
  });

  it("shows loading skeletons before the figures arrive", () => {
    cy.mockApi({ delay: 1200 });
    cy.login();

    cy.get(".animate-pulse").should("have.length.at.least", 3);
    cy.get('[data-cy="stat-companies"]', { timeout: 15000 }).should(
      "have.text",
      "5"
    );
  });

  it("navigates with the quick actions", () => {
    cy.mockApi();
    cy.login();

    cy.contains("Analyze Company").click();
    cy.location("pathname").should("eq", "/companies");

    cy.get("nav").contains("a", "Dashboard").click();
    cy.contains("Compare Companies").click();
    cy.location("pathname").should("eq", "/compare");
  });

  it("opens a company profile from the recent list", () => {
    cy.mockApi();
    cy.login();

    cy.get('a[href="/companies/2"]').click();
    cy.location("pathname").should("eq", "/companies/2");
    cy.get("h1").contains("Global Pharma Inc");
  });
});
