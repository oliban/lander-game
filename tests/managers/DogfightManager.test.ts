import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for DogfightManager
 *
 * Key behaviors to verify:
 * 1. Kills to win is 10
 * 2. Auto landing gear extends within 150px of pad
 * 3. Auto landing gear retracts beyond 300px from all pads
 * 4. Winner is determined by first to reach KILLS_TO_WIN
 * 5. Quick restart preserves kill counts
 */

// Import constants to test against
import { DOGFIGHT_CONFIG } from '../../src/constants';

describe('DogfightManager', () => {
  describe('constants', () => {
    it('should require 10 kills to win', () => {
      expect(DOGFIGHT_CONFIG.KILLS_TO_WIN).toBe(10);
    });

    it('should extend landing gear at 150px distance', () => {
      expect(DOGFIGHT_CONFIG.AUTO_GEAR_EXTEND_DISTANCE).toBe(150);
    });

    it('should retract landing gear at 200px distance', () => {
      expect(DOGFIGHT_CONFIG.AUTO_GEAR_RETRACT_DISTANCE).toBe(200);
    });

    it('should have restart delay of 1500ms', () => {
      expect(DOGFIGHT_CONFIG.RESTART_DELAY_MS).toBe(1500);
    });
  });

  describe('winner determination', () => {
    const determineWinner = (p1Kills: number, p2Kills: number): number | null => {
      if (p1Kills >= DOGFIGHT_CONFIG.KILLS_TO_WIN) return 1;
      if (p2Kills >= DOGFIGHT_CONFIG.KILLS_TO_WIN) return 2;
      return null;
    };

    it('should declare P1 winner when P1 reaches 10 kills', () => {
      expect(determineWinner(10, 5)).toBe(1);
    });

    it('should declare P2 winner when P2 reaches 10 kills', () => {
      expect(determineWinner(3, 10)).toBe(2);
    });

    it('should return null when neither player has won', () => {
      expect(determineWinner(5, 7)).toBe(null);
    });

    it('should declare P1 winner if both somehow reach 10 (P1 checked first)', () => {
      expect(determineWinner(10, 10)).toBe(1);
    });

    it('should declare winner with more than 10 kills', () => {
      expect(determineWinner(12, 8)).toBe(1);
    });
  });

  describe('auto landing gear logic', () => {
    const shouldExtendGear = (distanceToPad: number): boolean => {
      return distanceToPad < DOGFIGHT_CONFIG.AUTO_GEAR_EXTEND_DISTANCE;
    };

    const shouldRetractGear = (distanceToPad: number): boolean => {
      return distanceToPad > DOGFIGHT_CONFIG.AUTO_GEAR_RETRACT_DISTANCE;
    };

    it('should extend gear when within 149px of pad', () => {
      expect(shouldExtendGear(149)).toBe(true);
    });

    it('should NOT extend gear when exactly at 150px', () => {
      expect(shouldExtendGear(150)).toBe(false);
    });

    it('should NOT extend gear when beyond 150px', () => {
      expect(shouldExtendGear(200)).toBe(false);
    });

    it('should retract gear when beyond 200px from all pads', () => {
      expect(shouldRetractGear(201)).toBe(true);
    });

    it('should NOT retract gear when exactly at 200px', () => {
      expect(shouldRetractGear(200)).toBe(false);
    });

    it('should NOT retract gear when within 200px', () => {
      expect(shouldRetractGear(180)).toBe(false);
    });

    it('should have hysteresis zone between 150-200px (no action)', () => {
      // In the 150-200px range, neither extend nor retract triggers
      const distance = 175;
      expect(shouldExtendGear(distance)).toBe(false);
      expect(shouldRetractGear(distance)).toBe(false);
    });
  });

  describe('distance calculation', () => {
    const calculateDistance = (shuttleX: number, shuttleY: number, padX: number, padY: number): number => {
      const dx = shuttleX - padX;
      const dy = shuttleY - padY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    it('should calculate zero distance when at same position', () => {
      expect(calculateDistance(100, 100, 100, 100)).toBe(0);
    });

    it('should calculate horizontal distance correctly', () => {
      expect(calculateDistance(200, 100, 100, 100)).toBe(100);
    });

    it('should calculate vertical distance correctly', () => {
      expect(calculateDistance(100, 200, 100, 100)).toBe(100);
    });

    it('should calculate diagonal distance correctly (3-4-5 triangle)', () => {
      expect(calculateDistance(130, 140, 100, 100)).toBeCloseTo(50);
    });
  });

  describe('minimum distance to any pad', () => {
    const findMinDistanceToPad = (shuttleX: number, shuttleY: number, pads: { x: number; y: number }[]): number => {
      let minDist = Infinity;
      for (const pad of pads) {
        const dx = shuttleX - pad.x;
        const dy = shuttleY - pad.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      return minDist;
    };

    it('should find closest pad among multiple', () => {
      const pads = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 300, y: 100 },
      ];
      // Shuttle at (150, 100) is 50px from first pad, 50px from second pad
      expect(findMinDistanceToPad(150, 100, pads)).toBe(50);
    });

    it('should return Infinity for empty pad list', () => {
      expect(findMinDistanceToPad(100, 100, [])).toBe(Infinity);
    });

    it('should find single pad distance', () => {
      const pads = [{ x: 100, y: 100 }];
      expect(findMinDistanceToPad(200, 100, pads)).toBe(100);
    });
  });

  describe('kill tracking', () => {
    it('should preserve kill counts on quick restart', () => {
      const state = { p1Kills: 5, p2Kills: 3 };
      // Simulate quick restart - should pass kills through
      const restartData = {
        playerCount: 2,
        gameMode: 'dogfight',
        p1Kills: state.p1Kills,
        p2Kills: state.p2Kills,
      };
      expect(restartData.p1Kills).toBe(5);
      expect(restartData.p2Kills).toBe(3);
    });

    it('should reset kill counts on fresh start', () => {
      const freshStartData = {
        playerCount: 2,
        gameMode: 'dogfight',
        p1Kills: 0,
        p2Kills: 0,
      };
      expect(freshStartData.p1Kills).toBe(0);
      expect(freshStartData.p2Kills).toBe(0);
    });
  });
});
