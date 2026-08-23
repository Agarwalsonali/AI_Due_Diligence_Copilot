'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft, Trash2, FileText, Activity, AlertTriangle,
  Lightbulb, MessageSquare, TrendingUp, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { companyAPI, analysisAPI } from '@/lib/api';
import { Company, FinancialMetricResponse, FinancialRatio } from '@/types';
import { toast } from 'sonner';

import { MetricsCards } from '@/components/company/metrics-cards';
import { UploadDialog } from '@/components/document/upload-dialog';
import { DocumentList } from '@/components/document/document-list';
import { ChatInterface } from '@/components/chat/chat-interface';
import { RiskCard } from '@/components/analysis/risk-card';
import { OpportunityCard } from '@/components/analysis/opportunity-card';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetricResponse[]>([]);
  const [ratios, setRatios] = useState<FinancialRatio[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const comp = await companyAPI.get(id);
      setCompany(comp);
    } catch (error) {
      toast.error('Failed to load company');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadAnalysis = useCallback(async () => {
    try {
      const data = await companyAPI.analysis(id);
      if (data) {
        if (data.financials) {
          setMetrics(data.financials.metrics || []);
          setRatios(data.financials.ratios || []);
        }
        if (data.risks) setRisks(data.risks.risks || []);
        if (data.opportunities) setOpportunities(data.opportunities.opportunities || []);
        if (data.financial_health) setHealth(data.financial_health);
        if (data.summary) setSummary(data.summary);
      }
    } catch (e) {
      // Analysis might not exist yet — that's fine
    }
  }, [id]);

  useEffect(() => {
    if (company) loadAnalysis();
  }, [company, loadAnalysis]);

  const runAnalysis = async (type: string) => {
    setAnalyzing(prev => ({ ...prev, [type]: true }));
    try {
      switch (type) {
        case 'financials': {
          const data = await analysisAPI.financials(parseInt(id));
          setMetrics(data.metrics || []);
          setRatios(data.ratios || []);
          break;
        }
        case 'health': {
          const data = await analysisAPI.health(parseInt(id));
          setHealth(data);
          break;
        }
        case 'risks': {
          const data = await analysisAPI.risks(parseInt(id));
          setRisks(data.risks || []);
          break;
        }
        case 'opportunities': {
          const data = await analysisAPI.opportunities(parseInt(id));
          setOpportunities(data.opportunities || []);
          break;
        }
        case 'summary': {
          const data = await analysisAPI.summary(parseInt(id));
          setSummary(data);
          break;
        }
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} analysis complete`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || `Failed to run ${type} analysis`);
    } finally {
      setAnalyzing(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this company and all its documents?')) return;
    try {
      await companyAPI.delete(id);
      toast.success('Company deleted');
      router.push('/companies');
    } catch (e) {
      toast.error('Failed to delete company');
    }
  };

  // Build chart data from metrics
  const chartData = React.useMemo(() => {
    if (!metrics.length) return [];
    const byYear: Record<number, any> = {};
    metrics.forEach(m => {
      if (m.fiscalYear) {
        if (!byYear[m.fiscalYear]) byYear[m.fiscalYear] = { year: m.fiscalYear };
        byYear[m.fiscalYear][m.metricName] = m.metricValue;
      }
    });
    return Object.values(byYear).sort((a: any, b: any) => a.year - b.year);
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!company) {
    return <div className="text-center py-12 text-destructive">Company not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{company.name}</h1>
              {company.ticker && (
                <Badge variant="outline" className="font-mono">{company.ticker}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {company.industry}{company.sector ? ` • ${company.sector}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-1.5" />Documents</TabsTrigger>
          <TabsTrigger value="financials"><TrendingUp className="w-4 h-4 mr-1.5" />Financials</TabsTrigger>
          <TabsTrigger value="risks"><AlertTriangle className="w-4 h-4 mr-1.5" />Risks</TabsTrigger>
          <TabsTrigger value="opportunities"><Lightbulb className="w-4 h-4 mr-1.5" />Opportunities</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-1.5" />Chat</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <MetricsCards metrics={metrics} ratios={ratios} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Executive Summary</CardTitle>
                  <CardDescription>AI-generated analysis overview</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => runAnalysis('summary')} disabled={analyzing.summary}>
                  {analyzing.summary ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
                  {summary ? 'Refresh' : 'Generate'}
                </Button>
              </CardHeader>
              <CardContent>
                {summary ? (
                  <div className="space-y-4">
                    {summary.executiveSummary && (
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p>{summary.executiveSummary}</p>
                      </div>
                    )}
                    {summary.keyFindings && summary.keyFindings.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Key Findings</h4>
                        <ul className="space-y-1">
                          {summary.keyFindings.map((f: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-primary">•</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No summary available. Upload documents and click Generate to create one.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Health</CardTitle>
                <CardDescription>Overall assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {health ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{health.overall || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground mt-1">Overall Rating</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {['growth', 'profitability', 'liquidity', 'leverage', 'cashFlow'].map(dim => (
                        <div key={dim} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{dim}</span>
                          <span className="font-medium">{health[dim] || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm mb-3">Run analysis to see health assessment</p>
                    <Button variant="outline" size="sm" onClick={() => runAnalysis('health')} disabled={analyzing.health}>
                      {analyzing.health ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
                      Run Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Risk/Opportunity Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Top Risks</CardTitle>
                  <CardDescription>{risks.length} identified</CardDescription>
                </div>
                {risks.length === 0 && (
                  <Button variant="outline" size="sm" onClick={() => runAnalysis('risks')} disabled={analyzing.risks}>
                    {analyzing.risks ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
                    Analyze
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {risks.length > 0 ? (
                  <div className="space-y-3">
                    {risks.slice(0, 3).map((risk: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <Badge variant="outline" className={`text-xs shrink-0 ${
                          risk.severity === 'CRITICAL' ? 'border-destructive text-destructive' :
                          risk.severity === 'HIGH' ? 'border-orange-500 text-orange-500' :
                          'border-muted-foreground text-muted-foreground'
                        }`}>{risk.severity}</Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{risk.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{risk.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">No risks analyzed yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Growth Opportunities</CardTitle>
                  <CardDescription>{opportunities.length} identified</CardDescription>
                </div>
                {opportunities.length === 0 && (
                  <Button variant="outline" size="sm" onClick={() => runAnalysis('opportunities')} disabled={analyzing.opportunities}>
                    {analyzing.opportunities ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
                    Analyze
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {opportunities.length > 0 ? (
                  <div className="space-y-3">
                    {opportunities.slice(0, 3).map((opp: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <Badge variant="outline" className="text-xs shrink-0 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">{opp.category}</Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{opp.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{opp.description?.substring(0, 80)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">No opportunities analyzed yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Documents ────────────────────────────────────────────────────── */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload and manage financial documents</CardDescription>
              </div>
              <UploadDialog companyId={id} onSuccess={fetchData} />
            </CardHeader>
            <CardContent>
              <DocumentList companyId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Financials ───────────────────────────────────────────────────── */}
        <TabsContent value="financials" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Financial Analysis</h2>
            <Button variant="outline" size="sm" onClick={() => runAnalysis('financials')} disabled={analyzing.financials}>
              {analyzing.financials ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
              {metrics.length > 0 ? 'Re-analyze' : 'Run Analysis'}
            </Button>
          </div>

          <MetricsCards metrics={metrics} ratios={ratios} />

          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Revenue & Net Income</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v}`} />
                      <Tooltip formatter={(v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net_income" name="Net Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Debt vs Cash</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v}`} />
                      <Tooltip formatter={(v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="debt" name="Total Debt" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="cash" name="Cash" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ratios Table */}
          {Array.isArray(ratios) && ratios.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Financial Ratios</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ratios.map((ratio: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground capitalize">{ratio.name?.replace(/_/g, ' ')}</div>
                      <div className="text-lg font-bold mt-1">
                        {ratio.value != null ? (typeof ratio.value === 'number' && Math.abs(ratio.value) < 10 ? `${(ratio.value * 100).toFixed(1)}%` : ratio.value.toFixed(2)) : 'N/A'}
                      </div>
                      {ratio.fiscalYear && <div className="text-xs text-muted-foreground">FY {ratio.fiscalYear}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {metrics.length === 0 && !analyzing.financials && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Upload financial documents and run analysis to see financial metrics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Risks ────────────────────────────────────────────────────────── */}
        <TabsContent value="risks" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Risk Analysis</h2>
            <Button variant="outline" size="sm" onClick={() => runAnalysis('risks')} disabled={analyzing.risks}>
              {analyzing.risks ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
              {risks.length > 0 ? 'Re-analyze' : 'Analyze Risks'}
            </Button>
          </div>

          {risks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {risks.map((risk: any, i: number) => (
                <RiskCard key={i} risk={risk} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No risks identified yet. Run risk analysis to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Opportunities ────────────────────────────────────────────────── */}
        <TabsContent value="opportunities" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Growth Opportunities</h2>
            <Button variant="outline" size="sm" onClick={() => runAnalysis('opportunities')} disabled={analyzing.opportunities}>
              {analyzing.opportunities ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
              {opportunities.length > 0 ? 'Re-analyze' : 'Analyze Opportunities'}
            </Button>
          </div>

          {opportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp: any, i: number) => (
                <OpportunityCard key={i} opportunity={opp} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No growth opportunities identified yet. Run analysis to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Chat ─────────────────────────────────────────────────────────── */}
        <TabsContent value="chat">
          <div className="h-[600px] rounded-xl border overflow-hidden">
            <ChatInterface companyId={id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
