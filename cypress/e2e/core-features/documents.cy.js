describe("Document repository", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/documents");
  });

  it("lists every document with its processing status", () => {
    cy.get('[data-cy="document-row"]').should("have.length", 4);
    cy.contains("FY2025 Annual Report");
    cy.contains("Global Pharma FY2025 10-K");
    cy.get('[data-cy="document-row"]').contains("Completed");
    cy.get('[data-cy="document-row"]').contains("Processing");
  });

  it("filters documents by company", () => {
    cy.get("button[role=\"combobox\"]").first().click();
    cy.get('[role="option"]').contains("Global Pharma Inc").click();

    cy.get('[data-cy="document-row"]').should("have.length", 1);
    cy.get('[data-cy="document-row"]').contains("Global Pharma FY2025 10-K");
  });

  it("deletes a document after confirmation", () => {
    cy.on("window:confirm", (message) => {
      expect(message).to.contain("Delete this document");
      return true;
    });

    cy.get('[data-cy="document-row"]').first().find("button").click();

    cy.contains("Document deleted");
    cy.get('[data-cy="document-row"]').should("have.length", 3);
  });

  it("keeps the document when the confirmation is dismissed", () => {
    cy.on("window:confirm", () => false);

    cy.get('[data-cy="document-row"]').first().find("button").click();

    cy.get('[data-cy="document-row"]').should("have.length", 4);
  });
});

describe("Document repository — empty state", () => {
  it("explains that no documents have been uploaded", () => {
    cy.mockApi({ seed: { documents: [] } });
    cy.login();
    cy.visitApp("/documents");

    cy.contains("No documents uploaded yet.");
  });
});
