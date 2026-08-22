'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CompanyCard } from '@/components/company/company-card';
import { CompanyForm } from '@/components/company/company-form';
import { companyAPI } from '@/lib/api';
import { Company } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await companyAPI.list(search);
      setCompanies(data);
    } catch (error) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchCompanies]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Companies</h1>
          <p className="text-slate-400 mt-1">Manage and analyze target companies</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search companies..."
              className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-blue-500 text-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchCompanies} 
            disabled={loading}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <CompanyForm onSuccess={fetchCompanies} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden p-6 flex flex-col justify-between">
              <div>
                <Skeleton className="h-6 w-3/4 bg-slate-800 mb-2" />
                <Skeleton className="h-4 w-1/2 bg-slate-800" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/4 bg-slate-800" />
                <Skeleton className="h-4 w-1/4 bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {companies.map(company => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <div className="bg-slate-800/50 p-4 rounded-full mb-4">
            <Briefcase className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-slate-200 mb-1">No companies found</h3>
          <p className="text-slate-500 mb-6 max-w-sm">
            {search ? 'Try adjusting your search query' : 'Get started by adding your first target company for due diligence.'}
          </p>
          {!search && <CompanyForm onSuccess={fetchCompanies} />}
        </div>
      )}
    </div>
  );
}
