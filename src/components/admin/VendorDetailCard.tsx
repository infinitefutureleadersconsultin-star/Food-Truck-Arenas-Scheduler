'use client';

import React from 'react';
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  Truck,
  FileText,
  Users,
  StickyNote,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils/cn';
import type { User, UserStatus, DocumentStatus } from '@/lib/types';

interface VendorDetailCardProps {
  vendor: User;
}

const statusBadgeMap: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

const docStatusBadgeMap: Record<DocumentStatus, string> = {
  valid: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
};

export function VendorDetailCard({ vendor }: VendorDetailCardProps) {
  const createdDate = vendor.createdAt?.toDate?.()
    ? vendor.createdAt.toDate().toLocaleDateString()
    : 'N/A';
  const lastLogin = vendor.lastLoginAt?.toDate?.()
    ? vendor.lastLoginAt.toDate().toLocaleDateString()
    : 'Never';

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              {vendor.profileImageUrl ? (
                <img
                  src={vendor.profileImageUrl}
                  alt={vendor.displayName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">{vendor.displayName}</CardTitle>
              <p className="text-sm text-gray-500">{vendor.businessName}</p>
            </div>
          </div>
          <Badge
            className={cn(
              'capitalize',
              statusBadgeMap[vendor.status] || 'bg-gray-100 text-gray-800'
            )}
          >
            {vendor.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Info */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Contact Information
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{vendor.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{vendor.phone}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Vehicle & Resources */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Vehicle & Default Resources
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="h-4 w-4 text-gray-400" />
              <span className="capitalize">
                Vehicle Size: {vendor.vehicleSize}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Tables</p>
                <p className="text-lg font-semibold">
                  {vendor.defaultResources.tables}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Fridges</p>
                <p className="text-lg font-semibold">
                  {vendor.defaultResources.fridges}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Freezers</p>
                <p className="text-lg font-semibold">
                  {vendor.defaultResources.freezers}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Storage</p>
                <p className="text-lg font-semibold">
                  {vendor.defaultResources.storage}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Documents */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            <FileText className="mr-1 inline h-4 w-4" />
            Documents
          </h4>
          {vendor.documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {vendor.documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {doc.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">{doc.fileName}</p>
                  </div>
                  <Badge
                    className={cn(
                      'capitalize',
                      docStatusBadgeMap[doc.status] ||
                        'bg-gray-100 text-gray-800'
                    )}
                  >
                    {doc.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Team Members */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            <Users className="mr-1 inline h-4 w-4" />
            Team Members
          </h4>
          {vendor.teamMembers.length === 0 ? (
            <p className="text-sm text-gray-500">No team members added.</p>
          ) : (
            <div className="space-y-2">
              {vendor.teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <span className="text-xs text-gray-500">{member.phone}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Admin Notes */}
        {vendor.adminNotes && (
          <>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">
                <StickyNote className="mr-1 inline h-4 w-4" />
                Admin Notes
              </h4>
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="text-sm text-gray-700">{vendor.adminNotes}</p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Joined: {createdDate}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last Login: {lastLogin}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
