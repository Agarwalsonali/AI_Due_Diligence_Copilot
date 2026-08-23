'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { documentAPI } from '@/lib/api';
import { toast } from 'sonner';

interface UploadDialogProps {
  companyId?: string | number;
  onSuccess?: () => void;
}

const DOC_TYPES = ['10-K', '10-Q', 'Annual Report', 'Earnings', 'Presentation', 'Other'];

export function UploadDialog({ companyId, onSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('Other');
  const [filingDate, setFilingDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (f: File) => {
    setError('');
    // Validate extension
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      setError('Only PDF, DOCX, and TXT files are supported.');
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!file || !companyId) return toast.error('File and company selection required');

    setUploading(true);
    setProgress(10);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', String(companyId));
    formData.append('document_type', docType);
    formData.append('title', title || file.name);
    if (filingDate) formData.append('filing_date', filingDate);

    try {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 90));
      }, 300);

      await documentAPI.upload(formData);

      clearInterval(interval);
      setProgress(100);
      toast.success('Document uploaded and processing started');

      setTimeout(() => {
        setOpen(false);
        reset();
        onSuccess?.();
      }, 500);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setDocType('Other');
    setFilingDate('');
    setProgress(0);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              className="border-2 border-dashed rounded-xl p-10 text-center hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Click or drag a file to upload</p>
              <p className="text-muted-foreground text-sm">Supports PDF, DOCX, TXT</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={e => e.target.files && handleFileSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="bg-muted/30 border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <File className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium line-clamp-1">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setFile(null); setError(''); }} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="title">Document Title</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter a title..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Filing Date</Label>
                <Input id="date" type="date" value={filingDate} onChange={e => setFilingDate(e.target.value)} />
              </div>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading & Processing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading || !title}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
