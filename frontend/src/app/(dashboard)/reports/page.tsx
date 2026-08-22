"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { companyAPI, reportAPI } from "@/lib/api";
import { Company, Report } from "@/types";
import { toast } from "sonner";
import { FileBarChart, Download, Loader2, FileText, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const compRes = await companyAPI.list();
        setCompanies(compRes.data || compRes || []);
      } catch (e) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGenerate = async () => {
    if (!selectedCompany) {
      toast.error("Select a company first");
      return;
    }
    setGenerating(true);
    try {
      const res = await reportAPI.generate(parseInt(selectedCompany));
      const report = res.data || res;
      setReports((prev) => [report, ...prev]);
      toast.success("Report generated successfully!");
    } catch (e) {
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId: number) => {
    try {
      const res = await reportAPI.download(reportId);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Download failed");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "generating":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
        <p className="text-slate-400 mt-1">Generate and manage due diligence reports</p>
      </div>

      {/* Generate Report */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-400" />
            Generate New Report
          </CardTitle>
          <CardDescription className="text-slate-400">
            Select a company to generate a comprehensive due diligence report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm text-slate-400 mb-2 block">Company</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)} className="text-slate-200">
                      {company.name} {company.ticker && `(${company.ticker})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!selectedCompany || generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileBarChart className="h-4 w-4 mr-2" />
              )}
              {generating ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report History */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No reports generated yet</p>
              <p className="text-sm text-slate-600 mt-1">Select a company above to generate your first report</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.status)}
                    <div>
                      <div className="font-medium text-sm text-slate-200">{report.title}</div>
                      <div className="text-xs text-slate-500">{formatDate(report.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${
                      report.status === "completed" ? "bg-emerald-950/50 text-emerald-500 border-emerald-900" :
                      report.status === "generating" ? "bg-blue-950/50 text-blue-500 border-blue-900" :
                      "bg-red-950/50 text-red-500 border-red-900"
                    }`}>
                      {report.status}
                    </Badge>
                    {report.status === "completed" && (
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(report.id)} className="text-slate-400 hover:text-blue-400">
                        <Download className="h-4 w-4 mr-1" /> Download
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
