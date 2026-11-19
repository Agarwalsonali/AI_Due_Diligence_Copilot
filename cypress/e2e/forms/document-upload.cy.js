const pdf = () => Cypress.Buffer.from("%PDF-1.4\n% test document\n");

describe("Upload document dialog", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/documents");
    cy.contains("button", "Upload Document").click();
    cy.get('[role="dialog"]').should("be.visible");
  });

  it("requires a company and a file before uploading", () => {
    cy.get('[role="dialog"]').contains("button", "Upload").should("be.disabled");
  });

  it("rejects unsupported file types", () => {
    cy.get('[role="dialog"] input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from("nope"), fileName: "notes.exe" },
      { force: true }
    );

    cy.contains("Only PDF, DOCX, and TXT files are supported.");
    cy.get('[role="dialog"]').contains("button", "Upload").should("be.disabled");
  });

  it("derives the document title from the file name", () => {
    cy.get('[role="dialog"] input[type="file"]').selectFile(
      { contents: pdf(), fileName: "acme-q2-2025.pdf" },
      { force: true }
    );

    cy.get('[role="dialog"] #title').should("have.value", "acme-q2-2025");
  });

  it("uploads a PDF for the selected company", () => {
    cy.get('[role="dialog"] button[role="combobox"]').first().click();
    cy.get('[role="option"]').contains("Acme Corp").click();

    cy.get('[role="dialog"] input[type="file"]').selectFile(
      { contents: pdf(), fileName: "acme-q2-2025.pdf" },
      { force: true }
    );
    cy.get('[role="dialog"] button[role="combobox"]').eq(1).click();
    cy.get('[role="option"]').contains("10-Q").click();

    cy.get('[role="dialog"]').contains("button", "Upload").click();

    cy.contains("Document uploaded and processing started");
    cy.get('[role="dialog"]').should("not.exist");
    cy.get('[data-cy="document-row"]').should("have.length", 5);
  });
});

describe("Upload document dialog — API failure", () => {
  it("shows the upload error inside the dialog", () => {
    cy.mockApi({
      failures: [
        {
          route: "POST /documents/upload",
          statusCode: 500,
          body: { detail: "Upload failed: unsupported encoding" },
        },
      ],
    });
    cy.login();
    cy.visitApp("/documents");
    cy.contains("button", "Upload Document").click();
    cy.get('[role="dialog"] button[role="combobox"]').first().click();
    cy.get('[role="option"]').contains("Acme Corp").click();
    cy.get('[role="dialog"] input[type="file"]').selectFile(
      { contents: pdf(), fileName: "broken.pdf" },
      { force: true }
    );
    cy.get('[role="dialog"]').contains("button", "Upload").click();

    cy.contains("Upload failed: unsupported encoding");
    cy.get('[role="dialog"]').should("be.visible");
  });
});
