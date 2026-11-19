/**
 * Deterministic API double for the FastAPI backend.
 *
 * Why this exists: the real backend needs PostgreSQL, Qdrant, an embedding
 * model and an LLM provider. Those services are not part of this workspace's
 * test environment, so the UI runs against an in-memory implementation of the
 * same endpoints:
 *
 *   - same paths        (/api/auth/login, /api/companies/{id}/analysis, ...)
 *   - same payload shape (snake_case, camelized by frontend/src/lib/api.ts)
 *   - same status codes (401 unauthenticated, 409 duplicate email, 404, ...)
 *   - real bearer-token enforcement, so protected-route behaviour is exercised
 *
 * State is per-test: each call to cy.mockApi() builds a fresh backend seeded
 * from cypress/fixtures/seed.json, so tests never share data.
 */

const DEFAULT_USER = {
  id: 1,
  name: "Test User",
  email: "test@freebuff.com",
  created_at: "2025-01-15T10:00:00Z",
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function reply(req, { statusCode = 200, body, headers = {}, delay = 0 } = {}) {
  req.reply({
    statusCode,
    body,
    delay,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "access-control-expose-headers": "content-disposition",
      ...headers,
    },
  });
}

export const TEST_CREDENTIALS = {
  email: Cypress.expose("testEmail") || DEFAULT_USER.email,
  password: Cypress.expose("testPassword") || "testpassword123",
};

export function createBackend(options = {}) {
  const seed = options.seed || {};
  const delay = options.delay ?? 0;
  const failures = (options.failures || []).map((failure) => ({
    times: 1,
    ...failure,
  }));

  const state = {
    token: options.token || "cypress-access-token",
    password: seed.password || TEST_CREDENTIALS.password,
    user: clone(seed.user || DEFAULT_USER),
    companies: clone(seed.companies || []),
    documents: clone(seed.documents || []),
    analyses: clone(seed.analyses || {}),
    reports: clone(seed.reports || []),
    nextId: 1000,
  };

  const nextId = () => (state.nextId += 1);
  const documentCount = (companyId) =>
    state.documents.filter((doc) => doc.company_id === Number(companyId)).length;
  const withCounts = (company) => ({
    ...company,
    document_count: documentCount(company.id),
  });
  const companyById = (id) =>
    state.companies.find((c) => c.id === Number(id)) || null;
  const nowIso = () => new Date().toISOString();

  function takeFailure(route) {
    const match = failures.find((f) => f.route === route && f.times > 0);
    if (!match) return null;
    match.times -= 1;
    return match;
  }

  const PUBLIC_ROUTES = new Set([
    "POST /auth/login",
    "POST /auth/register",
    "GET /health",
  ]);

  function handle(req) {
    const method = req.method.toUpperCase();
    if (method === "OPTIONS") return reply(req, { statusCode: 204, delay });

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, "");
    const route = `${method} ${path}`;

    const forced = takeFailure(route);
    if (forced) {
      return reply(req, {
        statusCode: forced.statusCode,
        body: forced.body || { detail: forced.detail || "Injected failure" },
        delay,
      });
    }

    const authorization =
      req.headers.authorization || req.headers.Authorization || "";
    const authenticated = authorization === `Bearer ${state.token}`;

    if (!PUBLIC_ROUTES.has(route) && !authenticated) {
      return reply(req, {
        statusCode: 401,
        body: { detail: "Not authenticated" },
        delay,
      });
    }

    // ── Auth ───────────────────────────────────────────────────────────────
    if (route === "POST /auth/login") {
      const body = parseBody(req);
      const matchesEmail =
        String(body.email || "").toLowerCase() ===
        state.user.email.toLowerCase();
      if (matchesEmail && body.password === state.password) {
        return reply(req, {
          body: { access_token: state.token, token_type: "bearer" },
          delay,
        });
      }
      return reply(req, {
        statusCode: 401,
        body: { detail: "Invalid email or password" },
        delay,
      });
    }

    if (route === "POST /auth/register") {
      const body = parseBody(req);
      const email = String(body.email || "").trim();
      const existed = email.toLowerCase() === state.user.email.toLowerCase();
      if (existed) {
        return reply(req, {
          statusCode: 409,
          body: { detail: "A user with this email already exists" },
          delay,
        });
      }
      state.user = {
        id: nextId(),
        name: body.name || "New User",
        email,
        created_at: nowIso(),
      };
      state.password = body.password || state.password;
      return reply(req, {
        body: { access_token: state.token, token_type: "bearer" },
        delay,
      });
    }

    if (route === "GET /auth/me") {
      return reply(req, { body: state.user, delay });
    }

    if (route === "POST /auth/logout") {
      return reply(req, { body: { message: "Successfully logged out" }, delay });
    }

    if (route === "GET /health") {
      return reply(req, { body: { status: "ok", message: "Service is running" }, delay });
    }

    // ── Companies ──────────────────────────────────────────────────────────
    if (route === "GET /companies") {
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const list = state.companies
        .filter(
          (company) =>
            !search ||
            company.name.toLowerCase().includes(search) ||
            (company.ticker || "").toLowerCase().includes(search)
        )
        .map(withCounts);
      return reply(req, { body: list, delay });
    }

    if (route === "POST /companies") {
      const body = parseBody(req);
      const company = {
        id: nextId(),
        name: body.name,
        ticker: body.ticker || null,
        industry: body.industry || null,
        sector: body.sector || null,
        description: body.description || null,
        website: body.website || null,
        created_by: state.user.id,
        created_at: nowIso(),
        document_count: 0,
      };
      state.companies.push(company);
      return reply(req, { statusCode: 200, body: withCounts(company), delay });
    }

    const companyDocuments = path.match(/^\/companies\/(\d+)\/documents$/);
    if (method === "GET" && companyDocuments) {
      const company = companyById(companyDocuments[1]);
      if (!company) {
        return reply(req, { statusCode: 404, body: { detail: "Company not found." }, delay });
      }
      return reply(req, {
        body: state.documents.filter(
          (doc) => doc.company_id === company.id
        ),
        delay,
      });
    }

    const companyAnalysis = path.match(/^\/companies\/(\d+)\/analysis$/);
    if (method === "GET" && companyAnalysis) {
      const company = companyById(companyAnalysis[1]);
      if (!company) {
        return reply(req, { statusCode: 404, body: { detail: "Company not found." }, delay });
      }
      const analysis = state.analyses[String(company.id)] || {};
      return reply(req, {
        body: {
          company_id: company.id,
          financials: analysis.financials || null,
          financial_health: analysis.financial_health || null,
          risks: analysis.risks || null,
          opportunities: analysis.opportunities || null,
          summary: analysis.summary || null,
        },
        delay,
      });
    }

    const companyDetail = path.match(/^\/companies\/(\d+)$/);
    if (companyDetail) {
      const company = companyById(companyDetail[1]);
      if (!company) {
        return reply(req, { statusCode: 404, body: { detail: "Company not found" }, delay });
      }
      if (method === "GET") {
        return reply(req, { body: withCounts(company), delay });
      }
      if (method === "DELETE") {
        state.companies = state.companies.filter((c) => c.id !== company.id);
        state.documents = state.documents.filter(
          (doc) => doc.company_id !== company.id
        );
        delete state.analyses[String(company.id)];
        return reply(req, { body: { message: "Deleted" }, delay });
      }
    }

    // ── Documents ──────────────────────────────────────────────────────────
    if (route === "GET /documents") {
      const companyId = url.searchParams.get("company_id");
      const list = companyId
        ? state.documents.filter((doc) => doc.company_id === Number(companyId))
        : state.documents;
      return reply(req, { body: list, delay });
    }

    if (route === "POST /documents/upload") {
      const document = {
        id: nextId(),
        company_id: Number(
          (req.body && req.body.company_id) || state.companies[0]?.id || 1
        ),
        user_id: state.user.id,
        title: "Uploaded document",
        file_name: "uploaded.pdf",
        file_path: "data/uploads/uploaded.pdf",
        document_type: "Other",
        filing_date: null,
        page_count: 0,
        processing_status: "processing",
        error_message: null,
        created_at: nowIso(),
      };
      state.documents.unshift(document);
      return reply(req, {
        body: {
          id: document.id,
          file_name: document.file_name,
          status: document.processing_status,
          message: "Document uploaded and processing started.",
        },
        delay,
      });
    }

    const documentDetail = path.match(/^\/documents\/(\d+)$/);
    if (method === "DELETE" && documentDetail) {
      state.documents = state.documents.filter(
        (doc) => doc.id !== Number(documentDetail[1])
      );
      return reply(req, { body: { message: "Document deleted successfully." }, delay });
    }

    // ── Analysis ───────────────────────────────────────────────────────────
    if (route === "POST /analysis/compare") {
      const body = parseBody(req);
      const ids = body.company_ids || [];
      const names = {};
      ids.forEach((id) => {
        const company = companyById(id);
        if (company) names[company.id] = company.name;
      });
      const compared = Object.values(names);
      return reply(req, {
        body: {
          company_ids: ids,
          company_names: names,
          comparison: `## Comparison\n\n${compared.join(
            " vs "
          )} were compared on revenue growth, margins and risk exposure.`,
          sources: [],
        },
        delay,
      });
    }

    const analysisType = path.match(
      /^\/analysis\/(financials|health|risks|opportunities|summary)$/
    );
    if (method === "POST" && analysisType) {
      const body = parseBody(req);
      const analysis = state.analyses[String(body.company_id)] || {};
      const key =
        analysisType[1] === "health" ? "financial_health" : analysisType[1];
      return reply(req, {
        body: analysis[key] || { company_id: body.company_id, status: "completed" },
        delay,
      });
    }

    if (method === "POST" && path === "/analysis/compare") {
      return reply(req, { statusCode: 400, body: { detail: "Unsupported" }, delay });
    }

    // ── Chat ───────────────────────────────────────────────────────────────
    if (route === "POST /chat") {
      const body = parseBody(req);
      const sessionId = body.session_id || nextId();
      return reply(req, {
        body: {
          answer: `Acme Corp reported total revenue of **$2.4 billion** in FY2025, an 18% increase year over year.\n\nSentiment on the earnings call was positive.`,
          session_id: sessionId,
          confidence: 0.82,
          sufficient_evidence: true,
          sources: [
            {
              document_id: 1,
              document_title: "FY2025 Annual Report",
              page_number: 5,
              section: "Revenue Overview",
              excerpt:
                "Acme Corp reported total revenue of $2.4 billion for fiscal year 2025.",
            },
          ],
        },
        delay,
      });
    }

    // ── Reports ────────────────────────────────────────────────────────────
    if (route === "GET /reports") {
      return reply(req, { body: state.reports, delay });
    }

    if (route === "POST /reports/generate") {
      const body = parseBody(req);
      const company = companyById(body.company_id);
      const report = {
        id: nextId(),
        title: `Due Diligence Report - ${company ? company.name : "Company"}`,
        status: "completed",
        file_path: null,
        created_at: nowIso(),
      };
      state.reports.unshift(report);
      return reply(req, { body: report, delay });
    }

    if (route === "POST /reports/generate-comparison") {
      const body = parseBody(req);
      const ids = body.company_ids || [];
      const report = {
        id: nextId(),
        title: `Comparative Report - ${ids.length} companies`,
        status: "completed",
        file_path: null,
        created_at: nowIso(),
      };
      state.reports.unshift(report);
      return reply(req, { body: report, delay });
    }

    const reportDownload = path.match(/^\/reports\/(\d+)\/download$/);
    if (method === "GET" && reportDownload) {
      return reply(req, {
        body: Cypress.Buffer.from("%PDF-1.4\n% test report\n"),
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="report-${reportDownload[1]}.pdf"`,
        },
        delay,
      });
    }

    const reportDetail = path.match(/^\/reports\/(\d+)$/);
    if (method === "GET" && reportDetail) {
      const report = state.reports.find(
        (item) => item.id === Number(reportDetail[1])
      );
      if (!report) {
        return reply(req, { statusCode: 404, body: { detail: "Report not found." }, delay });
      }
      return reply(req, { body: report, delay });
    }

    return reply(req, {
      statusCode: 404,
      body: { detail: `No stub for ${route}` },
      delay,
    });
  }

  return {
    state,
    token: state.token,
    handle,
  };
}
