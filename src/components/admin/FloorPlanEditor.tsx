'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Save, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { Resource, ResourceStatus } from '@/lib/types';

interface FloorPlanEditorProps {
  resources: Resource[];
  onSave: (
    positions: Array<{
      resourceId: string;
      x: number;
      y: number;
    }>
  ) => void;
}

interface DragState {
  resourceId: string;
  offsetX: number;
  offsetY: number;
}

const statusColorMap: Record<ResourceStatus, string> = {
  available: '#22c55e',
  in_use: '#3b82f6',
  maintenance: '#eab308',
  broken: '#ef4444',
  locked: '#6b7280',
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function FloorPlanEditor({ resources, onSave }: FloorPlanEditorProps) {
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >(() => {
    const initial: Record<string, { x: number; y: number }> = {};
    resources.forEach((r) => {
      initial[r.id] = {
        x: r.position?.x ?? Math.random() * (CANVAS_WIDTH - 100),
        y: r.position?.y ?? Math.random() * (CANVAS_HEIGHT - 60),
      };
    });
    return initial;
  });

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (resourceId: string, e: React.MouseEvent) => {
      e.preventDefault();
      const pos = positions[resourceId];
      if (!pos) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDragState({
        resourceId,
        offsetX: (e.clientX - rect.left) / zoom - pos.x,
        offsetY: (e.clientY - rect.top) / zoom - pos.y,
      });
      setSelectedId(resourceId);
    },
    [positions, zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(
          CANVAS_WIDTH - 80,
          (e.clientX - rect.left) / zoom - dragState.offsetX
        )
      );
      const y = Math.max(
        0,
        Math.min(
          CANVAS_HEIGHT - 40,
          (e.clientY - rect.top) / zoom - dragState.offsetY
        )
      );

      setPositions((prev) => ({
        ...prev,
        [dragState.resourceId]: { x, y },
      }));
    },
    [dragState, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setDragState(null);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const posArray = Object.entries(positions).map(([resourceId, pos]) => ({
        resourceId,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      }));
      await onSave(posArray);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPositions = () => {
    const cols = Math.ceil(Math.sqrt(resources.length));
    const newPositions: Record<string, { x: number; y: number }> = {};
    resources.forEach((r, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      newPositions[r.id] = {
        x: 20 + col * 120,
        y: 20 + row * 80,
      };
    });
    setPositions(newPositions);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Floor Plan Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetPositions}>
              <RotateCw className="mr-1 h-3 w-3" />
              Reset Layout
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-1 h-3 w-3" />
              {isSaving ? 'Saving...' : 'Save Layout'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-3">
          {Object.entries(statusColorMap).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs capitalize text-gray-500">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="overflow-auto rounded-lg border border-gray-200">
          <div
            ref={canvasRef}
            className="relative bg-gray-50 cursor-crosshair select-none"
            style={{
              width: CANVAS_WIDTH * zoom,
              height: CANVAS_HEIGHT * zoom,
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Grid lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern
                  id="grid"
                  width={40 * zoom}
                  height={40 * zoom}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Resource blocks */}
            {resources.map((resource) => {
              const pos = positions[resource.id];
              if (!pos) return null;

              const statusColor =
                statusColorMap[resource.status] || '#6b7280';

              return (
                <div
                  key={resource.id}
                  className={cn(
                    'absolute rounded-lg border-2 bg-white shadow-sm cursor-grab active:cursor-grabbing transition-shadow',
                    selectedId === resource.id && 'ring-2 ring-primary shadow-md',
                    dragState?.resourceId === resource.id && 'shadow-lg'
                  )}
                  style={{
                    left: pos.x * zoom,
                    top: pos.y * zoom,
                    width: 100 * zoom,
                    height: 50 * zoom,
                    borderColor: statusColor,
                  }}
                  onMouseDown={(e) => handleMouseDown(resource.id, e)}
                  onClick={() => setSelectedId(resource.id)}
                >
                  <div
                    className="flex h-full flex-col items-center justify-center p-1"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  >
                    <span className="text-xs font-medium truncate w-full text-center">
                      {resource.name}
                    </span>
                    <span
                      className="text-[10px] capitalize"
                      style={{ color: statusColor }}
                    >
                      {resource.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Resource Info */}
        {selectedId && (
          <div className="mt-4 rounded-lg border border-gray-200 p-3">
            <h4 className="text-sm font-medium">Selected Resource</h4>
            {(() => {
              const res = resources.find((r) => r.id === selectedId);
              const pos = positions[selectedId];
              if (!res || !pos) return null;
              return (
                <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                  <span>
                    <strong>{res.name}</strong> ({res.label})
                  </span>
                  <Badge
                    className="capitalize"
                    style={{
                      backgroundColor: `${statusColorMap[res.status]}20`,
                      color: statusColorMap[res.status],
                    }}
                  >
                    {res.status.replace('_', ' ')}
                  </Badge>
                  <span>
                    Position: ({Math.round(pos.x)}, {Math.round(pos.y)})
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
