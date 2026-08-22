'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { documentAPI } from '@/lib/api';

interface DocumentViewerProps {
  documentId: string;
  highlightPage?: number;
  highlightText?: string;
}

export function DocumentViewer({ documentId, highlightPage, highlightText }: DocumentViewerProps) {
  const [doc, setDoc] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [page, setPage] = useState(highlightPage || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      try {
        const data = await documentAPI.get(documentId);
        setDoc(data);
        setTotalPages(data.pageCount || 10); // Mocked pages
        
        // Fetch content for current page (mocked)
        setContent(`This is the content of ${data.title} on page ${page}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nFinancial Results:\nRevenue increased by 15% year-over-year to $4.2 billion.\nNet income was $850 million, up 12% from the prior year.\n\nRisk Factors:\nWe operate in a highly competitive market...`);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [documentId, page]);

  useEffect(() => {
    if (highlightPage) setPage(highlightPage);
  }, [highlightPage]);

  // Simple highlight logic
  const renderContent = () => {
    if (!highlightText || !content.includes(highlightText)) return content;
    const parts = content.split(highlightText);
    return (
      <>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i !== parts.length - 1 && <mark className="bg-yellow-500/40 text-white rounded px-1">{highlightText}</mark>}
          </React.Fragment>
        ))}
      </>
    );
  };

  if (loading && !doc) return <div className="animate-pulse h-full bg-slate-900 rounded-lg"></div>;

  return (
    <Card className="h-full flex flex-col bg-slate-900 border-slate-800 rounded-none border-x-0 border-y-0 sm:border sm:rounded-xl">
      <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <CardTitle className="text-sm font-medium text-slate-200 truncate">{doc?.title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setZoom(z => Math.max(50, z - 10))}><ZoomOut className="w-4 h-4" /></Button>
          <span className="text-xs text-slate-500 w-10 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setZoom(z => Math.min(200, z + 10))}><ZoomIn className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto p-6 bg-slate-950" style={{ fontSize: `${zoom}%` }}>
        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 p-8 shadow-sm min-h-full whitespace-pre-wrap text-slate-300 leading-relaxed font-serif">
          {loading ? 'Loading page...' : renderContent()}
        </div>
      </CardContent>
      
      <div className="p-2 border-t border-slate-800 bg-slate-900 flex justify-between items-center px-4">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-slate-700 bg-slate-800 text-slate-300">
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>
        <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-slate-700 bg-slate-800 text-slate-300">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
