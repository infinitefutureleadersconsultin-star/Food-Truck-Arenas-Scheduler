'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Puzzle,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Rocket,
  Code,
  FlaskConical,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  getAllPlatformFeatures,
  createPlatformFeature,
  updatePlatformFeature,
  deletePlatformFeature,
} from '@/lib/services/platformFeatureService';
import type { PlatformFeature, FeatureStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  FeatureStatus,
  { label: string; icon: typeof Rocket; color: string }
> = {
  planned: { label: 'Planned', icon: Rocket, color: 'bg-gray-100 text-gray-700' },
  in_development: { label: 'In Development', icon: Code, color: 'bg-yellow-100 text-yellow-700' },
  beta: { label: 'Beta', icon: FlaskConical, color: 'bg-blue-100 text-blue-700' },
  released: { label: 'Released', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  deprecated: { label: 'Deprecated', icon: Archive, color: 'bg-red-100 text-red-700' },
};

export default function PlatformFeaturesPage() {
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<FeatureStatus>('planned');
  const [saving, setSaving] = useState(false);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllPlatformFeatures();
      setFeatures(data);
    } catch (err) {
      console.error('Error fetching features:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormStatus('planned');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updatePlatformFeature(editingId, {
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
          isEnabled: formStatus === 'released',
        });
      } else {
        await createPlatformFeature(
          formName.trim(),
          formDescription.trim(),
          formStatus
        );
      }
      await fetchFeatures();
      resetForm();
    } catch (err) {
      console.error('Error saving feature:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (feature: PlatformFeature) => {
    setFormName(feature.name);
    setFormDescription(feature.description);
    setFormStatus(feature.status);
    setEditingId(feature.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlatformFeature(id);
      setFeatures((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Error deleting feature:', err);
    }
  };

  const handleToggleEnabled = async (feature: PlatformFeature) => {
    try {
      await updatePlatformFeature(feature.id, { isEnabled: !feature.isEnabled });
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === feature.id ? { ...f, isEnabled: !f.isEnabled } : f
        )
      );
    } catch (err) {
      console.error('Error toggling feature:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Puzzle className="h-7 w-7 text-gray-700" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Features</h1>
            <p className="text-sm text-gray-500">
              Manage and track platform features and their status
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Feature
        </Button>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.entries(STATUS_CONFIG) as [FeatureStatus, typeof STATUS_CONFIG[FeatureStatus]][]).map(
          ([status, config]) => {
            const count = features.filter((f) => f.status === status).length;
            const StatusIcon = config.icon;
            return (
              <Card key={status}>
                <CardContent className="flex items-center gap-2 p-3">
                  <StatusIcon className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-500">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId ? 'Edit Feature' : 'Add New Feature'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Feature Name *</Label>
                <Input
                  placeholder="e.g., Push Notifications"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as FeatureStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the feature..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? 'Saving...' : editingId ? 'Update Feature' : 'Add Feature'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features List */}
      {features.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="No platform features yet"
          description="Add features to track their development status."
          action={{
            label: 'Add Feature',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {features.map((feature) => {
            const statusConfig = STATUS_CONFIG[feature.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={feature.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={feature.isEnabled}
                        onCheckedChange={() => handleToggleEnabled(feature)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {feature.name}
                        </p>
                        <Badge className={statusConfig.color} variant="secondary">
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {feature.description && (
                        <p className="mt-1 text-xs text-gray-500">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(feature)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(feature.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
