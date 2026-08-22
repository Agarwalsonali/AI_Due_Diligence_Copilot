"use client";

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileText, Activity, MessageSquare, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { companyAPI, documentAPI } from '@/lib/api';
import { Company, Document } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, documentsRes] = await Promise.all([
          companyAPI.list(),
          documentAPI.list()
        ]);
        setCompanies(companiesRes.data || []);
        setDocuments(documentsRes.data || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl bg-card border border-border p-8 shadow-sm">
        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {user?.name}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Your AI-powered due diligence workspace is ready. What would you like to analyze today?
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
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
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
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
            <CardTitle className="text-sm font-medium">Recent Analyses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/companies/new" className="block">
          <Card className="h-full bg-primary/5 hover:bg-primary/10 border-primary/20 transition-colors cursor-pointer group">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div className="font-medium">Analyze Company</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/documents" className="block">
          <Card className="h-full hover:bg-accent transition-colors cursor-pointer group">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="font-medium">Upload Document</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/compare" className="block">
          <Card className="h-full hover:bg-accent transition-colors cursor-pointer group">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="font-medium">Compare Companies</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/chat" className="block">
          <Card className="h-full hover:bg-accent transition-colors cursor-pointer group">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full space-y-3">
              <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform shadow-sm">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="font-medium">AI Research Chat</div>
            </CardContent>
          </Card>
        </Link>
      </div>

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
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No companies yet. Add one to get started.</div>
            ) : (
              <div className="space-y-4">
                {companies.slice(0, 5).map((company) => (
                  <div key={company.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center font-bold text-xs">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{company.name}</div>
                        <div className="text-xs text-muted-foreground">{company.industry || 'Unknown Industry'}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/companies/${company.id}`}>View</Link>
                    </Button>
                  </div>
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
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No documents uploaded yet.</div>
            ) : (
              <div className="space-y-4">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted/50">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-sm truncate max-w-[200px]">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      doc.processingStatus === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 
                      doc.processingStatus === 'FAILED' ? 'bg-red-500/10 text-red-500' : 
                      'bg-yellow-500/10 text-yellow-500 animate-pulse'
                    }`}>
                      {doc.processingStatus}
                    </div>
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
