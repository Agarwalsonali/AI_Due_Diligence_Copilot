'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { documentAPI } from '@/lib/api';
import { Document } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentViewerProps {
  documentId: string | number;
  highlightPage?: number;
  highlightText?: string;
}

export function DocumentViewer({ documentId, highlightPage, highlightText }: DocumentViewerProps) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [page, setPage] = useState(highlightPage || 1);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      try {
        const data = await documentAPI.get(documentId);
        setDoc(data);
      } catch (e) {
        console.error('Failed to load document', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [documentId]);

  useEffect(() => {
    if (highlightPage) setPage(highlightPage);
  }, [highlightPage]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const totalPages = doc?.pageCount || 1;

  return (
    <Card className="flex flex-col">
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <CardTitle className="text-sm font-medium truncate">{doc?.title}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(50, z - 10))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(200, z + 10))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-6" style={{ fontSize: `${zoom}%` }}>
        <div className="max-w-4xl mx-auto bg-muted/30 border rounded-lg p-8 min-h-[400px]">
          <div className="text-sm text-muted-foreground">
            Document viewer placeholder. Page {page} of {totalPages}.
            <br /><br />
            In production, this would render the actual PDF content or extracted text.
          </div>
        </div>
      </CardContent>

      <div className="p-2 border-t flex justify-between items-center px-4">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
