'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QRGeneratorProps {
  bookingId: string;
  size?: number;
}

export function QRGenerator({ bookingId, size = 200 }: QRGeneratorProps) {
  const checkInUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/check-in?bookingId=${bookingId}`
      : `/check-in?bookingId=${bookingId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Check-In QR Code</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <QRCodeSVG
            value={checkInUrl}
            size={size}
            level="M"
            includeMargin={false}
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Scan this code to check in for your booking
          </p>
          <p className="text-[10px] text-gray-400 font-mono mt-1">
            {bookingId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
