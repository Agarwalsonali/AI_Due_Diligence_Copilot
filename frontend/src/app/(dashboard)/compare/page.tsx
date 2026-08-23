'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { companyAPI, analysisAPI } from '@/lib/api';
import { Company } from '@/types';
import { toast } from 'sonner';
import { GitCompare, Loader2, BarChart3, X } from 'lucide-react';

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

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error('Select at least 2 companies');
      return;
    }
    setComparing(true);
    try {
      const res = await analysisAPI.compare(selectedIds);
      setResult(res);
      toast.success('Comparison complete');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const selectedCompanies = companies.filter(c => selectedIds.includes(c.id));

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
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Comparison Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.comparisonPoints && result.comparisonPoints.length > 0 ? (
              <div className="space-y-4">
                {result.comparisonPoints.map((point: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 border">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{JSON.stringify(point, null, 2)}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Comparison data generated. Review the analysis results.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
