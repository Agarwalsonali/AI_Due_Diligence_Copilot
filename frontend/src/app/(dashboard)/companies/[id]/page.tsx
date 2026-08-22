'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Trash2, FileText, Activity, AlertTriangle, Lightbulb, MessageSquare, Download } from 'lucide-react';
import Link from 'next/link';
import { companyAPI, analysisAPI, reportAPI } from '@/lib/api';
import { Company, FinancialMetric, FinancialRatios } from '@/types';
import { toast } from 'sonner';

import { MetricsCards } from '@/components/company/metrics-cards';
import { UploadDialog } from '@/components/document/upload-dialog';
import { DocumentList } from '@/components/document/document-list';
import { ChatInterface } from '@/components/chat/chat-interface';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [financials, setFinancials] = useState<{ metrics: FinancialMetric[], ratios: FinancialRatios } | null>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [compData, finData, riskData, oppData] = await Promise.all([
          companyAPI.get(id),
          analysisAPI.financials(id).catch(() => null),
          analysisAPI.risks(id).catch(() => []),
          analysisAPI.opportunities(id).catch(() => [])
        ]);
        setCompany(compData);
        setFinancials(finData);
        setRisks(riskData);
        setOpportunities(oppData);
      } catch (error) {
        toast.error('Failed to load company details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    try {
      await companyAPI.delete(id);
      toast.success('Company deleted');
      router.push('/companies');
    } catch (e) {
      toast.error('Failed to delete company');
    }
  };

  const generateReport = async () => {
    toast.info('Generating report...');
    try {
      const res = await reportAPI.generate(id);
      toast.success('Report generated successfully');
      // trigger download
      window.open(res.url, '_blank');
    } catch (e) {
      toast.error('Failed to generate report');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;
  if (!company) return <div className="p-8 text-center text-red-400">Company not found</div>;

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/companies">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{company.name}</h1>
                {company.ticker && (
                  <Badge variant="outline" className="bg-blue-950/40 text-blue-400 border-blue-800">
                    {company.ticker}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">{company.industry} • {company.sector}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDelete} className="border-red-900/50 text-red-500 hover:bg-red-950 hover:text-red-400">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
            <Button onClick={generateReport} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> Generate Report
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 mb-6 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"><Activity className="w-4 h-4 mr-2"/>Overview</TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"><FileText className="w-4 h-4 mr-2"/>Documents</TabsTrigger>
              <TabsTrigger value="financials" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"><Activity className="w-4 h-4 mr-2"/>Financials</TabsTrigger>
              <TabsTrigger value="risks" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"><AlertTriangle className="w-4 h-4 mr-2"/>Risks</TabsTrigger>
              <TabsTrigger value="opportunities" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"><Lightbulb className="w-4 h-4 mr-2"/>Opportunities</TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"><MessageSquare className="w-4 h-4 mr-2"/>Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <MetricsCards metrics={financials?.metrics} ratios={financials?.ratios} />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-2 bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">AI Assessment Summary</CardTitle>
                    <CardDescription className="text-slate-400">Generated from available documentation</CardDescription>
                  </CardHeader>
                  <CardContent className="text-slate-300 leading-relaxed space-y-4">
                    <p>{company.description || 'No description available.'}</p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" className="border-blue-800 text-blue-400 hover:bg-blue-950">Generate New Summary</Button>
                      <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800">View Full Assessment</Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentList companyId={id} limit={5} hideActions />
                    <Button variant="link" className="w-full mt-4 text-blue-400" onClick={() => document.querySelector<HTMLButtonElement>('[value="documents"]')?.click()}>
                      View All Documents
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Documents Repository</CardTitle>
                    <CardDescription className="text-slate-400">Manage 10-Ks, earnings reports, and other filings</CardDescription>
                  </div>
                  <UploadDialog companyId={id} />
                </CardHeader>
                <CardContent>
                  <DocumentList companyId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financials" className="space-y-6">
              <MetricsCards metrics={financials?.metrics} ratios={financials?.ratios} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Revenue & Income</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {financials?.metrics ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financials.metrics.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                          <Bar dataKey="netIncome" fill="#10b981" name="Net Income" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Debt vs Cash</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {financials?.metrics ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={financials.metrics.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                          <Legend />
                          <Line type="monotone" dataKey="debt" stroke="#ef4444" name="Total Debt" />
                          <Line type="monotone" dataKey="cash" stroke="#06b6d4" name="Cash & Equivalents" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="risks">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Risk Analysis</h2>
                <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-300">
                  <RefreshCw className="w-4 h-4 mr-2" /> Re-analyze Risks
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {risks.length > 0 ? risks.map((risk, idx) => (
                  <Card key={idx} className="bg-slate-900 border-slate-800 border-l-4" style={{ borderLeftColor: risk.severity === 'CRITICAL' ? '#ef4444' : risk.severity === 'HIGH' ? '#f97316' : risk.severity === 'MEDIUM' ? '#eab308' : '#22c55e' }}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <Badge variant="outline" className="text-slate-300 border-slate-700">{risk.category}</Badge>
                        <Badge variant="outline" className={risk.severity === 'CRITICAL' ? 'bg-red-950 text-red-500 border-red-900' : 'bg-slate-800 text-slate-400'}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-white mt-2">{risk.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-400 text-sm mb-4">{risk.description}</p>
                      <div className="text-xs text-slate-500 bg-slate-950 p-2 rounded border border-slate-800">
                        <strong className="text-slate-400">Source:</strong> {risk.evidence}
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="col-span-2 text-center p-12 bg-slate-900 border-slate-800 rounded-xl text-slate-400">
                    No risk data identified yet. Upload documents and run analysis.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="opportunities">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.length > 0 ? opportunities.map((opp, idx) => (
                  <Card key={idx} className="bg-slate-900 border-slate-800 border-l-4 border-l-cyan-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <Badge variant="outline" className="text-cyan-400 border-cyan-900 bg-cyan-950/30">{opp.category}</Badge>
                        <span className="text-xs text-slate-500">Confidence: {opp.confidenceScore}%</span>
                      </div>
                      <CardTitle className="text-lg text-white mt-2">{opp.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4">
                        <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${opp.confidenceScore}%` }}></div>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">{opp.description}</p>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="col-span-2 text-center p-12 bg-slate-900 border-slate-800 rounded-xl text-slate-400">
                    No opportunities identified yet.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="chat" className="h-[600px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <ChatInterface companyId={id} />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
