describe("Companies list", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/companies");
  });

  it("lists every company with ticker and document count", () => {
    cy.get('[data-cy="company-card"]').should("have.length", 5);

    cy.get('[data-cy="company-card"]').first().within(() => {
      cy.contains("Acme Corp");
      cy.contains("ACME");
      cy.contains("2 docs");
    });
  });

  it("filters by search term", () => {
    cy.get('input[placeholder="Search companies..."]').type("pharma");

    cy.get('[data-cy="company-card"]').should("have.length", 1);
    cy.get('[data-cy="company-card"]').contains("Global Pharma Inc");
  });

  it("searches by ticker", () => {
    cy.get('input[placeholder="Search companies..."]').type("HMAT");

    cy.get('[data-cy="company-card"]').should("have.length", 1);
    cy.get('[data-cy="company-card"]').contains("Helios Materials");
  });

  it("shows an empty state when nothing matches", () => {
    cy.get('input[placeholder="Search companies..."]').type("zzzz");

    cy.contains("No companies found");
    cy.contains("Try adjusting your search query");
  });

  it("opens a company profile from its card", () => {
    cy.get('[data-cy="company-card"]').contains("Acme Corp").click();

    cy.location("pathname").should("eq", "/companies/1");
    cy.get("h1").contains("Acme Corp");
  });
});

describe("Companies list — errors", () => {
  it("reports a failed company fetch", () => {
    cy.mockApi({
      failures: [{ route: "GET /companies", statusCode: 500 }],
    });
    cy.login();
    cy.visitApp("/companies");

    cy.contains("Failed to fetch companies");
  });
});
