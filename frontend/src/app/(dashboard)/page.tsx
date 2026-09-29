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
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'processing': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <section className="relative overflow-hidden rounded-xl bg-card border border-border p-8 shadow-sm">
        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Welcome back, {user?.name}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Your AI-powered due diligence workspace is ready. Analyze companies, review financials, and uncover risks.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{companies.length}</div>
            )}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{documents.length}</div>
            )}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">
                {documents.filter(d => d.processingStatus === 'completed').length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/companies" className="block group">
          <Card className="h-full bg-primary/5 hover:bg-primary/10 border-primary/20 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="font-medium text-sm">Analyze Company</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/documents" className="block group">
          <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">Upload Document</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/compare" className="block group">
          <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">Compare Companies</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/chat" className="block group">
          <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">AI Research Chat</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
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
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{company.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {company.ticker && <span className="mr-2 font-mono">{company.ticker}</span>}
                          {company.industry || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
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
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-sm truncate max-w-[200px]">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.documentType} {doc.createdAt && `• ${formatDate(doc.createdAt)}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(doc.processingStatus)}`}>
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
