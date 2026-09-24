import { describe, it, expect } from 'vitest';
import { sortTimeline, validateTimeline } from './orderStatus';

describe('orderStatus domain logic', () => {
  describe('sortTimeline', () => {
    it('sorts out-of-order input correctly by timestamp and status rank', () => {
      const events = [
        { eventId: '3', status: 'shipped', timestamp: 3000 },
        { eventId: '1', status: 'created', timestamp: 1000 },
        { eventId: '4', status: 'delivered', timestamp: 3000 }, // same timestamp as shipped, but delivered ranks higher so it comes after
        { eventId: '2', status: 'paid', timestamp: 2000 },
      ] as any[];
      
      const sorted = sortTimeline(events);
      
      expect(sorted.map(e => e.status)).toEqual([
        'created',
        'paid',
        'shipped',
        'delivered'
      ]);
    });
  });

  describe('validateTimeline', () => {
    it('allows valid full flow', () => {
      const result = validateTimeline(['created', 'paid', 'shipped', 'delivered'] as any[]);
      expect(result.ok).toBe(true);
    });

    it('allows skipped steps', () => {
      const result = validateTimeline(['created', 'shipped', 'delivered'] as any[]);
      expect(result.ok).toBe(true);
    });

    it('fails when going backwards', () => {
      const result = validateTimeline(['created', 'shipped', 'paid'] as any[]);
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('fails on duplicate status', () => {
      const result = validateTimeline(['created', 'paid', 'paid'] as any[]);
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('allows cancel after created', () => {
      const result = validateTimeline(['created', 'cancelled'] as any[]);
      expect(result.ok).toBe(true);
    });

    it('allows cancel after paid', () => {
      const result = validateTimeline(['created', 'paid', 'cancelled'] as any[]);
      expect(result.ok).toBe(true);
    });

    it('fails on cancel after shipped', () => {
      const result = validateTimeline(['created', 'paid', 'shipped', 'cancelled'] as any[]);
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('fails on event after delivered', () => {
      const result = validateTimeline(['created', 'delivered', 'shipped'] as any[]);
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('fails on event after cancelled', () => {
      const result = validateTimeline(['created', 'cancelled', 'shipped'] as any[]);
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});
