describe("Add company form", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
    cy.visitApp("/companies");
    cy.contains("button", "Add Company").first().click();
    cy.get('[role="dialog"]').should("be.visible");
  });

  it("keeps the dialog open when the required name is missing", () => {
    cy.get('[role="dialog"]').contains("button", "Add Company").click();

    cy.get('[role="dialog"]').should("be.visible");
    cy.get('[role="dialog"] #name').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
  });

  it("creates a company and adds it to the list", () => {
    cy.get('[role="dialog"] #name').type("Initech");
    cy.get('[role="dialog"] #ticker').type("INIT");
    cy.get('[role="dialog"] #website').type("https://initech.example.com");
    cy.get('[role="dialog"]').contains("button", "Add Company").click();

    cy.contains("Company created successfully");
    cy.get('[role="dialog"]').should("not.exist");
    cy.get('[data-cy="company-card"]').should("have.length", 6);
    cy.get('[data-cy="company-card"]').contains("Initech");
  });

  it("stores the chosen industry", () => {
    cy.get('[role="dialog"] #name').type("Umbrella Financial");
    cy.get('[role="dialog"] button[role="combobox"]').click();
    cy.get('[role="option"]').contains("Finance").click();
    cy.get('[role="dialog"]').contains("button", "Add Company").click();

    cy.get('[data-cy="company-card"]')
      .contains("Umbrella Financial")
      .parent()
      .should("contain", "Finance");
  });

  it("cancels without creating a company", () => {
    cy.get('[role="dialog"] #name').type("Discarded Co");
    cy.get('[role="dialog"]').contains("button", "Cancel").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.get('[data-cy="company-card"]').should("have.length", 5);
    cy.contains("Discarded Co").should("not.exist");
  });
});

describe("Add company form — API failure", () => {
  it("surfaces the backend error and keeps the dialog open", () => {
    cy.mockApi({
      failures: [
        {
          route: "POST /companies",
          statusCode: 500,
          body: { detail: "Database unavailable" },
        },
      ],
    });
    cy.login();
    cy.visitApp("/companies");
    cy.contains("button", "Add Company").first().click();
    cy.get('[role="dialog"] #name').type("Broken Co");
    cy.get('[role="dialog"]').contains("button", "Add Company").click();

    cy.contains("Failed to create company");
    cy.contains("Database unavailable");
    cy.get('[role="dialog"]').should("be.visible");
  });
});
