"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { companyAPI, analysisAPI } from "@/lib/api";
import { Company } from "@/types";
import { toast } from "sonner";
import { GitCompare, Loader2, BarChart3, Plus, X } from "lucide-react";
import { ComparisonChart } from "@/components/financial/comparison-chart";

export default function ComparePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<any>(null);

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

  const toggleCompany = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 4) {
        toast.warning("Maximum 4 companies for comparison");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error("Select at least 2 companies");
      return;
    }
    setComparing(true);
    try {
      const res = await analysisAPI.compare(selectedIds);
      setResult(res.data || res);
      toast.success("Comparison complete");
    } catch (e) {
      toast.error("Comparison failed");
    } finally {
      setComparing(false);
    }
  };

  const selectedCompanies = companies.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Company Comparison</h1>
        <p className="text-slate-400 mt-1">Select 2-4 companies to compare side by side</p>
      </div>

      {/* Company Selection */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Select Companies</CardTitle>
          <CardDescription className="text-slate-400">
            Click to select ({selectedIds.length}/4 selected)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No companies found. Add companies first.</div>
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
                        ? "border-blue-500 bg-blue-950/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-slate-200">{company.name}</span>
                      {selected && <X className="h-4 w-4 text-blue-400" />}
                    </div>
                    <div className="text-xs text-slate-500">
                      {company.ticker && <Badge variant="outline" className="mr-2 text-[10px] bg-slate-800 border-slate-700">{company.ticker}</Badge>}
                      {company.industry}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleCompare}
              disabled={selectedIds.length < 2 || comparing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {comparing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitCompare className="h-4 w-4 mr-2" />
              )}
              Compare {selectedIds.length} Companies
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Comparison Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.comparison && (
              <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{result.comparison}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
