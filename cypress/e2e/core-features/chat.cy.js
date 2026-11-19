describe("AI research chat", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/chat");
  });

  it("shows the empty state with suggested questions", () => {
    cy.contains("Ask anything about this company");
    cy.contains("button", "What are the biggest risks facing this company?");
  });

  it("answers a question and cites the source document", () => {
    cy.get('input[placeholder="Ask a question about this company..."]').type(
      "What was revenue in FY2025?{enter}"
    );

    cy.contains("What was revenue in FY2025?");
    cy.contains("$2.4 billion");
    cy.contains("Sources");
    cy.contains("FY2025 Annual Report");
  });

  it("sends a suggested question", () => {
    cy.contains("button", "What are the biggest risks facing this company?").click();

    cy.contains("Sentiment on the earnings call was positive.");
  });

  it("disables sending while the composer is empty", () => {
    cy.get('input[placeholder="Ask a question about this company..."]')
      .parent()
      .find("button")
      .should("be.disabled");

    cy.get('input[placeholder="Ask a question about this company..."]').type("Hi");
    cy.get('input[placeholder="Ask a question about this company..."]')
      .parent()
      .find("button")
      .should("be.enabled");
  });
});

describe("AI research chat — API failure", () => {
  it("renders the failure inside the conversation", () => {
    cy.mockApi({
      failures: [
        {
          route: "POST /chat",
          statusCode: 500,
          body: { detail: "LLM quota exceeded" },
        },
      ],
    });
    cy.login();
    cy.visitApp("/chat");
    cy.get('input[placeholder="Ask a question about this company..."]').type(
      "Summarise revenue{enter}"
    );

    cy.contains("Sorry, LLM quota exceeded");
  });
});
