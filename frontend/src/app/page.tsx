import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Building2, FileText, MessageSquare, GitCompare,
  FileBarChart, AlertTriangle, ArrowRight, Sparkles,
} from 'lucide-react';

export const metadata = {
  title: 'DD Copilot — AI-Powered Due Diligence',
  description:
    'Turn annual reports into answers. DD Copilot reads your filings, builds company profiles and answers every question with sources.',
};

const features = [
  {
    icon: Building2,
    title: 'Company Profiles',
    description:
      'Structured profiles for every company you track — tickers, industry, financials and document counts in one place.',
  },
  {
    icon: FileText,
    title: 'Document Intelligence',
    description:
      'Upload annual reports and filings. They are parsed, chunked and embedded so every page becomes searchable.',
  },
  {
    icon: MessageSquare,
    title: 'AI Research Chat',
    description:
      'Ask questions in plain language and get answers grounded in your uploaded documents — with citations to the source.',
  },
  {
    icon: AlertTriangle,
    title: 'Risk & Opportunity Analysis',
    description:
      'Automated risk scans and growth-opportunity analysis for each company, so nothing important stays buried.',
  },
  {
    icon: GitCompare,
    title: 'Company Comparison',
    description:
      'Compare two to four companies side by side on the metrics that matter before you commit.',
  },
  {
    icon: FileBarChart,
    title: 'Due Diligence Reports',
    description:
      'Generate polished due diligence reports and download them as PDFs, ready to share with your team.',
  },
];

const steps = [
  {
    title: 'Add a company',
    description: 'Create a profile with its ticker and industry in seconds.',
  },
  {
    title: 'Upload documents',
    description: 'Drop in annual reports and filings — we parse and embed them automatically.',
  },
  {
    title: 'Ask & analyze',
    description: 'Chat with your documents or run the risk, health and opportunity analyses.',
  },
  {
    title: 'Export the report',
    description: 'Generate a polished due diligence report and download it as a PDF.',
  },
];

const faqs = [
  {
    q: 'What documents can I upload?',
    a: 'Annual reports and other financial filings. Each upload is parsed page by page, split into passages and embedded into the vector store so the answers can cite exactly where they came from.',
  },
  {
    q: 'How do I know I can trust the answers?',
    a: 'Every response from the AI Research Chat is grounded in your own uploaded documents and comes with citations to the source passages — not generic model output.',
  },
  {
    q: 'How many companies can I compare?',
    a: 'You can compare between two and four companies side by side in a single view and export the comparison as a report.',
  },
  {
    q: 'Is my data private?',
    a: 'Your workspace is scoped to your account. Companies, documents and reports you upload are only visible to you.',
  },
  {
    q: 'How do I get started?',
    a: 'Create an account, add your first company and upload a report — you can be asking questions within minutes.',
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
        <TrendingUp className="h-5 w-5 text-primary" />
      </div>
      <span className="font-semibold text-lg tracking-tight whitespace-nowrap">DD Copilot</span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {/* Hidden on the smallest screens — the hero and footer repeat both CTAs */}
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered due diligence workspace
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Turn annual reports into <span className="text-primary">answers</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                DD Copilot reads your filings, builds company profiles and answers every
                question with sources — so you can find risks and opportunities in hours,
                not weeks.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button asChild size="lg">
                  <Link href="/register">
                    Get started free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>

            {/* Product mock */}
            <div className="rounded-2xl border border-border bg-card shadow-2xl p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Companies', value: '12' },
                  { label: 'Documents', value: '48' },
                  { label: 'Processed', value: '46' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-xl font-bold">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex justify-end">
                  <div className="rounded-lg bg-primary/15 border border-primary/20 px-3 py-2 text-sm max-w-[85%]">
                    What are the biggest risks facing this company?
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20 shrink-0 h-fit">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    Concentration risk in the top three customers and thin free-cash-flow
                    margins, based on{' '}
                    <span className="text-primary underline underline-offset-2">p. 42</span>{' '}
                    of the latest annual report.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Risk analysis', 'Financial health', 'PDF report'].map((chip) => (
                  <span key={chip} className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: '5', label: 'Analysis engines — risk, health, opportunities, summary & comparison' },
            { value: '2–4', label: 'Companies compared side by side' },
            { value: 'PDF', label: 'Reports you can export and share' },
            { value: '100%', label: 'Answers grounded in your own documents' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything you need to diligence a company
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            From raw filings to a finished report — one workspace for the whole workflow.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="p-2.5 w-fit rounded-lg bg-primary/10 border border-primary/20 mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-border bg-card/50 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How it works</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Four steps from an empty workspace to a finished report.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-xl border border-border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-sm sm:text-base">
                {item.q}
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-6 py-12 sm:px-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to start your due diligence?</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Create a workspace, add your first company and see what your filings have been
            trying to tell you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/register">
                Create an account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in instead</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Logo />
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Get started</Link>
          </nav>
          <p className="text-xs text-muted-foreground">© 2026 DD Copilot</p>
        </div>
      </footer>
    </div>
  );
}
