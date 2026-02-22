'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Save,
  Eye,
  EyeOff,
  Move,
  Plus,
  Trash2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils/cn';
import { useResources } from '@/lib/hooks/useResources';
import { useResourceTypes } from '@/lib/hooks/useResourceTypes';
import { updateResource } from '@/lib/services/resourceService';
import type { Resource, ResourcePosition } from '@/lib/types';

// ---------------------------------------------------------------------------
// Floor Plan Visual Element
// ---------------------------------------------------------------------------

interface FloorElement {
  id: string;
  type: 'wall' | 'door' | 'sink' | 'label';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FloorPlanPage() {
  const { resources, loading: resourcesLoading } = useResources();
  const { resourceTypes, loading: typesLoading } = useResourceTypes();

  const loading = resourcesLoading || typesLoading;

  // Preview mode
  const [previewMode, setPreviewMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Visual elements (non-resource)
  const [visualElements, setVisualElements] = useState<FloorElement[]>([
    {
      id: 'wall-1',
      type: 'wall',
      x: 0,
      y: 0,
      width: 800,
      height: 10,
      rotation: 0,
      label: 'North Wall',
    },
    {
      id: 'wall-2',
      type: 'wall',
      x: 0,
      y: 0,
      width: 10,
      height: 600,
      rotation: 0,
      label: 'West Wall',
    },
    {
      id: 'wall-3',
      type: 'wall',
      x: 790,
      y: 0,
      width: 10,
      height: 600,
      rotation: 0,
      label: 'East Wall',
    },
    {
      id: 'wall-4',
      type: 'wall',
      x: 0,
      y: 590,
      width: 800,
      height: 10,
      rotation: 0,
      label: 'South Wall',
    },
    {
      id: 'door-1',
      type: 'door',
      x: 370,
      y: 590,
      width: 60,
      height: 10,
      rotation: 0,
      label: 'Entrance',
    },
  ]);

  // Local positions (for resources, to track unsaved changes)
  const [localPositions, setLocalPositions] = useState<
    Record<string, ResourcePosition>
  >({});

  // Add element dialog
  const [addElementOpen, setAddElementOpen] = useState(false);
  const [newElementType, setNewElementType] = useState<FloorElement['type']>('wall');
  const [newElementLabel, setNewElementLabel] = useState('');

  // Saving state
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local positions from resources
  useEffect(() => {
    const positions: Record<string, ResourcePosition> = {};
    resources.forEach((r) => {
      positions[r.id] = r.position || {
        x: Math.random() * 600 + 50,
        y: Math.random() * 400 + 50,
        width: 60,
        height: 40,
        rotation: 0,
      };
    });
    setLocalPositions(positions);
  }, [resources]);

  // Get position for a resource
  const getPosition = useCallback(
    (resourceId: string): ResourcePosition => {
      return (
        localPositions[resourceId] ?? {
          x: 100,
          y: 100,
          width: 60,
          height: 40,
          rotation: 0,
        }
      );
    },
    [localPositions]
  );

  // Get resource type color
  const getResourceColor = useCallback(
    (resource: Resource) => {
      const type = resourceTypes.find((rt) => rt.id === resource.typeId);
      return type?.color ?? '#3B82F6';
    },
    [resourceTypes]
  );

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (previewMode) return;
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const pos = getPosition(id);
      setDraggingId(id);
      setDragOffset({
        x: e.clientX / zoom - pos.x,
        y: e.clientY / zoom - pos.y,
      });
    },
    [previewMode, getPosition, zoom]
  );

  // Handle drag
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId) return;
      e.preventDefault();

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom - dragOffset.x + rect.left / zoom;
      const y = (e.clientY - rect.top) / zoom - dragOffset.y + rect.top / zoom;

      setLocalPositions((prev) => ({
        ...prev,
        [draggingId]: {
          ...prev[draggingId],
          x: Math.max(0, Math.min(740, (e.clientX - rect.left) / zoom)),
          y: Math.max(0, Math.min(560, (e.clientY - rect.top) / zoom)),
        },
      }));
      setHasChanges(true);
    },
    [draggingId, dragOffset, zoom]
  );

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Save layout
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const promises = Object.entries(localPositions).map(([id, position]) =>
        updateResource(id, { position })
      );
      await Promise.all(promises);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save floor plan:', err);
    } finally {
      setSaving(false);
    }
  }, [localPositions]);

  // Add visual element
  const handleAddElement = useCallback(() => {
    const newElement: FloorElement = {
      id: `${newElementType}-${Date.now()}`,
      type: newElementType,
      x: 400,
      y: 300,
      width: newElementType === 'label' ? 100 : 80,
      height: newElementType === 'label' ? 20 : newElementType === 'wall' ? 10 : 40,
      rotation: 0,
      label: newElementLabel || newElementType,
    };
    setVisualElements((prev) => [...prev, newElement]);
    setAddElementOpen(false);
    setNewElementLabel('');
  }, [newElementType, newElementLabel]);

  // Remove visual element
  const handleRemoveElement = useCallback((id: string) => {
    setVisualElements((prev) => prev.filter((el) => el.id !== id));
    setHasChanges(true);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Floor Plan Editor</h1>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="warning" className="mr-2">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? 'Hide grid' : 'Show grid'}
          >
            <Grid3X3
              className={cn('h-4 w-4', showGrid ? 'text-blue-500' : 'text-gray-400')}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode ? 'default' : 'outline'}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Exit Preview
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Floor Plan Canvas */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-auto rounded-lg border border-gray-200">
              <div
                ref={canvasRef}
                className={cn(
                  'relative bg-white',
                  !previewMode && 'cursor-crosshair',
                  showGrid && 'bg-[length:20px_20px] bg-[image:linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)]'
                )}
                style={{
                  width: `${800 * zoom}px`,
                  height: `${600 * zoom}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  minWidth: `${800 * zoom}px`,
                  minHeight: `${600 * zoom}px`,
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Visual elements (walls, doors, etc.) */}
                {visualElements.map((element) => (
                  <div
                    key={element.id}
                    className={cn(
                      'absolute select-none',
                      element.type === 'wall' && 'bg-gray-800',
                      element.type === 'door' && 'bg-amber-400 border border-amber-600',
                      element.type === 'sink' && 'bg-cyan-200 border border-cyan-400 rounded',
                      element.type === 'label' &&
                        'text-xs font-medium text-gray-500 flex items-center'
                    )}
                    style={{
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      width: `${element.width}px`,
                      height: `${element.height}px`,
                      transform: `rotate(${element.rotation}deg)`,
                    }}
                    title={element.label}
                  >
                    {element.type === 'label' && (
                      <span className="truncate px-1">{element.label}</span>
                    )}
                    {element.type === 'door' && (
                      <span className="flex h-full items-center justify-center text-[8px] font-bold text-amber-800">
                        DOOR
                      </span>
                    )}
                  </div>
                ))}

                {/* Resource elements */}
                {resources.map((resource) => {
                  const pos = getPosition(resource.id);
                  const color = getResourceColor(resource);
                  const isDragging = draggingId === resource.id;

                  return (
                    <div
                      key={resource.id}
                      className={cn(
                        'absolute flex cursor-grab select-none flex-col items-center justify-center rounded-lg border-2 text-xs font-medium shadow-sm transition-shadow',
                        isDragging && 'cursor-grabbing shadow-lg z-50',
                        previewMode && 'cursor-default',
                        resource.status === 'available' && 'opacity-100',
                        resource.status === 'maintenance' && 'opacity-60',
                        resource.status === 'broken' && 'opacity-40',
                        resource.status === 'locked' && 'opacity-50'
                      )}
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: `${pos.width}px`,
                        height: `${pos.height}px`,
                        backgroundColor: color + '30',
                        borderColor: color,
                        color: color,
                        transform: `rotate(${pos.rotation}deg)`,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, resource.id)}
                    >
                      <span className="truncate px-1 text-center leading-tight">
                        {resource.name}
                      </span>
                      {resource.status !== 'available' && (
                        <span className="text-[8px] uppercase opacity-75">
                          {resource.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        {!previewMode && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Elements</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setAddElementOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Element
                </Button>
                <div className="mt-3 space-y-1">
                  {visualElements.map((el) => (
                    <div
                      key={el.id}
                      className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50"
                    >
                      <span className="truncate text-gray-700">
                        {el.label || el.type}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveElement(el.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {resources.map((resource) => {
                    const color = getResourceColor(resource);
                    return (
                      <div
                        key={resource.id}
                        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                      >
                        <div
                          className="h-3 w-3 rounded"
                          style={{ backgroundColor: color }}
                        />
                        <span className="flex-1 truncate text-gray-700">
                          {resource.name}
                        </span>
                        <Badge
                          variant={
                            resource.status === 'available'
                              ? 'success'
                              : resource.status === 'maintenance'
                                ? 'warning'
                                : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {resource.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {resourceTypes.map((type) => (
                    <div key={type.id} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-gray-600">{type.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-gray-800" />
                    <span className="text-gray-600">Wall</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-amber-400" />
                    <span className="text-gray-600">Door</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Element Dialog */}
      <Dialog open={addElementOpen} onOpenChange={setAddElementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Visual Element</DialogTitle>
            <DialogDescription>
              Add walls, doors, or labels to the floor plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Element Type</Label>
              <Select
                value={newElementType}
                onValueChange={(val) =>
                  setNewElementType(val as FloorElement['type'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wall">Wall</SelectItem>
                  <SelectItem value="door">Door</SelectItem>
                  <SelectItem value="sink">Sink Area</SelectItem>
                  <SelectItem value="label">Label</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="Element name..."
                value={newElementLabel}
                onChange={(e) => setNewElementLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddElementOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddElement}>Add Element</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
