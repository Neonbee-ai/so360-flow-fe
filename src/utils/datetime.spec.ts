import { describe, it, expect } from 'vitest';
import { parseUtcDate } from './datetime';

describe('parseUtcDate', () => {
  describe('Given a timezone-less timestamp (Postgres "timestamp without time zone")', () => {
    it('When in ISO "T" form, Then it is interpreted as UTC', () => {
      // Given
      const naive = '2026-06-03T14:54:00';
      // When
      const result = parseUtcDate(naive);
      // Then
      expect(result.getTime()).toBe(Date.UTC(2026, 5, 3, 14, 54, 0));
    });

    it('When in space-separated form, Then it is interpreted as UTC', () => {
      // Given
      const naive = '2026-06-03 14:54:00';
      // When
      const result = parseUtcDate(naive);
      // Then
      expect(result.getTime()).toBe(Date.UTC(2026, 5, 3, 14, 54, 0));
    });
  });

  describe('Given a timestamp already carrying timezone info', () => {
    it('When it ends with Z, Then it is left unchanged', () => {
      // Given
      const withZ = '2026-06-03T14:54:00Z';
      // When
      const result = parseUtcDate(withZ);
      // Then
      expect(result.getTime()).toBe(Date.UTC(2026, 5, 3, 14, 54, 0));
    });

    it('When it carries a +05:30 offset, Then no Z is appended and the offset is honored', () => {
      // Given
      const withOffset = '2026-06-03T14:54:00+05:30';
      // When
      const result = parseUtcDate(withOffset);
      // Then — 14:54 IST == 09:24 UTC
      expect(result.getTime()).toBe(Date.UTC(2026, 5, 3, 9, 24, 0));
    });
  });

  describe('Given a non-string value', () => {
    it('When it is a Date object, Then it is returned as-is', () => {
      // Given
      const d = new Date('2026-06-03T14:54:00Z');
      // When
      const result = parseUtcDate(d);
      // Then
      expect(result).toBe(d);
    });

    it('When it is an epoch number, Then it is wrapped directly', () => {
      // Given
      const epoch = Date.UTC(2026, 5, 3, 14, 54, 0);
      // When
      const result = parseUtcDate(epoch);
      // Then
      expect(result.getTime()).toBe(epoch);
    });
  });

  describe('Given a date-only string', () => {
    it('When it has no time component, Then it parses as UTC midnight', () => {
      // Given
      const dateOnly = '2026-06-03';
      // When
      const result = parseUtcDate(dateOnly);
      // Then
      expect(result.getTime()).toBe(Date.UTC(2026, 5, 3, 0, 0, 0));
    });
  });
});
