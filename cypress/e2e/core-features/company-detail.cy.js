describe("Company profile", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/companies/1");
  });

  it("shows the header, summary and financial health", () => {
    cy.get("h1").contains("Acme Corp");
    cy.contains("ACME");
    cy.contains("Technology • Software");

    cy.contains("Executive Summary");
    cy.contains("Acme Corp is a rapidly growing enterprise SaaS company");
    cy.contains("Key Findings");
    cy.contains("Revenue grew 18% YoY to $2.4B");

    cy.contains("Financial Health");
    cy.contains("Strong");
    cy.contains("Overall Rating");
  });

  it("shows the risk analysis with severity and evidence", () => {
    cy.contains('[role="tab"]', "Risks").click();

    cy.contains("Risk Analysis");
    cy.contains("Increasing Competitive Pressure");
    cy.contains("MEDIUM");
    cy.contains("HIGH");

    cy.contains("button", "Evidence & Sources").first().click();
    cy.contains("Market share data shows three new competitors");
  });

  it("shows growth opportunities", () => {
    cy.contains('[role="tab"]', "Opportunities").click();

    cy.contains("AI-Powered Product Features");
    cy.contains("25% uplift in enterprise deal sizes");
    cy.contains("High");
  });

  it("shows financial metrics and ratios", () => {
    cy.contains('[role="tab"]', "Financials").click();

    cy.contains("Financial Analysis");
    cy.contains("Revenue");
    cy.contains("Net Margin");
    cy.contains("Financial Ratios");
    cy.contains("debt to equity");
  });

  it("lists the documents attached to the company", () => {
    cy.contains('[role="tab"]', "Documents").click();

    cy.get('[data-cy="document-row"]').should("have.length", 2);
    cy.contains("FY2025 Annual Report");
    cy.contains("Q1 2025 Earnings Call Transcript");
  });

  it("shows empty analysis states for a company without analysis", () => {
    cy.visitApp("/companies/3");

    cy.contains("No summary available");
    cy.contains("No risks analyzed yet");
    cy.contains("No opportunities analyzed yet");
  });

  it("deletes the company after confirmation", () => {
    cy.on("window:confirm", (message) => {
      expect(message).to.contain("Delete this company");
      return true;
    });

    cy.contains("button", "Delete").click();

    cy.location("pathname").should("eq", "/companies");
    cy.contains("Company deleted");
    cy.get('[data-cy="company-card"]').should("have.length", 4);
  });
});

describe("Company profile — missing company", () => {
  it("reports a company that does not exist", () => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/companies/9999");

    cy.contains("Company not found");
  });
});
