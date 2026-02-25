'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  User as UserIcon,
  Users,
  FileText,
  Settings,
  Plus,
  Trash2,
  Upload,
  Shield,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useAuthContext } from '@/contexts/AuthContext';
import * as userService from '@/lib/services/userService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import type {
  User,
  TeamMember,
  UserDocument,
  VehicleSize,
  DocumentStatus,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Document status badge variant mapping
// ---------------------------------------------------------------------------

const docStatusVariant: Record<DocumentStatus, 'success' | 'warning' | 'destructive'> = {
  valid: 'success',
  expiring_soon: 'warning',
  expired: 'destructive',
};

const docStatusLabel: Record<DocumentStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring',
  expired: 'Expired',
};

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { user, loading, error, updateProfile, refreshUser } = useUser();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
            <p className="text-sm text-red-600">
              {error ?? 'Unable to load profile.'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refreshUser()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your business information and account settings.
        </p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="business">
            <UserIcon className="mr-1.5 h-4 w-4" />
            Business Info
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="mr-1.5 h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-1.5 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-1.5 h-4 w-4" />
            Account Settings
          </TabsTrigger>
        </TabsList>

        {/* Business Info Tab */}
        <TabsContent value="business">
          <BusinessInfoTab user={user} onSave={updateProfile} />
        </TabsContent>

        {/* Team Members Tab */}
        <TabsContent value="team">
          <TeamMembersTab
            members={user.teamMembers ?? []}
            onSave={(members) => updateProfile({ teamMembers: members })}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsTab documents={user.documents ?? []} />
        </TabsContent>

        {/* Account Settings Tab */}
        <TabsContent value="settings">
          <AccountSettingsTab user={user} onSave={updateProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Business Info Tab
// ---------------------------------------------------------------------------

interface BusinessInfoTabProps {
  user: User;
  onSave: (data: Partial<Omit<User, 'id' | 'createdAt'>>) => Promise<void>;
}

function BusinessInfoTab({ user, onSave }: BusinessInfoTabProps) {
  const [businessName, setBusinessName] = useState(user.businessName ?? '');
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [vehicleSize, setVehicleSize] = useState<VehicleSize>(user.vehicleSize);
  const [defaultTables, setDefaultTables] = useState(user.defaultResources?.tables ?? 0);
  const [defaultFridges, setDefaultFridges] = useState(user.defaultResources?.fridges ?? 0);
  const [defaultFreezers, setDefaultFreezers] = useState(user.defaultResources?.freezers ?? 0);
  const [defaultStorage, setDefaultStorage] = useState(user.defaultResources?.storage ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({
        businessName,
        displayName,
        phone,
        email,
        vehicleSize,
        defaultResources: {
          tables: defaultTables,
          fridges: defaultFridges,
          freezers: defaultFreezers,
          storage: defaultStorage,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // error is handled by the hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Update your business details and default resource preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Owner Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleSize">Vehicle Size</Label>
            <Select value={vehicleSize} onValueChange={(v) => setVehicleSize(v as VehicleSize)}>
              <SelectTrigger id="vehicleSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Default Resource Preferences
          </h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="defTables">Tables</Label>
              <Input
                id="defTables"
                type="number"
                min={0}
                value={defaultTables}
                onChange={(e) => setDefaultTables(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defFridges">Fridges</Label>
              <Input
                id="defFridges"
                type="number"
                min={0}
                value={defaultFridges}
                onChange={(e) => setDefaultFridges(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defFreezers">Freezers</Label>
              <Input
                id="defFreezers"
                type="number"
                min={0}
                value={defaultFreezers}
                onChange={(e) => setDefaultFreezers(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defStorage">Storage</Label>
              <Input
                id="defStorage"
                type="number"
                min={0}
                value={defaultStorage}
                onChange={(e) => setDefaultStorage(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">Saved successfully.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Team Members Tab
// ---------------------------------------------------------------------------

interface TeamMembersTabProps {
  members: TeamMember[];
  onSave: (members: TeamMember[]) => Promise<void>;
}

function TeamMembersTab({ members: initialMembers, onSave }: TeamMembersTabProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addMember = () => {
    setMembers((prev) => [...prev, { name: '', email: '', phone: '' }]);
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    setMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(members);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // hook handles error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription className="mt-1.5">
            Manage people who work with you at the commissary.
          </CardDescription>
        </div>
        <Button size="sm" onClick={addMember}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members"
            description="Add team members to your account."
            action={{ label: 'Add Member', onClick: addMember }}
          />
        ) : (
          <div className="space-y-4">
            {members.map((member, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input
                        placeholder="Full name"
                        value={member.name}
                        onChange={(e) => updateMember(idx, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={member.email}
                        onChange={(e) => updateMember(idx, 'email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={member.phone}
                        onChange={(e) => updateMember(idx, 'phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-6 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                  onClick={() => removeMember(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {members.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Team'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">Saved successfully.</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------

interface DocumentsTabProps {
  documents: UserDocument[];
}

function DocumentsTab({ documents }: DocumentsTabProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // File upload would be handled here via Firebase Storage
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      console.log('Files dropped:', Array.from(files).map((f) => f.name));
    }
  }, []);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        console.log('Files selected:', Array.from(files).map((f) => f.name));
      }
    };
    input.click();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          Upload and manage your permits, insurance, and certifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload zone */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 bg-gray-50 hover:border-gray-300',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mb-3 h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Drag and drop files here, or
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleFileSelect}>
            Browse Files
          </Button>
          <p className="mt-2 text-xs text-gray-400">
            PDF, JPG, PNG up to 10MB
          </p>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents"
            description="Upload your required documents to get started."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {doc.type.replace('_', ' ')}
                      {doc.expiresAt &&
                        ` | Expires: ${doc.expiresAt.toDate?.()
                          ? doc.expiresAt.toDate().toLocaleDateString()
                          : 'N/A'}`}
                    </p>
                  </div>
                </div>
                <Badge variant={docStatusVariant[doc.status]}>
                  {docStatusLabel[doc.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Account Settings Tab
// ---------------------------------------------------------------------------

interface AccountSettingsTabProps {
  user: User;
  onSave: (data: Partial<Omit<User, 'id' | 'createdAt'>>) => Promise<void>;
}

function AccountSettingsTab({ user, onSave }: AccountSettingsTabProps) {
  const { user: firebaseUser } = useAuthContext();

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notification preferences — initialize from user profile
  const prefs = (user as unknown as Record<string, unknown>).notificationPreferences as
    | { email?: boolean; sms?: boolean; bookingReminders?: boolean; announcementAlerts?: boolean }
    | undefined;
  const [emailNotifications, setEmailNotifications] = useState(prefs?.email ?? true);
  const [smsNotifications, setSmsNotifications] = useState(prefs?.sms ?? false);
  const [bookingReminders, setBookingReminders] = useState(prefs?.bookingReminders ?? true);
  const [announcementAlerts, setAnnouncementAlerts] = useState(prefs?.announcementAlerts ?? true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Save notification preferences to Firestore
  const saveNotifPrefs = async (
    email: boolean,
    sms: boolean,
    reminders: boolean,
    alerts: boolean,
  ) => {
    setNotifSaving(true);
    setNotifSaved(false);
    try {
      await onSave({
        notificationPreferences: {
          email,
          sms,
          bookingReminders: reminders,
          announcementAlerts: alerts,
        },
      } as Partial<Omit<User, 'id' | 'createdAt'>>);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    } catch {
      // handled by hook
    } finally {
      setNotifSaving(false);
    }
  };

  // Persist each toggle change immediately
  const handleToggle = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    field: 'email' | 'sms' | 'bookingReminders' | 'announcementAlerts',
    value: boolean,
  ) => {
    setter(value);
    const next = { email: emailNotifications, sms: smsNotifications, bookingReminders, announcementAlerts, [field]: value };
    saveNotifPrefs(next.email, next.sms, next.bookingReminders, next.announcementAlerts);
  };

  // Password change handler
  const handlePasswordChange = async () => {
    if (!firebaseUser || !firebaseUser.email) return;
    setPasswordUpdating(true);
    setPasswordMessage(null);

    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      setPasswordMessage({ type: 'error', text: message });
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {passwordMessage && (
            <p className={cn('text-sm', passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600')}>
              {passwordMessage.text}
            </p>
          )}
          <Button
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || passwordUpdating}
            onClick={handlePasswordChange}
          >
            {passwordUpdating ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive updates via email</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={(v) => handleToggle(setEmailNotifications, 'email', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
              <p className="text-xs text-gray-500">Receive text message alerts</p>
            </div>
            <Switch checked={smsNotifications} onCheckedChange={(v) => handleToggle(setSmsNotifications, 'sms', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Booking Reminders</p>
              <p className="text-xs text-gray-500">Remind before scheduled bookings</p>
            </div>
            <Switch checked={bookingReminders} onCheckedChange={(v) => handleToggle(setBookingReminders, 'bookingReminders', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Announcement Alerts</p>
              <p className="text-xs text-gray-500">Notify for new announcements</p>
            </div>
            <Switch checked={announcementAlerts} onCheckedChange={(v) => handleToggle(setAnnouncementAlerts, 'announcementAlerts', v)} />
          </div>
          {notifSaved && (
            <p className="text-sm text-green-600">Preferences saved.</p>
          )}
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
            Request Account Deletion
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete Account"
        description="Are you sure you want to request account deletion? This action cannot be undone. Your data will be permanently removed after admin approval."
        confirmLabel="Request Deletion"
        variant="destructive"
        onConfirm={() => {
          setDeleteConfirm(false);
          // In production this would send an admin notification
        }}
      />
    </div>
  );
}
