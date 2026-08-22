"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { documentAPI, companyAPI } from "@/lib/api";
import { Document, Company } from "@/types";
import { toast } from "sonner";
import { FileText, Search, Loader2, RefreshCw } from "lucide-react";
import { DocumentList } from "@/components/document/document-list";
import { UploadDialog } from "@/components/document/upload-dialog";

export default function DocumentsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await companyAPI.list();
        setCompanies(data.data || data || []);
      } catch (e) {
        toast.error("Failed to load companies");
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Documents</h1>
          <p className="text-slate-400 mt-1">Manage uploaded documents across all companies</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48 bg-slate-900 border-slate-800 text-slate-200">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-slate-200">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)} className="text-slate-200">
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Document Repository</CardTitle>
          <CardDescription className="text-slate-400">
            Upload and manage financial documents, filings, and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentList companyId={selectedCompany === "all" ? undefined : selectedCompany} />
        </CardContent>
      </Card>
    </div>
  );
}
