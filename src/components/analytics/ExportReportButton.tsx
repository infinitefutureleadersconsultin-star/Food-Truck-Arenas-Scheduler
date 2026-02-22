'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportReportButtonProps {
  data: any[];
  filename: string;
  label?: string;
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map((h) => `"${h}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      const stringVal = String(val).replace(/"/g, '""');
      return `"${stringVal}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function ExportReportButton({
  data,
  filename,
  label = 'Export CSV',
}: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      const csv = convertToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={data.length === 0 || isExporting}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? 'Exporting...' : label}
    </Button>
  );
}
