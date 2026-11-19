describe("Public landing page", () => {
  it("renders the marketing page without a session", () => {
    cy.mockApi();
    cy.visitApp("/");

    cy.get("h1").contains("Turn annual reports into");
    cy.contains("Everything you need to diligence a company");
    cy.contains("How it works");
    cy.contains("Frequently asked questions");
    cy.get("header").contains("a", "Get started").should("have.attr", "href", "/register");
  });

  it("reaches the sign-in form from the hero", () => {
    cy.mockApi();
    cy.visitApp("/");

    cy.get('a[href="/login"]').first().click();

    cy.location("pathname").should("eq", "/login");
  });

  it("opens an FAQ answer", () => {
    cy.mockApi();
    cy.visitApp("/");

    cy.contains("summary", "How many companies can I compare?").click();
    cy.contains("compare between two and four companies");
  });
});

describe("Dashboard navigation", () => {
  beforeEach(() => {
    cy.mockApi();
    cy.login();
  });

  it("moves between sections from the sidebar", () => {
    cy.get("nav").contains("a", "Companies").click();
    cy.location("pathname").should("eq", "/companies");
    cy.get("header h1").should("have.text", "Companies");

    cy.get("nav").contains("a", "Documents").click();
    cy.location("pathname").should("eq", "/documents");
    cy.get("header h1").should("have.text", "Documents");

    cy.get("nav").contains("a", "AI Research").click();
    cy.location("pathname").should("eq", "/chat");
    cy.get("header h1").should("have.text", "AI Research");

    cy.get("nav").contains("a", "Compare").click();
    cy.location("pathname").should("eq", "/compare");
    cy.get("header h1").should("have.text", "Company Comparison");

    cy.get("nav").contains("a", "Reports").click();
    cy.location("pathname").should("eq", "/reports");
    cy.get("header h1").should("have.text", "Reports");

    cy.get("nav").contains("a", "Settings").click();
    cy.location("pathname").should("eq", "/settings");
    cy.get("header h1").should("have.text", "Settings");

    cy.get("nav").contains("a", "Dashboard").click();
    cy.location("pathname").should("eq", "/dashboard");
  });

  it("marks the current section as active", () => {
    cy.get("nav").contains("a", "Documents").click();
    cy.get("nav").contains("a", "Documents").should("have.class", "text-primary");
  });

  it("opens and closes the mobile navigation drawer", () => {
    cy.viewport(375, 667);

    cy.get("button[aria-label=\"Open navigation menu\"]").click();
    cy.get('button[aria-label="Close navigation menu"]').should("be.visible");
    cy.get(".fixed.inset-0.z-40").should("exist");
    cy.get("nav").contains("a", "Companies").should("have.class", "px-3");

    cy.get('button[aria-label="Close navigation menu"]').click();
    cy.get(".fixed.inset-0.z-40").should("not.exist");
  });

  it("closes the mobile drawer after navigating", () => {
    cy.viewport(375, 667);

    cy.get('button[aria-label="Open navigation menu"]').click();
    cy.get("nav").contains("a", "Reports").click();

    cy.location("pathname").should("eq", "/reports");
    cy.get(".fixed.inset-0.z-40").should("not.exist");
  });

  it("toggles the colour theme", () => {
    cy.get("html").should("have.class", "dark");

    cy.get('button[title="Toggle theme"]').first().click();
    cy.get("html").should("have.class", "light");

    cy.get('button[title="Toggle theme"]').first().click();
    cy.get("html").should("have.class", "dark");
  });

  it("opens the notification centre", () => {
    cy.get('button[aria-label="Notifications"]').click();
    cy.contains("You're all caught up");
  });

  it("leads back to the landing page from the logo", () => {
    cy.get("a").contains("DD Copilot").first().click();
    cy.location("pathname").should("eq", "/");
  });
});
