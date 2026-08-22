'use client';

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Eye, Loader2 } from 'lucide-react';
import { documentAPI } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DocumentListProps {
  companyId?: string;
  limit?: number;
  hideActions?: boolean;
}

export function DocumentList({ companyId, limit, hideActions }: DocumentListProps) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      const res = await documentAPI.list(companyId);
      const data = res.data || res;
      setDocs(limit ? data.slice(0, limit) : data);
    } catch (e) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    
    // Polling if any docs are processing
    const interval = setInterval(() => {
      // check if still processing (placeholder)
    }, 5000);
    
    return () => clearInterval(interval);
  }, [companyId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentAPI.delete(id);
      setDocs(docs.filter(d => d.id !== id));
      toast.success('Document deleted');
    } catch (e) {
      toast.error('Failed to delete document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <Badge className="bg-emerald-950/50 text-emerald-500 border-emerald-900/50">Completed</Badge>;
      case 'processing': return <Badge className="bg-blue-950/50 text-blue-500 border-blue-900/50 flex items-center gap-1"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>Processing</Badge>;
      case 'failed': return <Badge className="bg-red-950/50 text-red-500 border-red-900/50">Failed</Badge>;
      default: return <Badge className="bg-yellow-950/50 text-yellow-500 border-yellow-900/50">Uploaded</Badge>;
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>;
  if (!docs.length) return <div className="text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-lg">No documents found.</div>;

  return (
    <div className="border border-slate-800 rounded-md overflow-hidden bg-slate-900/30">
      <Table>
        <TableHeader className="bg-slate-900">
          <TableRow className="border-slate-800 hover:bg-slate-900">
            <TableHead className="text-slate-400">Document</TableHead>
            <TableHead className="text-slate-400">Type</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400 hidden md:table-cell">Date</TableHead>
            {!hideActions && <TableHead className="text-right text-slate-400">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map(doc => (
            <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-800/50">
              <TableCell className="font-medium text-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  <span className="line-clamp-1">{doc.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-slate-400 text-sm">{doc.document_type || 'Other'}</TableCell>
              <TableCell>{getStatusBadge(doc.processingStatus)}</TableCell>
              <TableCell className="text-slate-400 text-sm hidden md:table-cell">
                {doc.filing_date ? format(new Date(doc.filing_date), 'MMM d, yyyy') : 'N/A'}
              </TableCell>
              {!hideActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-400">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-950/30">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
