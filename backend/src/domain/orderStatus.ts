export type Status = 'created' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderEvent {
  eventId: string;
  status: Status;
  timestamp: number | string | Date;
}

// Ranks define the strict forward progression of normal statuses.
// cancelled is handled separately.
const STATUS_RANK: Record<Status, number> = {
  created: 1,
  paid: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 99, // Rank given for tie-breaking sorts, usually last
};

/**
 * Sorts an order's events by timestamp.
 * Ties are broken by the predefined status rank.
 */
export function sortTimeline(events: OrderEvent[]): OrderEvent[] {
  // Return a new sorted array to keep the function pure
  return [...events].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();

    // Sort by timestamp first
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    
    // Break ties by rank (e.g. shipped before delivered)
    return STATUS_RANK[a.status] - STATUS_RANK[b.status];
  });
}

/**
 * Validates a chronological sequence of statuses for valid transitions.
 * Returns {ok: true} if valid, or {ok: false, reason: string} if invalid.
 */
export function validateTimeline(statuses: Status[]): { ok: boolean; reason?: string } {
  for (let i = 0; i < statuses.length; i++) {
    const current = statuses[i];

    if (i > 0) {
      const prev = statuses[i - 1];

      // No duplicates allowed
      if (current === prev) {
        return { ok: false, reason: `Duplicate status: ${current}` };
      }

      // Nothing is allowed after delivered or cancelled
      if (prev === 'delivered') {
        return { ok: false, reason: 'No events allowed after delivered' };
      }
      if (prev === 'cancelled') {
        return { ok: false, reason: 'No events allowed after cancelled' };
      }

      // Cancelled is only allowed after created or paid
      if (current === 'cancelled') {
        if (prev !== 'created' && prev !== 'paid') {
          return { ok: false, reason: `Cannot cancel after ${prev}` };
        }
      } else {
        // Statuses must strictly move forward in rank (skipping is allowed)
        if (STATUS_RANK[current] <= STATUS_RANK[prev]) {
          return { ok: false, reason: `Invalid transition from ${prev} to ${current}` };
        }
      }
    } else {
      // First status logic: cancelled cannot be the very first status
      if (current === 'cancelled') {
        return { ok: false, reason: 'Cannot start with cancelled' };
      }
    }
  }

  return { ok: true };
}
