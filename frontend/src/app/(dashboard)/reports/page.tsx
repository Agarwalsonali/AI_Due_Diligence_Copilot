'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { companyAPI, reportAPI } from '@/lib/api';
import { Company, Report } from '@/types';
import { toast } from 'sonner';
import { notify } from '@/lib/notify';
import { FileBarChart, FileText, Plus, Clock, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesData, reportsData] = await Promise.all([
          companyAPI.list().catch(() => []),
          reportAPI.list().catch(() => []),
        ]);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setReports(Array.isArray(reportsData) ? reportsData : []);
      } catch (e) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGenerate = async () => {
    if (!selectedCompany) {
      toast.error('Select a company first');
      return;
    }
    setGenerating(true);
    try {
      const report = await reportAPI.generate(parseInt(selectedCompany));
      setReports(prev => [report, ...prev]);
      notify.success('Report generated successfully!', {
        description: report?.title || undefined,
        href: '/reports',
      });
    } catch (e: any) {
      notify.error('Failed to generate report', {
        description: e?.response?.data?.detail || undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id);
    try {
      await reportAPI.download(report.id, `report-${report.id}.pdf`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'generating': return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Generate and manage due diligence reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Generate New Report
          </CardTitle>
          <CardDescription>Select a company to generate a due diligence report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">Company</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.name} {company.ticker && `(${company.ticker})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!selectedCompany || generating} className="w-full sm:w-auto">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileBarChart className="h-4 w-4 mr-2" />}
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reports generated yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Select a company above to generate your first report</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1 basis-56">
                    <span className="shrink-0">{getStatusIcon(report.status)}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{report.title}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(report.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <Badge variant="outline" className={`text-xs ${
                      report.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      report.status === 'generating' ? 'bg-primary/10 text-primary border-primary/20' :
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {report.status}
                    </Badge>
                    {report.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id}
                      >
                        {downloadingId === report.id
                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          : <Download className="h-4 w-4 mr-2" />}
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
