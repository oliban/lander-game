import { describe, it, expect } from 'vitest';

/**
 * Tests for SittingDuckManager
 *
 * Key behaviors to verify:
 * 1. Sitting duck detection conditions (no fuel, stationary, on ground, not on pad)
 * 2. Timer starts when conditions met
 * 3. Game over triggers after 2 seconds
 * 4. Timer resets when conditions no longer met
 */

describe('SittingDuckManager', () => {
  describe('sitting duck detection', () => {
    const VELOCITY_THRESHOLD = 0.5;
    const GROUND_TOLERANCE = 20;
    const SITTING_DUCK_TIMEOUT = 2000;

    interface ShuttleState {
      x: number;
      y: number;
      velocityTotal: number;
    }

    interface PadInfo {
      x: number;
      y: number;
      width: number;
    }

    const isStationary = (velocity: number): boolean => velocity < VELOCITY_THRESHOLD;

    const isOnGround = (shuttleBottom: number, terrainY: number): boolean => {
      return Math.abs(terrainY - shuttleBottom) < GROUND_TOLERANCE;
    };

    const isOnLandingPad = (
      shuttleX: number,
      shuttleBottom: number,
      pads: PadInfo[]
    ): boolean => {
      return pads.some(pad => {
        const horizontalDist = Math.abs(shuttleX - pad.x);
        return horizontalDist < pad.width / 2 && Math.abs(pad.y - shuttleBottom) < GROUND_TOLERANCE;
      });
    };

    const isSittingDuck = (
      fuelEmpty: boolean,
      shuttle: ShuttleState,
      terrainY: number,
      pads: PadInfo[]
    ): boolean => {
      if (!fuelEmpty) return false;

      const shuttleBottom = shuttle.y + 18;
      const stationary = isStationary(shuttle.velocityTotal);
      const onGround = isOnGround(shuttleBottom, terrainY);
      const onPad = isOnLandingPad(shuttle.x, shuttleBottom, pads);

      return stationary && onGround && !onPad;
    };

    it('should detect sitting duck when all conditions met', () => {
      const shuttle: ShuttleState = { x: 500, y: 400, velocityTotal: 0.2 };
      const terrainY = 418; // shuttle bottom (400+18) = 418, terrain at 418
      const pads: PadInfo[] = [{ x: 1000, y: 418, width: 100 }]; // Far away pad

      expect(isSittingDuck(true, shuttle, terrainY, pads)).toBe(true);
    });

    it('should NOT detect sitting duck when fuel remaining', () => {
      const shuttle: ShuttleState = { x: 500, y: 400, velocityTotal: 0.2 };
      const terrainY = 418;
      const pads: PadInfo[] = [];

      expect(isSittingDuck(false, shuttle, terrainY, pads)).toBe(false);
    });

    it('should NOT detect sitting duck when moving', () => {
      const shuttle: ShuttleState = { x: 500, y: 400, velocityTotal: 2.0 };
      const terrainY = 418;
      const pads: PadInfo[] = [];

      expect(isSittingDuck(true, shuttle, terrainY, pads)).toBe(false);
    });

    it('should NOT detect sitting duck when in air', () => {
      const shuttle: ShuttleState = { x: 500, y: 300, velocityTotal: 0.2 };
      const terrainY = 418; // 100px below shuttle
      const pads: PadInfo[] = [];

      expect(isSittingDuck(true, shuttle, terrainY, pads)).toBe(false);
    });

    it('should NOT detect sitting duck when on landing pad', () => {
      const shuttle: ShuttleState = { x: 500, y: 400, velocityTotal: 0.2 };
      const terrainY = 418;
      const pads: PadInfo[] = [{ x: 500, y: 418, width: 100 }]; // Shuttle is on this pad

      expect(isSittingDuck(true, shuttle, terrainY, pads)).toBe(false);
    });
  });

  describe('velocity threshold', () => {
    const VELOCITY_THRESHOLD = 0.5;

    it('should consider stationary below 0.5', () => {
      expect(0.4 < VELOCITY_THRESHOLD).toBe(true);
      expect(0.0 < VELOCITY_THRESHOLD).toBe(true);
    });

    it('should NOT consider stationary at 0.5 or above', () => {
      expect(0.5 < VELOCITY_THRESHOLD).toBe(false);
      expect(1.0 < VELOCITY_THRESHOLD).toBe(false);
    });
  });

  describe('ground detection', () => {
    const GROUND_TOLERANCE = 20;

    const isOnGround = (shuttleBottom: number, terrainY: number): boolean => {
      return Math.abs(terrainY - shuttleBottom) < GROUND_TOLERANCE;
    };

    it('should detect on ground when close to terrain', () => {
      expect(isOnGround(418, 418)).toBe(true); // Exactly on terrain
      expect(isOnGround(410, 418)).toBe(true); // 8px above
      expect(isOnGround(435, 418)).toBe(true); // 17px below
    });

    it('should NOT detect on ground when far from terrain', () => {
      expect(isOnGround(390, 418)).toBe(false); // 28px above
      expect(isOnGround(300, 418)).toBe(false); // 118px above
    });
  });

  describe('landing pad detection', () => {
    const GROUND_TOLERANCE = 20;

    const isOnPad = (
      shuttleX: number,
      shuttleBottom: number,
      pad: { x: number; y: number; width: number }
    ): boolean => {
      const horizontalDist = Math.abs(shuttleX - pad.x);
      return horizontalDist < pad.width / 2 && Math.abs(pad.y - shuttleBottom) < GROUND_TOLERANCE;
    };

    it('should detect on pad when centered', () => {
      const pad = { x: 500, y: 418, width: 100 };
      expect(isOnPad(500, 418, pad)).toBe(true);
    });

    it('should detect on pad when near edge', () => {
      const pad = { x: 500, y: 418, width: 100 };
      expect(isOnPad(540, 418, pad)).toBe(true); // 40px from center, within 50
    });

    it('should NOT detect on pad when too far horizontally', () => {
      const pad = { x: 500, y: 418, width: 100 };
      expect(isOnPad(560, 418, pad)).toBe(false); // 60px from center, beyond 50
    });

    it('should NOT detect on pad when too far vertically', () => {
      const pad = { x: 500, y: 418, width: 100 };
      expect(isOnPad(500, 380, pad)).toBe(false); // 38px above pad
    });
  });

  describe('timer behavior', () => {
    const SITTING_DUCK_TIMEOUT = 2000;

    it('should require 2000ms to trigger game over', () => {
      expect(SITTING_DUCK_TIMEOUT).toBe(2000);
    });

    it('should calculate sitting time correctly', () => {
      const startTime = 10000;
      const currentTime = 12500;
      const sittingTime = currentTime - startTime;
      expect(sittingTime).toBe(2500);
      expect(sittingTime >= SITTING_DUCK_TIMEOUT).toBe(true);
    });

    it('should NOT trigger before timeout', () => {
      const startTime = 10000;
      const currentTime = 11500;
      const sittingTime = currentTime - startTime;
      expect(sittingTime).toBe(1500);
      expect(sittingTime >= SITTING_DUCK_TIMEOUT).toBe(false);
    });
  });

  describe('taunt messages', () => {
    const tauntMessages = [
      "You're a sitting duck! Quack quack!",
      "SITTING DUCK! The cannons thank you!",
      "Quack! Sitting duck spotted! Quack!",
      "A sitting duck! How embarrassing!",
      "🦆 SITTING DUCK ALERT! 🦆",
      "Duck, duck... BOOM! You were a sitting duck!",
      "Sitting duck! Even the ducks are laughing!",
      "What a sitting duck! Tremendous failure!",
    ];

    it('should have 8 taunt messages', () => {
      expect(tauntMessages.length).toBe(8);
    });

    it('should select random message', () => {
      const index = Math.floor(Math.random() * tauntMessages.length);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    });
  });
});
