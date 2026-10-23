'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { companyAPI } from '@/lib/api';
import { Company } from '@/types';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { DocumentList } from '@/components/document/document-list';
import { UploadDialog } from '@/components/document/upload-dialog';

export default function DocumentsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage uploaded documents across all companies</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Pre-select the filtered company when one is chosen */}
          <UploadDialog
            key={selectedCompany}
            companyId={selectedCompany === 'all' ? undefined : selectedCompany}
            onSuccess={() => setRefreshToken(t => t + 1)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Repository</CardTitle>
          <CardDescription>
            Upload and manage financial documents, filings, and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentList companyId={selectedCompany === 'all' ? undefined : selectedCompany} refreshToken={refreshToken} />
        </CardContent>
      </Card>
    </div>
  );
}
