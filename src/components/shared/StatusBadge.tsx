import { Badge, type BadgeProps } from '@/components/ui/badge';

type StatusType = 'booking' | 'resource' | 'user';

interface StatusBadgeProps {
  status: string;
  type: StatusType;
  className?: string;
}

type BadgeVariant = NonNullable<BadgeProps['variant']>;

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

const bookingStatusMap: Record<string, StatusConfig> = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  checked_in: { label: 'Checked In', variant: 'info' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  no_show: { label: 'No Show', variant: 'destructive' },
  waitlisted: { label: 'Waitlisted', variant: 'outline' },
};

const resourceStatusMap: Record<string, StatusConfig> = {
  available: { label: 'Available', variant: 'success' },
  occupied: { label: 'Occupied', variant: 'info' },
  maintenance: { label: 'Maintenance', variant: 'warning' },
  out_of_service: { label: 'Out of Service', variant: 'destructive' },
  reserved: { label: 'Reserved', variant: 'secondary' },
};

const userStatusMap: Record<string, StatusConfig> = {
  active: { label: 'Active', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  pending: { label: 'Pending', variant: 'warning' },
};

const statusMaps: Record<StatusType, Record<string, StatusConfig>> = {
  booking: bookingStatusMap,
  resource: resourceStatusMap,
  user: userStatusMap,
};

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const map = statusMaps[type];
  const config = map[status] ?? { label: status, variant: 'outline' as BadgeVariant };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
