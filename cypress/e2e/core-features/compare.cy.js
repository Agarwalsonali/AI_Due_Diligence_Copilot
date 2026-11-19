describe("Company comparison", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/compare");
  });

  it("requires at least two companies", () => {
    cy.contains("button", /Compare \d+ Companies/).should("be.disabled");

    cy.get('[data-cy="compare-option"]').contains("Acme Corp").click();

    cy.contains("button", /Compare \d+ Companies/).should("be.disabled");
    cy.contains("(1/4)");
  });

  it("compares two companies and offers a report", () => {
    cy.get('[data-cy="compare-option"]').contains("Acme Corp").click();
    cy.get('[data-cy="compare-option"]').contains("Global Pharma Inc").click();
    cy.contains("button", "Compare 2 Companies").click();

    cy.contains("Comparison Results");
    cy.contains("Comparing:");
    cy.contains("Acme Corp vs Global Pharma Inc were compared");
    cy.contains("button", "Download Report");
  });

  it("deselects a company when clicked again", () => {
    cy.get('[data-cy="compare-option"]').contains("Acme Corp").click();
    cy.get('[data-cy="compare-option"]').contains("Acme Corp").click();

    cy.contains("(0/4)");
  });

  it("caps the selection at four companies", () => {
    cy.get('[data-cy="compare-option"]').each(($option, index) => {
      if (index < 4) cy.wrap($option).click();
    });
    cy.contains("(4/4)");

    cy.get('[data-cy="compare-option"]').last().click();

    cy.contains("Maximum 4 companies for comparison");
    cy.contains("(4/4)");
  });
});
