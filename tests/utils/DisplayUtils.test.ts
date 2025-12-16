import { describe, it, expect } from 'vitest';
import { formatDollarValue } from '../../src/utils/DisplayUtils';

describe('DisplayUtils', () => {
  describe('formatDollarValue', () => {
    it('should format numeric value with dollar sign', () => {
      expect(formatDollarValue(45)).toBe('$45');
    });

    it('should format zero value', () => {
      expect(formatDollarValue(0)).toBe('$0');
    });

    it('should format large numeric value', () => {
      expect(formatDollarValue(1000)).toBe('$1000');
    });

    it('should format with prefix', () => {
      expect(formatDollarValue(100, '+')).toBe('+$100');
    });

    it('should format with minus prefix', () => {
      expect(formatDollarValue(50, '-')).toBe('-$50');
    });

    it('should handle string values for mystery items', () => {
      expect(formatDollarValue('???')).toBe('$???');
    });

    it('should handle empty prefix by default', () => {
      expect(formatDollarValue(25)).toBe('$25');
      expect(formatDollarValue(25, '')).toBe('$25');
    });

    it('should handle negative numbers', () => {
      expect(formatDollarValue(-10)).toBe('$-10');
    });

    it('should handle decimal values', () => {
      expect(formatDollarValue(99.99)).toBe('$99.99');
    });
  });
});
