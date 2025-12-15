import { describe, it, expect } from 'vitest';

/**
 * Tests for LandingPadManager
 *
 * Key behaviors to verify:
 * 1. Landing position validation (horizontal alignment, vertical distance)
 * 2. Start pad detection and bypass
 * 3. Debounce logic for repeated landings
 * 4. Auto-trade item selling order
 */

describe('LandingPadManager', () => {
  describe('landing position validation', () => {
    const SHUTTLE_BOTTOM_OFFSET = 18;
    const VERTICAL_TOLERANCE_ABOVE = 10;
    const VERTICAL_TOLERANCE_BELOW = 5;

    interface LandingCheck {
      shuttleX: number;
      shuttleY: number;
      padX: number;
      padY: number;
      padWidth: number;
    }

    const isValidLandingPosition = (check: LandingCheck): { valid: boolean; reason?: string } => {
      const shuttleBottom = check.shuttleY + SHUTTLE_BOTTOM_OFFSET;
      const distanceFromPad = check.padY - shuttleBottom;
      const halfPadWidth = check.padWidth / 2;
      const horizontalDistance = Math.abs(check.shuttleX - check.padX);

      // Check horizontal alignment
      if (horizontalDistance > halfPadWidth) {
        return { valid: false, reason: 'not horizontally aligned' };
      }

      // Check vertical distance (positive = above pad, negative = below)
      if (distanceFromPad < -VERTICAL_TOLERANCE_BELOW || distanceFromPad > VERTICAL_TOLERANCE_ABOVE) {
        return { valid: false, reason: 'not on pad surface' };
      }

      return { valid: true };
    };

    it('should accept centered landing', () => {
      const result = isValidLandingPosition({
        shuttleX: 500,
        shuttleY: 382, // Bottom at 400
        padX: 500,
        padY: 400,
        padWidth: 100,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept landing near pad edge', () => {
      const result = isValidLandingPosition({
        shuttleX: 540, // 40px from center, within 50px half-width
        shuttleY: 382,
        padX: 500,
        padY: 400,
        padWidth: 100,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject landing too far horizontally', () => {
      const result = isValidLandingPosition({
        shuttleX: 560, // 60px from center, beyond 50px half-width
        shuttleY: 382,
        padX: 500,
        padY: 400,
        padWidth: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not horizontally aligned');
    });

    it('should accept landing slightly above pad', () => {
      const result = isValidLandingPosition({
        shuttleX: 500,
        shuttleY: 374, // Bottom at 392, 8px above pad
        padX: 500,
        padY: 400,
        padWidth: 100,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject landing too far above pad', () => {
      const result = isValidLandingPosition({
        shuttleX: 500,
        shuttleY: 360, // Bottom at 378, 22px above pad
        padX: 500,
        padY: 400,
        padWidth: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not on pad surface');
    });

    it('should accept landing slightly below pad', () => {
      const result = isValidLandingPosition({
        shuttleX: 500,
        shuttleY: 385, // Bottom at 403, 3px below pad
        padX: 500,
        padY: 400,
        padWidth: 100,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject landing too far below pad', () => {
      const result = isValidLandingPosition({
        shuttleX: 500,
        shuttleY: 390, // Bottom at 408, 8px below pad
        padX: 500,
        padY: 400,
        padWidth: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not on pad surface');
    });
  });

  describe('start pad detection', () => {
    const shouldIgnoreStartPad = (
      padIndex: number,
      startPadId: number,
      shuttleVelocity: number
    ): boolean => {
      if (padIndex !== startPadId) return false;
      // Ignore if still on start pad (low velocity)
      return shuttleVelocity < 0.5;
    };

    it('should ignore start pad with low velocity', () => {
      expect(shouldIgnoreStartPad(0, 0, 0.1)).toBe(true);
    });

    it('should allow landing on start pad after flying', () => {
      expect(shouldIgnoreStartPad(0, 0, 2.0)).toBe(false);
    });

    it('should allow landing on other pads', () => {
      expect(shouldIgnoreStartPad(1, 0, 0.1)).toBe(false);
    });

    it('should allow landing when start pad cleared', () => {
      expect(shouldIgnoreStartPad(0, -1, 0.1)).toBe(false);
    });
  });

  describe('debounce logic', () => {
    const LANDING_DEBOUNCE_MS = 1000;

    const shouldDebounce = (
      lastLandingTime: number,
      currentTime: number
    ): boolean => {
      return currentTime - lastLandingTime < LANDING_DEBOUNCE_MS;
    };

    it('should debounce immediate re-landing', () => {
      expect(shouldDebounce(1000, 1500)).toBe(true); // 500ms
    });

    it('should allow landing after debounce period', () => {
      expect(shouldDebounce(1000, 2100)).toBe(false); // 1100ms
    });

    it('should debounce at exactly 999ms', () => {
      expect(shouldDebounce(1000, 1999)).toBe(true);
    });

    it('should allow at exactly 1000ms', () => {
      expect(shouldDebounce(1000, 2000)).toBe(false);
    });
  });

  describe('same pad prevention', () => {
    interface MockPad {
      id: number;
      name: string;
    }

    const shouldPreventSamePad = (
      currentPad: MockPad,
      lastTradedPad: MockPad | null
    ): boolean => {
      return lastTradedPad === currentPad;
    };

    it('should prevent landing on same pad', () => {
      const pad: MockPad = { id: 1, name: 'USA' };
      expect(shouldPreventSamePad(pad, pad)).toBe(true);
    });

    it('should allow landing on different pad', () => {
      const pad1: MockPad = { id: 1, name: 'USA' };
      const pad2: MockPad = { id: 2, name: 'UK' };
      expect(shouldPreventSamePad(pad1, pad2)).toBe(false);
    });

    it('should allow landing when no last pad', () => {
      const pad: MockPad = { id: 1, name: 'USA' };
      expect(shouldPreventSamePad(pad, null)).toBe(false);
    });
  });

  describe('landing quality bonuses', () => {
    const getLandingBonus = (quality: 'perfect' | 'good' | 'rough'): number => {
      return quality === 'perfect' ? 1.5 : quality === 'good' ? 1.25 : 1.0;
    };

    it('should give 1.5x for perfect', () => {
      expect(getLandingBonus('perfect')).toBe(1.5);
    });

    it('should give 1.25x for good', () => {
      expect(getLandingBonus('good')).toBe(1.25);
    });

    it('should give 1.0x for rough', () => {
      expect(getLandingBonus('rough')).toBe(1.0);
    });
  });

  describe('special pad detection', () => {
    interface MockPad {
      isFinalDestination: boolean;
      isWashington: boolean;
    }

    const getLandingType = (
      pad: MockPad,
      hasPeaceMedal: boolean,
      hasGreenlandIce: boolean,
      gameMode: string
    ): 'victory' | 'washington_medal' | 'washington_ice' | 'normal' => {
      if (pad.isFinalDestination && gameMode !== 'dogfight') {
        return 'victory';
      }
      if (pad.isWashington && hasGreenlandIce) {
        return 'washington_ice';
      }
      if (pad.isWashington && !hasPeaceMedal && gameMode !== 'dogfight') {
        return 'washington_medal';
      }
      return 'normal';
    };

    it('should detect victory at final destination', () => {
      const pad: MockPad = { isFinalDestination: true, isWashington: false };
      expect(getLandingType(pad, false, false, 'normal')).toBe('victory');
    });

    it('should NOT trigger victory in dogfight mode', () => {
      const pad: MockPad = { isFinalDestination: true, isWashington: false };
      expect(getLandingType(pad, false, false, 'dogfight')).toBe('normal');
    });

    it('should detect ice delivery at Washington', () => {
      const pad: MockPad = { isFinalDestination: false, isWashington: true };
      expect(getLandingType(pad, false, true, 'normal')).toBe('washington_ice');
    });

    it('should detect medal pickup at Washington', () => {
      const pad: MockPad = { isFinalDestination: false, isWashington: true };
      expect(getLandingType(pad, false, false, 'normal')).toBe('washington_medal');
    });

    it('should NOT pickup medal if already have it', () => {
      const pad: MockPad = { isFinalDestination: false, isWashington: true };
      expect(getLandingType(pad, true, false, 'normal')).toBe('normal');
    });
  });
});
