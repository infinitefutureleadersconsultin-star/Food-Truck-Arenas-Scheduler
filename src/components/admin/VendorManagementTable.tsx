'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  Ban,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import type { User, UserStatus } from '@/lib/types';

interface VendorManagementTableProps {
  vendors: User[];
  onApprove?: (vendorId: string) => void;
  onSuspend?: (vendorId: string) => void;
  onRemove?: (vendorId: string) => void;
  onView?: (vendorId: string) => void;
}

type SortField = 'displayName' | 'businessName' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const statusBadgeMap: Record<UserStatus, { variant: string; className: string }> = {
  active: { variant: 'success', className: 'bg-green-100 text-green-800' },
  suspended: { variant: 'destructive', className: 'bg-red-100 text-red-800' },
  pending: { variant: 'warning', className: 'bg-yellow-100 text-yellow-800' },
};

export function VendorManagementTable({
  vendors,
  onApprove,
  onSuspend,
  onRemove,
  onView,
}: VendorManagementTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('displayName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = vendors.filter(
      (v) =>
        v.displayName.toLowerCase().includes(query) ||
        v.businessName.toLowerCase().includes(query) ||
        v.email.toLowerCase().includes(query)
    );

    filtered.sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      switch (sortField) {
        case 'displayName':
          compareA = a.displayName.toLowerCase();
          compareB = b.displayName.toLowerCase();
          break;
        case 'businessName':
          compareA = a.businessName.toLowerCase();
          compareB = b.businessName.toLowerCase();
          break;
        case 'status':
          compareA = a.status;
          compareB = b.status;
          break;
        case 'createdAt':
          compareA = a.createdAt?.toMillis?.() ?? 0;
          compareB = b.createdAt?.toMillis?.() ?? 0;
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [vendors, searchQuery, sortField, sortDirection]);

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={cn(
            'h-3 w-3',
            sortField === field ? 'text-gray-900' : 'text-gray-400'
          )}
        />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search vendors by name, business, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="displayName">Name</SortableHeader>
            <SortableHeader field="businessName">Business</SortableHeader>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <SortableHeader field="status">Status</SortableHeader>
            <TableHead>Vehicle</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSorted.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell className="font-medium">
                {vendor.displayName}
              </TableCell>
              <TableCell>{vendor.businessName}</TableCell>
              <TableCell className="text-gray-500">{vendor.email}</TableCell>
              <TableCell className="text-gray-500">{vendor.phone}</TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    'capitalize',
                    statusBadgeMap[vendor.status]?.className ||
                      'bg-gray-100 text-gray-800'
                  )}
                >
                  {vendor.status}
                </Badge>
              </TableCell>
              <TableCell className="capitalize text-gray-500">
                {vendor.vehicleSize}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView?.(vendor.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {vendor.status === 'pending' && (
                      <DropdownMenuItem
                        onClick={() => onApprove?.(vendor.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        Approve
                      </DropdownMenuItem>
                    )}
                    {vendor.status === 'active' && (
                      <DropdownMenuItem
                        onClick={() => onSuspend?.(vendor.id)}
                      >
                        <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                    {vendor.status === 'suspended' && (
                      <DropdownMenuItem
                        onClick={() => onApprove?.(vendor.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        Reactivate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => onRemove?.(vendor.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {filteredAndSorted.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-sm text-gray-500 py-8"
              >
                {searchQuery
                  ? 'No vendors match your search.'
                  : 'No vendors found.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Results count */}
      <div className="text-xs text-gray-500">
        Showing {filteredAndSorted.length} of {vendors.length} vendors
      </div>
    </div>
  );
}
