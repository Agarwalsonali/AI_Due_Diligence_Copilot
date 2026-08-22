'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Company } from '@/types';
import { format } from 'date-fns';

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link href={`/companies/${company.id}`}>
      <Card className="h-full bg-slate-900 border-slate-800 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
              {company.name}
            </CardTitle>
            <Badge variant="outline" className="bg-blue-950/30 text-blue-400 border-blue-800 font-mono">
              {company.ticker || 'N/A'}
            </Badge>
          </div>
          <CardDescription className="flex items-center text-slate-400 text-sm gap-2">
            <Building2 className="w-4 h-4" />
            <span>{company.industry} • {company.sector}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-slate-500 mt-4">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-500" />
              <span className="text-slate-300">{company.documentCount || 0} Docs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{company.createdAt ? format(new Date(company.createdAt), 'MMM d, yyyy') : 'Recently'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
