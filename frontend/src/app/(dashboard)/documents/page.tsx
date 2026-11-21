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
import { PageHeader } from '@/components/layout/page-header';

export default function DocumentsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await companyAPI.list();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error('Failed to load companies');
      }
    };
    fetchCompanies();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage uploaded documents across all companies"
        actions={
          <>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-full sm:w-48">
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
          </>
        }
      />

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
