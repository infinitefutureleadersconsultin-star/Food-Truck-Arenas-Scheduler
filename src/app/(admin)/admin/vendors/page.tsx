'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Eye,
  MessageSquare,
  UserCheck,
  UserX,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import {
  getAllVendors,
  updateVendorStatus,
  deleteUser,
} from '@/lib/services/userService';
import { formatDate } from '@/lib/utils/dateUtils';
import type { User, UserStatus } from '@/lib/types';

const ITEMS_PER_PAGE = 10;

type SortField = 'displayName' | 'businessName' | 'status' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

export default function VendorsPage() {
  const router = useRouter();

  // Data
  const [vendors, setVendors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('businessName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    variant: 'default' | 'destructive';
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk selection
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(
    new Set()
  );

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllVendors();
      setVendors(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch vendors.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Filtered and sorted vendors
  const filteredVendors = useMemo(() => {
    let filtered = [...vendors];

    // Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.displayName.toLowerCase().includes(lowerSearch) ||
          v.businessName.toLowerCase().includes(lowerSearch) ||
          v.email.toLowerCase().includes(lowerSearch)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'displayName':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'businessName':
          comparison = a.businessName.localeCompare(b.businessName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'lastLoginAt':
          comparison =
            (a.lastLoginAt?.seconds ?? 0) - (b.lastLoginAt?.seconds ?? 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [vendors, search, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVendors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVendors, currentPage]);

  // Sort handler
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  // Actions
  const handleApprove = useCallback(
    (vendor: User) => {
      setConfirmAction({
        title: 'Approve Vendor',
        description: `Are you sure you want to approve ${vendor.businessName}? They will gain access to book resources.`,
        variant: 'default',
        action: async () => {
          await updateVendorStatus(vendor.id, 'active');
          await fetchVendors();
        },
      });
      setConfirmOpen(true);
    },
    [fetchVendors]
  );

  const handleSuspend = useCallback(
    (vendor: User) => {
      setConfirmAction({
        title: 'Suspend Vendor',
        description: `Are you sure you want to suspend ${vendor.businessName}? They will lose access to book resources.`,
        variant: 'destructive',
        action: async () => {
          await updateVendorStatus(vendor.id, 'suspended');
          await fetchVendors();
        },
      });
      setConfirmOpen(true);
    },
    [fetchVendors]
  );

  const handleRemove = useCallback(
    (vendor: User) => {
      setConfirmAction({
        title: 'Remove Vendor',
        description: `Are you sure you want to permanently remove ${vendor.businessName}? This action cannot be undone.`,
        variant: 'destructive',
        action: async () => {
          await deleteUser(vendor.id);
          await fetchVendors();
        },
      });
      setConfirmOpen(true);
    },
    [fetchVendors]
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await confirmAction.action();
      setConfirmOpen(false);
      setConfirmAction(null);
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  }, [confirmAction]);

  // Bulk actions
  const handleBulkSuspend = useCallback(async () => {
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedVendors).map((id) => updateVendorStatus(id, 'suspended'))
      );
      setSelectedVendors(new Set());
      await fetchVendors();
    } catch (err) {
      console.error('Bulk suspend failed:', err);
    } finally {
      setActionLoading(false);
    }
  }, [selectedVendors, fetchVendors]);

  const toggleSelectAll = useCallback(() => {
    if (selectedVendors.size === paginatedVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(paginatedVendors.map((v) => v.id)));
    }
  }, [selectedVendors, paginatedVendors]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-600">Error loading vendors: {error}</p>
        <Button variant="outline" onClick={fetchVendors}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
        {selectedVendors.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Bulk Actions ({selectedVendors.size})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleBulkSuspend}>
                <UserX className="mr-2 h-4 w-4" />
                Suspend Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search vendors by name, business, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredVendors.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No vendors found"
              description="No vendors match your current filters."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedVendors.size === paginatedVendors.length &&
                          paginatedVendors.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-gray-700"
                        onClick={() => handleSort('displayName')}
                      >
                        Name
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-gray-700"
                        onClick={() => handleSort('businessName')}
                      >
                        Business
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-gray-700"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedVendors.has(vendor.id)}
                          onChange={() => toggleSelect(vendor.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          className="font-medium text-blue-600 hover:underline"
                          onClick={() =>
                            router.push(`/admin/vendors/${vendor.id}`)
                          }
                        >
                          {vendor.displayName}
                        </button>
                      </TableCell>
                      <TableCell>{vendor.businessName}</TableCell>
                      <TableCell>
                        <StatusBadge status={vendor.status} type="user" />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {vendor.lastLoginAt
                          ? formatDate(
                              vendor.lastLoginAt.toDate(),
                              'MMM d, yyyy'
                            )
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View vendor"
                            onClick={() =>
                              router.push(`/admin/vendors/${vendor.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {vendor.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Approve vendor"
                              onClick={() => handleApprove(vendor)}
                            >
                              <UserCheck className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          {vendor.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Suspend vendor"
                              onClick={() => handleSuspend(vendor)}
                            >
                              <UserX className="h-4 w-4 text-yellow-500" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/admin/vendors/${vendor.id}`)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push('/admin/communications')
                                }
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleRemove(vendor)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Vendor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmAction.title}
          description={confirmAction.description}
          variant={confirmAction.variant}
          onConfirm={handleConfirm}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
