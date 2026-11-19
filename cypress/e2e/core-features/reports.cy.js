describe("Reports", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/reports");
  });

  it("lists the existing report history", () => {
    cy.contains("Report History");
    cy.get('[data-cy="report-row"]').should("have.length", 1);
    cy.get('[data-cy="report-row"]').contains("Due Diligence Report - Acme Corp");
    cy.get('[data-cy="report-row"]').contains("button", "Download");
  });

  it("disables generation until a company is chosen", () => {
    cy.contains("button", "Generate Report").should("be.disabled");

    cy.get('button[role="combobox"]').first().click();
    cy.get('[role="option"]').contains("Acme Corp").click();

    cy.contains("button", "Generate Report").should("be.enabled");
  });

  it("generates a report for the selected company", () => {
    cy.get('button[role="combobox"]').first().click();
    cy.get('[role="option"]').contains("Global Pharma Inc").click();
    cy.contains("button", "Generate Report").click();

    cy.contains("Report generated successfully!");
    cy.get('[data-cy="report-row"]').should("have.length", 2);
    cy.get('[data-cy="report-row"]')
      .first()
      .contains("Due Diligence Report - Global Pharma Inc");
  });
});

describe("Reports — empty history", () => {
  it("invites the user to generate a first report", () => {
    cy.mockApi({ seed: { reports: [] } });
    cy.login();
    cy.visitApp("/reports");

    cy.contains("No reports generated yet");
    cy.contains("Select a company above to generate your first report");
  });
});
