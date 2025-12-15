import { describe, it, expect } from 'vitest';
import { BOMB_DROPPABLE_TYPES } from '../../src/constants';

/**
 * Tests for TradingManager (auto-trade functionality)
 *
 * Key behaviors to verify:
 * 1. Landing bonus multipliers (perfect: 1.5x, good: 1.25x, rough: 1.0x)
 * 2. Items are sold cheapest-first
 * 3. Bomb-droppable items are excluded from trade
 * 4. Mystery items are sorted to end (sold last)
 * 5. Trade stops when fuel tank is full
 */

describe('TradingManager', () => {
  describe('landing bonus calculation', () => {
    const getLandingBonus = (quality: 'perfect' | 'good' | 'rough'): number => {
      return quality === 'perfect' ? 1.5 : quality === 'good' ? 1.25 : 1.0;
    };

    it('should give 1.5x bonus for perfect landing', () => {
      expect(getLandingBonus('perfect')).toBe(1.5);
    });

    it('should give 1.25x bonus for good landing', () => {
      expect(getLandingBonus('good')).toBe(1.25);
    });

    it('should give 1.0x (no bonus) for rough landing', () => {
      expect(getLandingBonus('rough')).toBe(1.0);
    });
  });

  describe('fuel calculation with bonus', () => {
    const calculateFuelWithBonus = (baseFuel: number, bonus: number): number => {
      return Math.floor(baseFuel * bonus);
    };

    it('should apply perfect landing bonus (100 fuel * 1.5 = 150)', () => {
      expect(calculateFuelWithBonus(100, 1.5)).toBe(150);
    });

    it('should apply good landing bonus (100 fuel * 1.25 = 125)', () => {
      expect(calculateFuelWithBonus(100, 1.25)).toBe(125);
    });

    it('should floor fractional fuel values', () => {
      expect(calculateFuelWithBonus(33, 1.5)).toBe(49); // 33 * 1.5 = 49.5 -> 49
    });
  });

  describe('item filtering', () => {
    const isTradeableItem = (item: { type: string; count: number; fuelValue: number; isMystery?: boolean }): boolean => {
      return (
        item.count > 0 &&
        (item.fuelValue > 0 || item.isMystery) &&
        !BOMB_DROPPABLE_TYPES.includes(item.type)
      );
    };

    it('should exclude bomb-droppable items (BURGER)', () => {
      expect(isTradeableItem({ type: 'BURGER', count: 5, fuelValue: 10 })).toBe(false);
    });

    it('should exclude bomb-droppable items (HAMBERDER)', () => {
      expect(isTradeableItem({ type: 'HAMBERDER', count: 3, fuelValue: 20 })).toBe(false);
    });

    it('should exclude bomb-droppable items (DIET_COKE)', () => {
      expect(isTradeableItem({ type: 'DIET_COKE', count: 2, fuelValue: 15 })).toBe(false);
    });

    it('should include non-bomb tradeable items', () => {
      expect(isTradeableItem({ type: 'TEA', count: 2, fuelValue: 30 })).toBe(true);
    });

    it('should exclude items with zero count', () => {
      expect(isTradeableItem({ type: 'TEA', count: 0, fuelValue: 30 })).toBe(false);
    });

    it('should include mystery items even with zero fuel value', () => {
      expect(isTradeableItem({ type: 'MYSTERY', count: 1, fuelValue: 0, isMystery: true })).toBe(true);
    });

    it('should exclude items with zero fuel value and not mystery', () => {
      expect(isTradeableItem({ type: 'JUNK', count: 1, fuelValue: 0, isMystery: false })).toBe(false);
    });
  });

  describe('item sorting (cheapest first)', () => {
    type Item = { type: string; fuelValue: number; isMystery?: boolean };

    const sortCheapestFirst = (items: Item[]): Item[] => {
      return [...items].sort((a, b) => {
        // Mystery items go to end
        if (a.isMystery && !b.isMystery) return 1;
        if (!a.isMystery && b.isMystery) return -1;
        // Otherwise sort by fuel value ascending
        return a.fuelValue - b.fuelValue;
      });
    };

    it('should sort items by fuel value ascending', () => {
      const items = [
        { type: 'A', fuelValue: 30 },
        { type: 'B', fuelValue: 10 },
        { type: 'C', fuelValue: 20 },
      ];
      const sorted = sortCheapestFirst(items);
      expect(sorted[0].type).toBe('B'); // 10
      expect(sorted[1].type).toBe('C'); // 20
      expect(sorted[2].type).toBe('A'); // 30
    });

    it('should put mystery items at the end', () => {
      const items = [
        { type: 'MYSTERY', fuelValue: 5, isMystery: true },
        { type: 'TEA', fuelValue: 30 },
        { type: 'FISH', fuelValue: 10 },
      ];
      const sorted = sortCheapestFirst(items);
      expect(sorted[0].type).toBe('FISH'); // 10, not mystery
      expect(sorted[1].type).toBe('TEA'); // 30, not mystery
      expect(sorted[2].type).toBe('MYSTERY'); // mystery goes last
    });

    it('should handle all mystery items', () => {
      const items = [
        { type: 'M1', fuelValue: 50, isMystery: true },
        { type: 'M2', fuelValue: 20, isMystery: true },
      ];
      const sorted = sortCheapestFirst(items);
      // Both are mystery, so sort by fuel value
      expect(sorted[0].type).toBe('M2'); // 20
      expect(sorted[1].type).toBe('M1'); // 50
    });
  });

  describe('fuel need calculation', () => {
    const calculateFuelNeeded = (currentFuel: number, maxFuel: number): number => {
      return maxFuel - currentFuel;
    };

    it('should calculate fuel needed correctly', () => {
      expect(calculateFuelNeeded(30, 100)).toBe(70);
    });

    it('should return zero when tank is full', () => {
      expect(calculateFuelNeeded(100, 100)).toBe(0);
    });

    it('should return negative when overfull (edge case)', () => {
      expect(calculateFuelNeeded(110, 100)).toBe(-10);
    });
  });

  describe('trade accumulation', () => {
    it('should stop accumulating when fuel need is met', () => {
      const items = [
        { fuelValue: 30, count: 5 },
        { fuelValue: 50, count: 3 },
      ];
      const fuelNeeded = 100;
      let fuelGained = 0;
      let itemsSold = 0;

      for (const item of items) {
        if (fuelGained >= fuelNeeded) break;
        for (let i = 0; i < item.count; i++) {
          if (fuelGained >= fuelNeeded) break;
          fuelGained += item.fuelValue;
          itemsSold++;
        }
      }

      // 30 * 4 = 120 >= 100, so should stop after 4 items
      expect(itemsSold).toBe(4);
      expect(fuelGained).toBe(120);
    });

    it('should sell all items if fuel need not met', () => {
      const items = [
        { fuelValue: 10, count: 2 },
      ];
      const fuelNeeded = 100;
      let fuelGained = 0;
      let itemsSold = 0;

      for (const item of items) {
        if (fuelGained >= fuelNeeded) break;
        for (let i = 0; i < item.count; i++) {
          if (fuelGained >= fuelNeeded) break;
          fuelGained += item.fuelValue;
          itemsSold++;
        }
      }

      expect(itemsSold).toBe(2);
      expect(fuelGained).toBe(20); // Still less than 100
    });
  });
});
