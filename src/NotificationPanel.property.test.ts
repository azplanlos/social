import * as fc from 'fast-check';
import { formatTimestamp } from './NotificationPanel';

/**
 * Pure function for badge display logic.
 * Returns null if no badge should be shown (count is 0),
 * the exact number as string for 1–99,
 * and "99+" for counts above 99.
 */
export function getBadgeContent(unreadCount: number): string | null {
  if (unreadCount <= 0) return null;
  if (unreadCount <= 99) return String(unreadCount);
  return '99+';
}

describe('Feature: notification-list, Property 8: Badge-Anzeige folgt dem Ungelesen-Zähler', () => {
  /**
   * **Validates: Requirements 4.2, 4.3, 4.4**
   *
   * For any unread count n:
   * - if n == 0, no badge is shown (null)
   * - if 0 < n <= 99, the exact number is shown
   * - if n > 99, "99+" is shown
   */
  it('returns null for zero unread count', () => {
    expect(getBadgeContent(0)).toBeNull();
  });

  it('returns exact number for 1–99 and "99+" for >99', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (n: number) => {
        const result = getBadgeContent(n);

        if (n === 0) {
          expect(result).toBeNull();
        } else if (n <= 99) {
          expect(result).toBe(String(n));
        } else {
          expect(result).toBe('99+');
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: notification-list, Property 9: Zeitstempel-Formatierung Roundtrip', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.4**
   *
   * For any valid UTC timestamp (ISO-8601), converting to local timezone
   * and formatting as "TT.MM.JJJJ, HH:MM Uhr" produces a valid result with
   * two-digit day (01–31), two-digit month (01–12), four-digit year,
   * and 24-hour time (00:00–23:59).
   */
  it('formats any valid date to the expected pattern', () => {
    const timestampPattern = /^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}) Uhr$/;

    // Constrain dates to reasonable 4-digit year range
    const validDate = fc.date({
      min: new Date('2000-01-01T00:00:00.000Z'),
      max: new Date('9999-06-01T00:00:00.000Z'),
    });

    fc.assert(
      fc.property(validDate, (date: Date) => {
        const isoString = date.toISOString();
        const result = formatTimestamp(isoString);

        const match = result.match(timestampPattern);
        expect(match).not.toBeNull();

        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          const hour = parseInt(match[4], 10);
          const minute = parseInt(match[5], 10);

          expect(day).toBeGreaterThanOrEqual(1);
          expect(day).toBeLessThanOrEqual(31);
          expect(month).toBeGreaterThanOrEqual(1);
          expect(month).toBeLessThanOrEqual(12);
          expect(hour).toBeGreaterThanOrEqual(0);
          expect(hour).toBeLessThanOrEqual(23);
          expect(minute).toBeGreaterThanOrEqual(0);
          expect(minute).toBeLessThanOrEqual(59);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: notification-list, Property 10: Ungültige Zeitstempel zeigen Platzhalter', () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * For any Notification with an invalid timestamp (null, undefined, or unparseable string),
   * the display shows the placeholder text "\u2014".
   */
  it('returns "\u2014" for invalid timestamps', () => {
    const invalidTimestamps = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(''),
      fc.constant('invalid'),
      fc.constant('not-a-date'),
      fc.constant('2026-13-45T99:99:99Z'),
      fc.string().filter((s) => isNaN(new Date(s).getTime()))
    );

    fc.assert(
      fc.property(invalidTimestamps, (value: string | null | undefined) => {
        const result = formatTimestamp(value);
        expect(result).toBe('\u2014');
      }),
      { numRuns: 100 }
    );
  });
});
