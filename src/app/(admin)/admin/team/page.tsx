'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
} from '@/lib/services/teamMemberService';
import { updateUser } from '@/lib/services/userService';
import { cn } from '@/lib/utils/cn';
import type { TeamMember, TeamMemberRole, TeamPermission } from '@/lib/types';
import { ROLE_DEFAULT_PERMISSIONS } from '@/lib/types';

const ROLE_CONFIG: Record<
  TeamMemberRole,
  { label: string; color: string; description: string }
> = {
  manager: {
    label: 'Manager',
    color: 'bg-purple-100 text-purple-700',
    description: 'Full access to bookings, resources, vendors, and analytics',
  },
  staff: {
    label: 'Staff',
    color: 'bg-blue-100 text-blue-700',
    description: 'Can view bookings, handle check-ins, and send messages',
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-gray-100 text-gray-700',
    description: 'Read-only access to bookings, calendar, and messages',
  },
};

const ALL_PERMISSIONS: { key: TeamPermission; label: string }[] = [
  { key: 'view_bookings', label: 'View Bookings' },
  { key: 'manage_bookings', label: 'Manage Bookings' },
  { key: 'view_calendar', label: 'View Calendar' },
  { key: 'check_in', label: 'Check In/Out' },
  { key: 'view_messages', label: 'View Messages' },
  { key: 'send_messages', label: 'Send Messages' },
  { key: 'view_analytics', label: 'View Analytics' },
  { key: 'manage_resources', label: 'Manage Resources' },
  { key: 'manage_vendors', label: 'Manage Vendors' },
  { key: 'manage_settings', label: 'Manage Settings' },
  { key: 'manage_team', label: 'Manage Team' },
];

export default function TeamManagementPage() {
  const { user, userData } = useAuthContext();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TeamMember | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<TeamMemberRole>('staff');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (userData?.teamMembers) {
      setTeamMembers(userData.teamMembers);
    }
    setLoading(false);
  }, [userData]);

  const handleAdd = async () => {
    if (!user || !newName.trim() || !newEmail.trim()) return;
    setAdding(true);
    try {
      const newMember = await addTeamMember(
        user.uid,
        newName.trim(),
        newEmail.trim(),
        newPhone.trim(),
        newRole
      );
      setTeamMembers((prev) => [...prev, newMember]);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewRole('staff');
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding team member:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!user) return;
    try {
      await removeTeamMember(user.uid, member);
      setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error removing team member:', err);
    }
  };

  const handleUpdateRole = async (memberId: string, role: TeamMemberRole) => {
    if (!user) return;
    try {
      const updated = await updateTeamMember(
        user.uid,
        teamMembers,
        memberId,
        { role }
      );
      setTeamMembers(updated);
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleTogglePermission = async (
    memberId: string,
    permission: TeamPermission
  ) => {
    if (!user) return;
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;

    const newPermissions = member.permissions.includes(permission)
      ? member.permissions.filter((p) => p !== permission)
      : [...member.permissions, permission];

    try {
      const updated = await updateTeamMember(
        user.uid,
        teamMembers,
        memberId,
        { permissions: newPermissions }
      );
      setTeamMembers(updated);
    } catch (err) {
      console.error('Error updating permissions:', err);
    }
  };

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    if (!user) return;
    try {
      const updated = await updateTeamMember(
        user.uid,
        teamMembers,
        memberId,
        { isActive }
      );
      setTeamMembers(updated);
    } catch (err) {
      console.error('Error toggling active status:', err);
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
          <Users className="h-7 w-7 text-gray-700" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
            <p className="text-sm text-gray-500">
              Manage your team and their access permissions
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Role overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.entries(ROLE_CONFIG) as [TeamMemberRole, typeof ROLE_CONFIG[TeamMemberRole]][]).map(
          ([role, config]) => (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge className={config.color} variant="secondary">
                    <Shield className="mr-1 h-3 w-3" />
                    {config.label}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {teamMembers.filter((m) => m.role === role).length} members
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{config.description}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Add Team Member Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Team Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as TeamMemberRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700">
                Default permissions for {ROLE_CONFIG[newRole].label}:
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {ROLE_DEFAULT_PERMISSIONS[newRole].map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {ALL_PERMISSIONS.find((ap) => ap.key === p)?.label || p}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={adding || !newName.trim() || !newEmail.trim()}>
                {adding ? 'Adding...' : 'Add Team Member'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      {teamMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Add team members to delegate responsibilities and manage access."
          action={{
            label: 'Add Team Member',
            onClick: () => setShowAddForm(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {teamMembers.map((member) => {
            const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
            const isExpanded = expandedMember === member.id;

            return (
              <Card
                key={member.id}
                className={cn(!member.isActive && 'opacity-60')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                          member.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {member.name}
                          </p>
                          <Badge className={roleConfig.color} variant="secondary">
                            {roleConfig.label}
                          </Badge>
                          {!member.isActive && (
                            <Badge variant="secondary" className="bg-red-100 text-red-600">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </span>
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500">Active</Label>
                        <Switch
                          checked={member.isActive}
                          onCheckedChange={(checked) =>
                            handleToggleActive(member.id, checked)
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedMember(isExpanded ? null : member.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteConfirm(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded permissions */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="flex items-center gap-4">
                        <Label className="text-sm font-medium">Role</Label>
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            handleUpdateRole(member.id, v as TeamMemberRole)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Permissions</Label>
                        <p className="mb-3 text-xs text-gray-500">
                          Customize what this team member can access
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {ALL_PERMISSIONS.map((perm) => (
                            <label
                              key={perm.key}
                              className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                            >
                              <Switch
                                checked={member.permissions.includes(perm.key)}
                                onCheckedChange={() =>
                                  handleTogglePermission(member.id, perm.key)
                                }
                              />
                              <span className="text-xs">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={() => setDeleteConfirm(null)}
          title="Remove Team Member"
          description={`Are you sure you want to remove ${deleteConfirm.name} from your team? They will lose all access immediately.`}
          confirmLabel="Remove"
          variant="destructive"
          onConfirm={() => handleRemove(deleteConfirm)}
        />
      )}
    </div>
  );
}
