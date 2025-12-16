import { describe, it, expect } from 'vitest';

/**
 * Tests for Smoke Trail behavior
 *
 * Key behaviors to verify:
 * 1. Smoke emits when speed > threshold AND not thrusting
 * 2. Smoke does NOT emit when speed <= threshold
 * 3. Smoke does NOT emit when thrusting
 * 4. Sonic boom triggers at speed >= 30
 * 5. Sonic boom resets when speed < 25
 * 6. Per-player sonic boom tracking
 * 7. Particle count scales with speed intensity
 * 8. Emission position calculation from back of ship
 */

describe('SmokeTrails', () => {
  // Constants matching GameScene
  const SMOKE_THRESHOLD = 8;
  const SONIC_BOOM_TRIGGER = 30;
  const SONIC_BOOM_RESET = 25;

  // Logic extracted from GameScene.updateSpeedLines()
  const shouldEmitSmoke = (speed: number, isThrusting: boolean): boolean => {
    return speed > SMOKE_THRESHOLD && !isThrusting;
  };

  const calculateParticleCount = (speed: number): number => {
    const intensity = Math.min((speed - SMOKE_THRESHOLD) / 15, 1);
    return 3 + Math.floor(intensity * 6);
  };

  const shouldTriggerSonicBoom = (speed: number, alreadyTriggered: boolean): boolean => {
    return speed >= SONIC_BOOM_TRIGGER && !alreadyTriggered;
  };

  const shouldResetSonicBoom = (speed: number): boolean => {
    return speed < SONIC_BOOM_RESET;
  };

  // Calculate back angle from ship rotation (matching GameScene logic)
  const calculateBackAngle = (rotation: number): number => {
    return rotation + Math.PI / 2;
  };

  // Calculate emission position from back of ship
  const calculateEmissionPosition = (
    shipX: number,
    shipY: number,
    rotation: number,
    offset: number
  ): { x: number; y: number } => {
    const backAngle = calculateBackAngle(rotation);
    return {
      x: shipX + Math.cos(backAngle) * offset,
      y: shipY + Math.sin(backAngle) * offset,
    };
  };

  describe('smoke emission conditions', () => {
    it('should emit smoke when speed > threshold and not thrusting', () => {
      expect(shouldEmitSmoke(10, false)).toBe(true);
      expect(shouldEmitSmoke(15, false)).toBe(true);
      expect(shouldEmitSmoke(25, false)).toBe(true);
    });

    it('should NOT emit smoke when speed <= threshold', () => {
      expect(shouldEmitSmoke(8, false)).toBe(false);
      expect(shouldEmitSmoke(5, false)).toBe(false);
      expect(shouldEmitSmoke(0, false)).toBe(false);
    });

    it('should NOT emit smoke when thrusting', () => {
      expect(shouldEmitSmoke(10, true)).toBe(false);
      expect(shouldEmitSmoke(20, true)).toBe(false);
      expect(shouldEmitSmoke(30, true)).toBe(false);
    });

    it('should NOT emit smoke when speed <= threshold AND thrusting', () => {
      expect(shouldEmitSmoke(5, true)).toBe(false);
      expect(shouldEmitSmoke(8, true)).toBe(false);
    });

    it('should emit at speed just above threshold', () => {
      expect(shouldEmitSmoke(8.1, false)).toBe(true);
      expect(shouldEmitSmoke(9, false)).toBe(true);
    });
  });

  describe('particle count calculation', () => {
    it('should return minimum count (3) at threshold speed', () => {
      // At speed 8, intensity is 0, so count is 3 + 0 = 3
      expect(calculateParticleCount(8)).toBe(3);
    });

    it('should scale particle count with speed', () => {
      // At speed 8 + 15 = 23, intensity is 1.0, so count is 3 + 6 = 9
      expect(calculateParticleCount(23)).toBe(9);
    });

    it('should cap particle count at maximum', () => {
      // Above speed 23, intensity is capped at 1.0
      expect(calculateParticleCount(50)).toBe(9);
      expect(calculateParticleCount(100)).toBe(9);
    });

    it('should increase gradually between min and max', () => {
      const countAt10 = calculateParticleCount(10);
      const countAt15 = calculateParticleCount(15);
      const countAt20 = calculateParticleCount(20);

      expect(countAt10).toBeGreaterThanOrEqual(3);
      expect(countAt15).toBeGreaterThan(countAt10);
      expect(countAt20).toBeGreaterThan(countAt15);
    });
  });

  describe('sonic boom trigger', () => {
    it('should trigger sonic boom at speed >= 30', () => {
      expect(shouldTriggerSonicBoom(30, false)).toBe(true);
      expect(shouldTriggerSonicBoom(35, false)).toBe(true);
      expect(shouldTriggerSonicBoom(50, false)).toBe(true);
    });

    it('should NOT trigger sonic boom below speed 30', () => {
      expect(shouldTriggerSonicBoom(29, false)).toBe(false);
      expect(shouldTriggerSonicBoom(25, false)).toBe(false);
      expect(shouldTriggerSonicBoom(10, false)).toBe(false);
    });

    it('should NOT trigger sonic boom if already triggered', () => {
      expect(shouldTriggerSonicBoom(30, true)).toBe(false);
      expect(shouldTriggerSonicBoom(50, true)).toBe(false);
    });

    it('should reset sonic boom flag when speed < 25', () => {
      expect(shouldResetSonicBoom(24)).toBe(true);
      expect(shouldResetSonicBoom(20)).toBe(true);
      expect(shouldResetSonicBoom(0)).toBe(true);
    });

    it('should NOT reset sonic boom flag when speed >= 25', () => {
      expect(shouldResetSonicBoom(25)).toBe(false);
      expect(shouldResetSonicBoom(30)).toBe(false);
    });
  });

  describe('per-player sonic boom tracking', () => {
    interface PlayerSonicState {
      sonicBoomTriggered: boolean;
    }

    it('should track sonic boom independently for each player', () => {
      const p1: PlayerSonicState = { sonicBoomTriggered: false };
      const p2: PlayerSonicState = { sonicBoomTriggered: false };

      // P1 triggers sonic boom
      if (shouldTriggerSonicBoom(30, p1.sonicBoomTriggered)) {
        p1.sonicBoomTriggered = true;
      }

      expect(p1.sonicBoomTriggered).toBe(true);
      expect(p2.sonicBoomTriggered).toBe(false);

      // P2 can still trigger independently
      if (shouldTriggerSonicBoom(30, p2.sonicBoomTriggered)) {
        p2.sonicBoomTriggered = true;
      }

      expect(p1.sonicBoomTriggered).toBe(true);
      expect(p2.sonicBoomTriggered).toBe(true);
    });

    it('should reset independently for each player', () => {
      const p1: PlayerSonicState = { sonicBoomTriggered: true };
      const p2: PlayerSonicState = { sonicBoomTriggered: true };

      // P1 slows down, P2 stays fast
      if (shouldResetSonicBoom(20)) {
        p1.sonicBoomTriggered = false;
      }
      // P2 stays at high speed
      if (shouldResetSonicBoom(30)) {
        p2.sonicBoomTriggered = false;
      }

      expect(p1.sonicBoomTriggered).toBe(false);
      expect(p2.sonicBoomTriggered).toBe(true);
    });
  });

  describe('emission position calculation', () => {
    it('should calculate back angle from rotation', () => {
      // Ship pointing up (rotation = 0), back is down (PI/2)
      expect(calculateBackAngle(0)).toBeCloseTo(Math.PI / 2);

      // Ship pointing right (rotation = PI/2), back is left (PI)
      expect(calculateBackAngle(Math.PI / 2)).toBeCloseTo(Math.PI);

      // Ship pointing down (rotation = PI), back is up (3*PI/2)
      expect(calculateBackAngle(Math.PI)).toBeCloseTo(3 * Math.PI / 2);
    });

    it('should emit from behind ship when pointing up', () => {
      const pos = calculateEmissionPosition(100, 100, 0, 18);
      // Ship pointing up, so back is below (positive Y)
      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(118); // 100 + 18
    });

    it('should emit from behind ship when pointing right', () => {
      const pos = calculateEmissionPosition(100, 100, Math.PI / 2, 18);
      // Ship pointing right, so back is to the left (negative X)
      expect(pos.x).toBeCloseTo(82); // 100 - 18
      expect(pos.y).toBeCloseTo(100);
    });

    it('should emit from behind ship when pointing down', () => {
      const pos = calculateEmissionPosition(100, 100, Math.PI, 18);
      // Ship pointing down, so back is above (negative Y)
      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(82); // 100 - 18
    });

    it('should emit from behind ship when pointing left', () => {
      const pos = calculateEmissionPosition(100, 100, -Math.PI / 2, 18);
      // Ship pointing left, so back is to the right (positive X)
      expect(pos.x).toBeCloseTo(118); // 100 + 18
      expect(pos.y).toBeCloseTo(100);
    });

    it('should respect offset distance', () => {
      const pos1 = calculateEmissionPosition(100, 100, 0, 10);
      const pos2 = calculateEmissionPosition(100, 100, 0, 20);

      expect(pos2.y - pos1.y).toBeCloseTo(10);
    });
  });

  describe('trail angle calculation', () => {
    // Trail angle is opposite to velocity direction
    const calculateTrailAngle = (vx: number, vy: number): number => {
      return Math.atan2(-vy, -vx) * (180 / Math.PI);
    };

    it('should point opposite to velocity when moving right', () => {
      const angle = calculateTrailAngle(10, 0);
      // atan2 returns -180 or 180 for left direction (equivalent)
      expect(Math.abs(angle)).toBeCloseTo(180); // Points left
    });

    it('should point opposite to velocity when moving down', () => {
      const angle = calculateTrailAngle(0, 10);
      expect(angle).toBeCloseTo(-90); // Points up
    });

    it('should point opposite to velocity when moving left', () => {
      const angle = calculateTrailAngle(-10, 0);
      expect(angle).toBeCloseTo(0); // Points right
    });

    it('should point opposite to velocity when moving up', () => {
      const angle = calculateTrailAngle(0, -10);
      expect(angle).toBeCloseTo(90); // Points down
    });

    it('should handle diagonal movement', () => {
      const angle = calculateTrailAngle(10, 10);
      expect(angle).toBeCloseTo(-135); // Points up-left
    });
  });

  describe('integration scenarios', () => {
    it('should simulate full smoke trail cycle', () => {
      let sonicBoomTriggered = false;
      const results: { smoke: boolean; sonicBoom: boolean }[] = [];

      // Simulate speed changes during gameplay
      const speeds = [5, 10, 15, 25, 30, 35, 20, 10, 5];
      const thrusting = [true, false, false, false, false, false, false, false, true];

      for (let i = 0; i < speeds.length; i++) {
        const speed = speeds[i];
        const isThrusting = thrusting[i];

        // Check sonic boom
        let sonicBoomThisFrame = false;
        if (shouldTriggerSonicBoom(speed, sonicBoomTriggered)) {
          sonicBoomTriggered = true;
          sonicBoomThisFrame = true;
        }
        if (shouldResetSonicBoom(speed)) {
          sonicBoomTriggered = false;
        }

        results.push({
          smoke: shouldEmitSmoke(speed, isThrusting),
          sonicBoom: sonicBoomThisFrame,
        });
      }

      // Verify expected behavior
      expect(results[0].smoke).toBe(false); // Speed 5, thrusting
      expect(results[1].smoke).toBe(true);  // Speed 10, not thrusting
      expect(results[2].smoke).toBe(true);  // Speed 15, not thrusting
      expect(results[3].smoke).toBe(true);  // Speed 25, not thrusting
      expect(results[4].smoke).toBe(true);  // Speed 30, not thrusting
      expect(results[4].sonicBoom).toBe(true); // Sonic boom triggered
      expect(results[5].smoke).toBe(true);  // Speed 35, not thrusting
      expect(results[5].sonicBoom).toBe(false); // Already triggered
      expect(results[6].smoke).toBe(true);  // Speed 20, not thrusting
      expect(results[7].smoke).toBe(true);  // Speed 10, not thrusting
      expect(results[8].smoke).toBe(false); // Speed 5, thrusting
    });
  });
});
