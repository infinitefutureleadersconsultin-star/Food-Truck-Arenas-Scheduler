'use client';

import { useState, useCallback } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Wrench,
  Lock,
  Package,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import { useResourceTypes } from '@/lib/hooks/useResourceTypes';
import { useResources } from '@/lib/hooks/useResources';
import {
  createResourceType,
  updateResourceType,
  updateResource,
  updateResourceStatus,
  addResourcesToType,
} from '@/lib/services/resourceService';
import { formatResourceStatus } from '@/lib/utils/formatters';
import type { Resource, ResourceType, ResourceStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  const variants: Record<ResourceStatus, { variant: 'success' | 'info' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
    available: { variant: 'success', label: 'Available' },
    in_use: { variant: 'info', label: 'In Use' },
    maintenance: { variant: 'warning', label: 'Maintenance' },
    broken: { variant: 'destructive', label: 'Broken' },
    locked: { variant: 'secondary', label: 'Locked' },
  };

  const config = variants[status] ?? { variant: 'secondary' as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResourcesPage() {
  const { resourceTypes, loading: typesLoading, error: typesError } = useResourceTypes();
  const { resources, loading: resourcesLoading, error: resourcesError } = useResources();

  const loading = typesLoading || resourcesLoading;
  const error = typesError || resourcesError;

  // Expanded resource types
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Resource type dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ResourceType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeIcon, setTypeIcon] = useState('Package');
  const [typeColor, setTypeColor] = useState('#3B82F6');
  const [typeQuantity, setTypeQuantity] = useState(1);
  const [typeTrackIndividually, setTypeTrackIndividually] = useState(true);

  // Individual resource dialog
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceName, setResourceName] = useState('');
  const [resourceLabel, setResourceLabel] = useState('');
  const [resourceStatus, setResourceStatus] = useState<ResourceStatus>('available');
  const [resourceLocation, setResourceLocation] = useState('');
  const [resourceNotes, setResourceNotes] = useState('');

  // Saving state
  const [saving, setSaving] = useState(false);

  // Toggle expansion
  const toggleExpanded = useCallback((typeId: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  }, []);

  // Get resources for a specific type
  const getResourcesForType = useCallback(
    (typeId: string) => resources.filter((r) => r.typeId === typeId),
    [resources]
  );

  // Open type dialog for create
  const openCreateTypeDialog = useCallback(() => {
    setEditingType(null);
    setTypeName('');
    setTypeIcon('Package');
    setTypeColor('#3B82F6');
    setTypeQuantity(1);
    setTypeTrackIndividually(true);
    setTypeDialogOpen(true);
  }, []);

  // Open type dialog for edit
  const openEditTypeDialog = useCallback((type: ResourceType) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeIcon(type.icon);
    setTypeColor(type.color);
    setTypeQuantity(type.totalQuantity);
    setTypeTrackIndividually(type.trackIndividually);
    setTypeDialogOpen(true);
  }, []);

  // Save resource type
  const handleSaveType = useCallback(async () => {
    setSaving(true);
    try {
      if (editingType) {
        await updateResourceType(editingType.id, {
          name: typeName,
          icon: typeIcon,
          color: typeColor,
          totalQuantity: typeQuantity,
          trackIndividually: typeTrackIndividually,
        });
      } else {
        await createResourceType({
          name: typeName,
          slug: typeName.toLowerCase().replace(/\s+/g, '-'),
          icon: typeIcon,
          color: typeColor,
          totalQuantity: typeQuantity,
          trackIndividually: typeTrackIndividually,
          sortOrder: resourceTypes.length + 1,
          isActive: true,
        });
      }
      setTypeDialogOpen(false);
    } catch (err) {
      console.error('Failed to save resource type:', err);
    } finally {
      setSaving(false);
    }
  }, [editingType, typeName, typeIcon, typeColor, typeQuantity, typeTrackIndividually, resourceTypes.length]);

  // Open resource dialog for edit
  const openEditResourceDialog = useCallback((resource: Resource) => {
    setEditingResource(resource);
    setResourceName(resource.name);
    setResourceLabel(resource.label);
    setResourceStatus(resource.status);
    setResourceLocation(resource.locationDescription);
    setResourceNotes(resource.notes);
    setResourceDialogOpen(true);
  }, []);

  // Save individual resource
  const handleSaveResource = useCallback(async () => {
    if (!editingResource) return;
    setSaving(true);
    try {
      await updateResource(editingResource.id, {
        name: resourceName,
        label: resourceLabel,
        status: resourceStatus,
        locationDescription: resourceLocation,
        notes: resourceNotes,
      });
      setResourceDialogOpen(false);
    } catch (err) {
      console.error('Failed to save resource:', err);
    } finally {
      setSaving(false);
    }
  }, [editingResource, resourceName, resourceLabel, resourceStatus, resourceLocation, resourceNotes]);

  // Quick status change
  const handleStatusChange = useCallback(
    async (resourceId: string, status: ResourceStatus) => {
      try {
        await updateResourceStatus(resourceId, status);
      } catch (err) {
        console.error('Failed to update resource status:', err);
      }
    },
    []
  );

  // Add resource to type
  const handleAddResource = useCallback(
    async (typeId: string) => {
      try {
        await addResourcesToType(typeId, 1);
      } catch (err) {
        console.error('Failed to add resource:', err);
      }
    },
    []
  );

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
        <p className="text-red-600">Error loading resources: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Resource Inventory</h1>
        <Button onClick={openCreateTypeDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Type
        </Button>
      </div>

      {/* Resource Type Cards */}
      {resourceTypes.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No resource types"
          description="Create your first resource type to start managing resources."
          action={{ label: 'Add Resource Type', onClick: openCreateTypeDialog }}
        />
      ) : (
        <div className="space-y-4">
          {resourceTypes.map((type) => {
            const typeResources = getResourcesForType(type.id);
            const isExpanded = expandedTypes.has(type.id);
            const availableCount = typeResources.filter(
              (r) => r.status === 'available'
            ).length;

            return (
              <Card key={type.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleExpanded(type.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: type.color + '20' }}
                      >
                        <Package
                          className="h-5 w-5"
                          style={{ color: type.color }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{type.name}</CardTitle>
                        <p className="text-sm text-gray-500">
                          {availableCount} available / {type.totalQuantity} total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTypeDialog(type);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    {typeResources.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-500">
                        No individual resources configured.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {typeResources.map((resource) => (
                            <TableRow key={resource.id}>
                              <TableCell className="font-medium">
                                {resource.name}
                              </TableCell>
                              <TableCell>
                                <ResourceStatusBadge status={resource.status} />
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {resource.locationDescription || '--'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Edit resource"
                                    onClick={() =>
                                      openEditResourceDialog(resource)
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Set to maintenance"
                                    onClick={() =>
                                      handleStatusChange(
                                        resource.id,
                                        resource.status === 'maintenance'
                                          ? 'available'
                                          : 'maintenance'
                                      )
                                    }
                                  >
                                    <Wrench
                                      className={cn(
                                        'h-4 w-4',
                                        resource.status === 'maintenance'
                                          ? 'text-yellow-500'
                                          : 'text-gray-400'
                                      )}
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title={
                                      resource.status === 'locked'
                                        ? 'Unlock resource'
                                        : 'Lock resource'
                                    }
                                    onClick={() =>
                                      handleStatusChange(
                                        resource.id,
                                        resource.status === 'locked'
                                          ? 'available'
                                          : 'locked'
                                      )
                                    }
                                  >
                                    <Lock
                                      className={cn(
                                        'h-4 w-4',
                                        resource.status === 'locked'
                                          ? 'text-purple-500'
                                          : 'text-gray-400'
                                      )}
                                    />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddResource(type.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add {type.name.replace(/s$/, '')}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings2 className="mr-1 h-3 w-3" />
                        Bulk Edit
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create New Resource Type button at bottom */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={openCreateTypeDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Resource Type
        </Button>
      </div>

      {/* Resource Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Resource Type' : 'Create Resource Type'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Update the resource type configuration.'
                : 'Define a new category of resources.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                placeholder="e.g., Tables, Fridges, Sinks"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type-icon">Icon</Label>
                <Select value={typeIcon} onValueChange={setTypeIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Table2">Table</SelectItem>
                    <SelectItem value="Refrigerator">Refrigerator</SelectItem>
                    <SelectItem value="Snowflake">Snowflake</SelectItem>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Package">Package</SelectItem>
                    <SelectItem value="Droplets">Droplets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-color">Color</Label>
                <div className="flex gap-2">
                  <input
                    id="type-color"
                    type="color"
                    value={typeColor}
                    onChange={(e) => setTypeColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-gray-300"
                  />
                  <Input
                    value={typeColor}
                    onChange={(e) => setTypeColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-quantity">Quantity</Label>
              <Input
                id="type-quantity"
                type="number"
                min={1}
                value={typeQuantity}
                onChange={(e) => setTypeQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <Label>Track Individually</Label>
                <p className="text-sm text-gray-500">
                  Create individual resource records with unique names
                </p>
              </div>
              <Switch
                checked={typeTrackIndividually}
                onCheckedChange={setTypeTrackIndividually}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTypeDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveType}
              disabled={!typeName || saving}
            >
              {saving ? 'Saving...' : editingType ? 'Save Changes' : 'Create Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>
              Update the individual resource details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-label">Label</Label>
              <Input
                id="resource-label"
                value={resourceLabel}
                onChange={(e) => setResourceLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-status">Status</Label>
              <Select
                value={resourceStatus}
                onValueChange={(val) => setResourceStatus(val as ResourceStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="broken">Broken</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-location">Location</Label>
              <Input
                id="resource-location"
                placeholder="Where is this resource located?"
                value={resourceLocation}
                onChange={(e) => setResourceLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-notes">Notes</Label>
              <Textarea
                id="resource-notes"
                placeholder="Additional notes..."
                value={resourceNotes}
                onChange={(e) => setResourceNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResourceDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveResource}
              disabled={!resourceName || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
