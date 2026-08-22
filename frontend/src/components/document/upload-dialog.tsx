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
  companyId?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!file || !companyId) return toast.error('File and company selection required');
    
    setUploading(true);
    setProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('document_type', docType);
    if (filingDate) formData.append('filing_date', filingDate);
    formData.append('company_id', companyId);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 200);

      await documentAPI.upload(formData);
      
      clearInterval(interval);
      setProgress(100);
      toast.success('Document uploaded and processing started');
      
      setTimeout(() => {
        setOpen(false);
        reset();
        onSuccess?.();
      }, 500);
    } catch (e) {
      toast.error('Upload failed');
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
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UploadCloud className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload Document for Analysis</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {!file ? (
            <div 
              className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center hover:bg-slate-800/50 hover:border-blue-500 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-300 font-medium mb-1">Click or drag file to upload</p>
              <p className="text-slate-500 text-sm">Supports PDF, DOCX, TXT (Max 50MB)</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.docx,.txt"
                onChange={e => e.target.files && handleFileSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-950 p-2 rounded text-blue-400 mr-3">
                  <File className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200 line-clamp-1">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-400">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="title">Document Title</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-950 border-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Filing Date</Label>
                <Input id="date" type="date" value={filingDate} onChange={e => setFilingDate(e.target.value)} className="bg-slate-950 border-slate-800" />
              </div>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading & Processing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-700 bg-transparent" disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading || !title} className="bg-blue-600 hover:bg-blue-700">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {uploading ? 'Processing' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
