import { Pipe, PipeTransform } from '@angular/core';

/**
 * Maps an appointment status to Bootstrap badge CSS classes.
 *
 * Accepts a `variant` parameter:
 * - `'subtle'` (default): pastel badges used in patient-facing views
 * - `'solid'`: opaque badges used in doctor/admin-facing views
 *
 * Usage:
 *   <span class="badge" [class]="status | statusBadge">
 *   <span class="badge" [class]="status | statusBadge:'solid'">
 */
@Pipe({ name: 'statusBadge' })
export class StatusBadgePipe implements PipeTransform {
  private static readonly SUBTLE: Record<string, string> = {
    scheduled: 'status-scheduled',
    confirmed: 'status-confirmed',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
    no_show: 'status-no-show',
  };

  private static readonly SOLID: Record<string, string> = {
    scheduled: 'bg-warning text-dark',
    confirmed: 'bg-primary',
    completed: 'bg-success',
    cancelled: 'bg-danger',
    no_show: 'bg-secondary',
  };

  transform(status: string | null | undefined, variant: 'subtle' | 'solid' = 'subtle'): string {
    if (!status) return 'bg-secondary';
    const map = variant === 'solid' ? StatusBadgePipe.SOLID : StatusBadgePipe.SUBTLE;
    return map[status.toLowerCase()] ?? 'bg-secondary';
  }
}
