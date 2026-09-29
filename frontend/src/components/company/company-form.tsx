'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { companyAPI } from '@/lib/api';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyFormProps {
  onSuccess?: () => void;
}

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer',
  'Industrial', 'Real Estate', 'Utilities', 'Materials', 'Communications'
];

export function CompanyForm({ onSuccess }: CompanyFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    industry: '',
    sector: '',
    description: '',
    website: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Company name is required');

    setLoading(true);
    try {
      await companyAPI.create(formData);
      toast.success('Company created successfully');
      setOpen(false);
      onSuccess?.();
      setFormData({ name: '', ticker: '', industry: '', sector: '', description: '', website: '' });
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to create company';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Apple Inc." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input id="ticker" value={formData.ticker}
                onChange={e => setFormData({ ...formData, ticker: e.target.value })}
                className="uppercase" placeholder="AAPL" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={formData.industry}
                onValueChange={val => setFormData({ ...formData, industry: val, sector: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px]" placeholder="Brief description of the company..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Saving...' : 'Add Company'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
