'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { documentAPI } from '@/lib/api';
import { Document } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface DocumentListProps {
  companyId?: string | number;
  limit?: number;
  hideActions?: boolean;
}

export function DocumentList({ companyId, limit, hideActions }: DocumentListProps) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const router = useRouter();

  const fetchDocs = useCallback(async () => {
    try {
      const data = await documentAPI.list(companyId);
      const list = Array.isArray(data) ? data : data?.documents || [];
      setDocs(limit ? list.slice(0, limit) : list);
    } catch (e) {
      console.error('Failed to load documents', e);
    } finally {
      setLoading(false);
    }
  }, [companyId, limit]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Poll for processing documents
  useEffect(() => {
    const hasProcessing = docs.some(d => d.processingStatus === 'processing' || d.processingStatus === 'uploaded');
    if (!hasProcessing) return;

    const interval = setInterval(fetchDocs, 3000);
    return () => clearInterval(interval);
  }, [docs, fetchDocs]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document and all its vectors?')) return;
    setDeleting(id);
    try {
      await documentAPI.delete(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted');
    } catch (e) {
      toast.error('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Completed</Badge>;
      case 'processing':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            Processing
          </Badge>
        );
      case 'failed':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>;
      default:
        return <Badge variant="outline">Uploaded</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  if (!docs.length) {
    return (
      <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Pages</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            {!hideActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map(doc => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="line-clamp-1">{doc.title}</span>
                    {doc.errorMessage && (
                      <span className="text-xs text-destructive line-clamp-1 block mt-0.5">{doc.errorMessage}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{doc.documentType || 'Other'}</TableCell>
              <TableCell>{getStatusBadge(doc.processingStatus)}</TableCell>
              <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{doc.pageCount || '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                {doc.createdAt ? formatDate(doc.createdAt) : '—'}
              </TableCell>
              {!hideActions && (
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    {deleting === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
