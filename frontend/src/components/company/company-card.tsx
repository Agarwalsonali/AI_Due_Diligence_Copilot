'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Company } from '@/types';
import { formatDate } from '@/lib/utils';

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link href={`/companies/${company.id}`}>
      <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
              {company.name}
            </CardTitle>
            {company.ticker && (
              <Badge variant="outline" className="font-mono text-xs">
                {company.ticker}
              </Badge>
            )}
          </div>
          <CardDescription className="flex items-center text-sm gap-2">
            <Building2 className="w-4 h-4" />
            <span>{company.industry || 'Unknown'}{company.sector ? ` • ${company.sector}` : ''}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{company.documentCount || 0} docs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{company.createdAt ? formatDate(company.createdAt) : 'Recently'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
