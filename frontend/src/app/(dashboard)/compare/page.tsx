'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { companyAPI, analysisAPI, reportAPI } from '@/lib/api';
import { Company, ComparisonResponse, Report } from '@/types';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { GitCompare, Loader2, BarChart3, X, Download, FileBarChart, FileText } from 'lucide-react';

export default function ComparePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await companyAPI.list();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error('Failed to load companies');
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const toggleCompany = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 4) {
        toast.warning('Maximum 4 companies for comparison');
        return prev;
      }
      return [...prev, id];
    });
  };

  const createReport = async (companyIds: number[]) => {
    setGeneratingReport(true);
    try {
      const rep = await reportAPI.generateComparison(companyIds);
      setReport(rep);
      return rep;
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to generate comparison report');
      return null;
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error('Select at least 2 companies');
      return;
    }
    setComparing(true);
    setResult(null);
    setReport(null);
    try {
      const res = await analysisAPI.compare(selectedIds);
      setResult(res);
      toast.success('Comparison complete');
      // Auto-generate the downloadable comparison report for this result
      await createReport(selectedIds);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await reportAPI.download(report.id, `comparison-report-${report.id}.pdf`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const comparedNames: string[] = result?.companyNames ? Object.values(result.companyNames) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Comparison</h1>
        <p className="text-muted-foreground mt-1">Select 2-4 companies to compare side by side</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Companies</CardTitle>
          <CardDescription>Click to select ({selectedIds.length}/4)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No companies found. Add companies first.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {companies.map((company) => {
                const selected = selectedIds.includes(company.id);
                return (
                  <button
                    key={company.id}
                    onClick={() => toggleCompany(company.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm truncate">{company.name}</span>
                      {selected && <X className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.ticker && <Badge variant="outline" className="mr-2 text-[10px]">{company.ticker}</Badge>}
                      {company.industry}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleCompare} disabled={selectedIds.length < 2 || comparing}>
              {comparing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitCompare className="h-4 w-4 mr-2" />}
              Compare {selectedIds.length} Companies
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Comparison Results
              </CardTitle>
              <div className="flex items-center gap-2">
                {generatingReport ? (
                  <Button variant="outline" size="sm" disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating report...
                  </Button>
                ) : report ? (
                  <Button size="sm" onClick={handleDownload} disabled={downloading}>
                    {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Download Report
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => createReport(selectedIds)} disabled={selectedIds.length < 2}>
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                )}
              </div>
            </div>
            {comparedNames.length > 0 && (
              <CardDescription className="flex flex-wrap items-center gap-2 pt-1">
                <span>Comparing:</span>
                {comparedNames.map((name, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                ))}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {report && (
              <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <FileBarChart className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{report.title}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">ready to download</span>
              </div>
            )}

            {result.comparison ? (
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <ReactMarkdown>{result.comparison}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No comparison narrative was generated.</p>
            )}

            {result.sources && result.sources.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Sources
                </h3>
                <ul className="space-y-1.5">
                  {result.sources.slice(0, 8).map((src: any, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary">[{i + 1}]</span>
                      <span>{src.documentTitle || src.document_title}
                        {src.pageNumber ? `, p. ${src.pageNumber}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
