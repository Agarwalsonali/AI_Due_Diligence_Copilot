'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileText, MessageSquare, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { companyAPI, documentAPI } from '@/lib/api';
import { Company, Document } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesData, documentsData] = await Promise.all([
          companyAPI.list().catch(() => []),
          documentAPI.list().catch(() => []),
        ]);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setDocuments(Array.isArray(documentsData) ? documentsData : []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'processing': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-8">
      {/* The dashboard uses the same heading block as every other page. */}
      <PageHeader
        title={`Welcome back, ${user?.name ?? ''}`}
        description="Your due diligence workspace is ready. Analyze companies, review financials and track risks from one place."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="transition-colors hover:border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-cy="stat-companies">{companies.length}</div>
            )}
          </CardContent>
        </Card>
        <Card className="transition-colors hover:border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-cy="stat-documents">{documents.length}</div>
            )}
          </CardContent>
        </Card>
        <Card className="transition-colors hover:border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-cy="stat-processed">
                {documents.filter(d => d.processingStatus === 'completed').length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/companies" className="block group">
          <Card className="h-full cursor-pointer border-primary/20 bg-primary/5 transition-[transform,border-color] duration-200 ease-standard group-hover:-translate-y-0.5 group-hover:border-primary/40">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-lg border border-border">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="font-medium text-sm">Analyze Company</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/documents" className="block group">
          <Card className="h-full cursor-pointer transition-[transform,border-color] duration-200 ease-standard group-hover:-translate-y-0.5 group-hover:border-primary/40">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-lg border border-border">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">Upload Document</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/compare" className="block group">
          <Card className="h-full cursor-pointer transition-[transform,border-color] duration-200 ease-standard group-hover:-translate-y-0.5 group-hover:border-primary/40">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-lg border border-border">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">Compare Companies</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/chat" className="block group">
          <Card className="h-full cursor-pointer transition-[transform,border-color] duration-200 ease-standard group-hover:-translate-y-0.5 group-hover:border-primary/40">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-lg border border-border">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">AI Research Chat</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Companies</CardTitle>
              <CardDescription>Latest profiles analyzed</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/companies">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No companies yet. Add one to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {companies.slice(0, 5).map((company) => (
                  <Link key={company.id} href={`/companies/${company.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    {/* The text column takes the leftover width and truncates, so a
                        long industry name cannot wrap into a tall word tower on
                        phones; the doc count only has room from sm up. */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{company.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {company.ticker && <span className="mr-2 font-mono">{company.ticker}</span>}
                          {company.industry || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                      {company.documentCount || 0} docs
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>Latest files processed</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/documents">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.slice(0, 5).map((doc) => (                   <div key={doc.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 shrink-0 rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate max-w-full sm:max-w-[200px]">{doc.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {doc.documentType} {doc.createdAt && `• ${formatDate(doc.createdAt)}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 hidden sm:inline-flex ${getStatusColor(doc.processingStatus)}`}>
                      {doc.processingStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
