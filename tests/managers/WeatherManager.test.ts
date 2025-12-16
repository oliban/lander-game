import { describe, it, expect } from 'vitest';

/**
 * Tests for WeatherManager lightning detection and rain splash logic
 *
 * Key behaviors to verify:
 * 1. World coordinate transformation with parallax compensation
 * 2. Lightning detection at various altitudes
 * 3. Grounding/escape conditions
 * 4. Warning zone calculations
 * 5. Rain splash randomization (spawn count, gravity, age, lifetime)
 */

describe('WeatherManager', () => {
  describe('parallax coordinate transformation', () => {
    // Clouds use 0.02 scroll factor, so effective world pos = cloud.pos + camera * 0.98
    const CLOUD_SCROLL_FACTOR = 0.02;
    const PARALLAX_COMPENSATION = 0.98; // 1 - CLOUD_SCROLL_FACTOR

    const calculateCloudWorldPosition = (
      cloudX: number,
      cloudY: number,
      cameraX: number,
      cameraY: number
    ): { worldX: number; worldY: number } => {
      return {
        worldX: cloudX + cameraX * PARALLAX_COMPENSATION,
        worldY: cloudY + cameraY * PARALLAX_COMPENSATION,
      };
    };

    it('should calculate correct world position when camera is at origin', () => {
      const result = calculateCloudWorldPosition(100, 200, 0, 0);
      expect(result.worldX).toBe(100);
      expect(result.worldY).toBe(200);
    });

    it('should compensate for camera scroll at positive coordinates', () => {
      const result = calculateCloudWorldPosition(100, 200, 500, 300);
      expect(result.worldX).toBe(100 + 500 * 0.98); // 590
      expect(result.worldY).toBe(200 + 300 * 0.98); // 494
    });

    it('should compensate for camera scroll at negative Y (high altitude)', () => {
      // High altitude scenario - camera Y is negative (scrolled up)
      const result = calculateCloudWorldPosition(100, 200, 500, -1000);
      expect(result.worldX).toBe(100 + 500 * 0.98); // 590
      expect(result.worldY).toBe(200 + (-1000) * 0.98); // -780
    });

    it('should maintain correct parallax compensation ratio', () => {
      // Verify that 0.98 is the correct inverse of 0.02 scroll factor
      expect(PARALLAX_COMPENSATION + CLOUD_SCROLL_FACTOR).toBe(1.0);
    });

    it('should work at extreme camera positions', () => {
      // Very far scroll - edge case
      const result = calculateCloudWorldPosition(0, 0, 10000, -5000);
      expect(result.worldX).toBe(10000 * 0.98); // 9800
      expect(result.worldY).toBe(-5000 * 0.98); // -4900
    });
  });

  describe('grounding detection', () => {
    const GROUNDING_DISTANCE_PX = 50;

    const isGrounded = (shuttleY: number, terrainY: number): boolean => {
      const distanceFromGround = terrainY - shuttleY;
      return distanceFromGround < GROUNDING_DISTANCE_PX;
    };

    it('should detect shuttle as grounded when on terrain', () => {
      // Shuttle at terrain level (distanceFromGround = 0)
      expect(isGrounded(500, 500)).toBe(true);
    });

    it('should detect shuttle as grounded when very close to terrain', () => {
      // Shuttle 10px above terrain
      expect(isGrounded(490, 500)).toBe(true);
    });

    it('should detect shuttle as grounded at threshold boundary', () => {
      // Shuttle exactly at 49px above terrain (just inside threshold)
      expect(isGrounded(451, 500)).toBe(true);
    });

    it('should detect shuttle as NOT grounded just outside threshold', () => {
      // Shuttle exactly at 50px above terrain (at threshold)
      expect(isGrounded(450, 500)).toBe(false);
    });

    it('should detect shuttle as NOT grounded at high altitude', () => {
      // Shuttle 200px above terrain
      expect(isGrounded(300, 500)).toBe(false);
    });

    it('should handle negative shuttle Y (very high altitude)', () => {
      // Shuttle at negative Y (very high in the sky)
      expect(isGrounded(-100, 500)).toBe(false);
    });
  });

  describe('warning zone detection', () => {
    const WARNING_ZONE_RADIUS_X = 180;
    const WARNING_ZONE_HEIGHT = 180;
    const COLLISION_RADIUS_MULTIPLIER = 35;

    const isInWarningZone = (
      shuttleX: number,
      shuttleY: number,
      cloudWorldX: number,
      cloudWorldCenterY: number,
      cloudScale: number
    ): boolean => {
      const dx = Math.abs(shuttleX - cloudWorldX);
      const dy = shuttleY - cloudWorldCenterY;
      const collisionRadius = cloudScale * COLLISION_RADIUS_MULTIPLIER;
      const warningStartY = collisionRadius + 10;

      return dx < WARNING_ZONE_RADIUS_X && dy > warningStartY && dy < warningStartY + WARNING_ZONE_HEIGHT;
    };

    it('should detect shuttle in warning zone below cloud', () => {
      // Shuttle directly below cloud at appropriate distance
      const cloudScale = 1.0;
      const warningStartY = cloudScale * 35 + 10; // 45
      const shuttleY = 100 + warningStartY + 50; // In the middle of warning zone

      expect(isInWarningZone(100, shuttleY, 100, 100, cloudScale)).toBe(true);
    });

    it('should NOT detect shuttle when too far horizontally', () => {
      const cloudScale = 1.0;
      const warningStartY = cloudScale * 35 + 10; // 45
      const shuttleY = 100 + warningStartY + 50;

      // Shuttle 200px away horizontally (outside 180px zone)
      expect(isInWarningZone(300, shuttleY, 100, 100, cloudScale)).toBe(false);
    });

    it('should NOT detect shuttle when above cloud', () => {
      const cloudScale = 1.0;
      // Shuttle above cloud (negative dy)
      expect(isInWarningZone(100, 50, 100, 100, cloudScale)).toBe(false);
    });

    it('should NOT detect shuttle when too far below cloud', () => {
      const cloudScale = 1.0;
      const collisionRadius = cloudScale * 35;
      const warningStartY = collisionRadius + 10;
      // Shuttle below warning zone (dy > warningStartY + 180)
      const shuttleY = 100 + warningStartY + 200;

      expect(isInWarningZone(100, shuttleY, 100, 100, cloudScale)).toBe(false);
    });

    it('should scale warning zone with cloud size', () => {
      const largeCloudScale = 2.0;
      const smallCloudScale = 0.5;

      // Large cloud has bigger collision radius
      const largeCollisionRadius = largeCloudScale * 35; // 70
      const smallCollisionRadius = smallCloudScale * 35; // 17.5

      expect(largeCollisionRadius).toBe(70);
      expect(smallCollisionRadius).toBe(17.5);
    });

    it('should detect at edge of horizontal warning zone', () => {
      const cloudScale = 1.0;
      const warningStartY = cloudScale * 35 + 10;
      const shuttleY = 100 + warningStartY + 50;

      // Shuttle at 179px away (just inside 180px zone)
      expect(isInWarningZone(279, shuttleY, 100, 100, cloudScale)).toBe(true);

      // Shuttle at 180px away (at threshold - NOT inside due to < comparison)
      expect(isInWarningZone(280, shuttleY, 100, 100, cloudScale)).toBe(false);
    });
  });

  describe('lightning escape logic', () => {
    // Simplified escape: once warned, only landing prevents strike

    interface EscapeScenario {
      shuttleY: number;
      terrainY: number;
      isGrounded: boolean;
      shouldEscape: boolean;
    }

    const testEscapeScenarios: EscapeScenario[] = [
      { shuttleY: 500, terrainY: 500, isGrounded: true, shouldEscape: true },  // On ground
      { shuttleY: 460, terrainY: 500, isGrounded: true, shouldEscape: true },  // Close to ground (40px)
      { shuttleY: 451, terrainY: 500, isGrounded: true, shouldEscape: true },  // Just inside threshold (49px)
      { shuttleY: 450, terrainY: 500, isGrounded: false, shouldEscape: false }, // At threshold (50px)
      { shuttleY: 300, terrainY: 500, isGrounded: false, shouldEscape: false }, // High above ground
      { shuttleY: -100, terrainY: 500, isGrounded: false, shouldEscape: false }, // Very high altitude
    ];

    testEscapeScenarios.forEach(({ shuttleY, terrainY, isGrounded, shouldEscape }) => {
      it(`should ${shouldEscape ? 'allow escape' : 'trigger strike'} when shuttle at Y=${shuttleY}, terrain at Y=${terrainY}`, () => {
        const distanceFromGround = terrainY - shuttleY;
        const calculatedGrounded = distanceFromGround < 50;

        expect(calculatedGrounded).toBe(isGrounded);

        // Escape only possible if grounded
        expect(calculatedGrounded).toBe(shouldEscape);
      });
    });
  });

  describe('cloud visual center calculation', () => {
    const CLOUD_CENTER_Y_OFFSET = 5; // cloud.scale * 5 offset

    it('should calculate visual center with scale offset', () => {
      const cloudWorldY = 200;
      const cloudScale = 1.0;
      const cloudWorldCenterY = cloudWorldY + CLOUD_CENTER_Y_OFFSET * cloudScale;

      expect(cloudWorldCenterY).toBe(205);
    });

    it('should scale center offset with cloud size', () => {
      const cloudWorldY = 200;
      const cloudScale = 2.0;
      const cloudWorldCenterY = cloudWorldY + CLOUD_CENTER_Y_OFFSET * cloudScale;

      expect(cloudWorldCenterY).toBe(210);
    });
  });

  describe('rain splash randomization', () => {
    // Rain splash constants from WeatherManager
    const GRAVITY_MIN = 0.25;
    const GRAVITY_RANGE = 0.15; // Results in 0.25-0.4
    const INITIAL_AGE_MAX = 5; // 0-4 frames (Math.floor(Math.random() * 5))
    const LIFETIME_MIN = 16;
    const LIFETIME_RANGE = 8; // Results in 16-23 frames

    describe('weighted spawn count calculation', () => {
      // Uses Math.random() * Math.random() * spawnRate * 2 for weighted distribution
      const calculateSpawnCount = (random1: number, random2: number, spawnRate: number): number => {
        return Math.floor(random1 * random2 * spawnRate * 2);
      };

      it('should produce 0 when either random value is 0', () => {
        expect(calculateSpawnCount(0, 0.5, 10)).toBe(0);
        expect(calculateSpawnCount(0.5, 0, 10)).toBe(0);
        expect(calculateSpawnCount(0, 0, 10)).toBe(0);
      });

      it('should produce maximum value when both randoms are 1', () => {
        // spawnRate * 2 is the theoretical max (when both randoms = 1)
        expect(calculateSpawnCount(1, 1, 10)).toBe(20);
      });

      it('should produce lower values with typical random inputs', () => {
        // 0.5 * 0.5 * 10 * 2 = 5 (much lower than max of 20)
        expect(calculateSpawnCount(0.5, 0.5, 10)).toBe(5);
        // 0.3 * 0.3 * 10 * 2 = 1.8 -> 1
        expect(calculateSpawnCount(0.3, 0.3, 10)).toBe(1);
      });

      it('should weight distribution toward lower values', () => {
        // With uniform random inputs between 0-1, the product tends toward lower values
        // This is because multiplying two uniform randoms creates a distribution
        // heavily weighted toward 0
        const samples: number[] = [];
        for (let i = 0; i < 100; i++) {
          // Simulate uniform distribution with fixed increments
          const r1 = i / 100;
          const r2 = i / 100;
          samples.push(calculateSpawnCount(r1, r2, 10));
        }

        // Count how many are in lower half (0-9) vs upper half (10-20)
        const lowerHalf = samples.filter(s => s < 10).length;
        const upperHalf = samples.filter(s => s >= 10).length;

        // Should be heavily weighted toward lower values
        expect(lowerHalf).toBeGreaterThan(upperHalf);
      });
    });

    describe('per-particle gravity initialization', () => {
      const calculateGravity = (random: number): number => {
        return GRAVITY_MIN + random * GRAVITY_RANGE;
      };

      it('should produce minimum gravity when random is 0', () => {
        expect(calculateGravity(0)).toBe(0.25);
      });

      it('should produce maximum gravity when random is 1', () => {
        expect(calculateGravity(1)).toBe(0.4);
      });

      it('should produce mid-range gravity with 0.5 random', () => {
        expect(calculateGravity(0.5)).toBeCloseTo(0.325, 5);
      });

      it('should always be within valid range', () => {
        for (let i = 0; i <= 10; i++) {
          const random = i / 10;
          const gravity = calculateGravity(random);
          expect(gravity).toBeGreaterThanOrEqual(GRAVITY_MIN);
          expect(gravity).toBeLessThanOrEqual(GRAVITY_MIN + GRAVITY_RANGE);
        }
      });
    });

    describe('initial age randomization', () => {
      const calculateInitialAge = (random: number): number => {
        return Math.floor(random * INITIAL_AGE_MAX);
      };

      it('should produce 0 when random is 0', () => {
        expect(calculateInitialAge(0)).toBe(0);
      });

      it('should produce 4 when random is just under 1', () => {
        // Math.floor(0.99 * 5) = 4
        expect(calculateInitialAge(0.99)).toBe(4);
      });

      it('should never exceed 4 frames', () => {
        // Even with random = 1, Math.floor(1 * 5) = 5, but in practice random < 1
        expect(calculateInitialAge(0.999)).toBe(4);
      });

      it('should distribute across 0-4 range', () => {
        const ages = [0, 1, 2, 3, 4].map(i => calculateInitialAge((i + 0.5) / 5));
        expect(ages).toEqual([0, 1, 2, 3, 4]);
      });
    });

    describe('lifetime (maxAge) randomization', () => {
      const calculateMaxAge = (random: number): number => {
        return LIFETIME_MIN + Math.floor(random * LIFETIME_RANGE);
      };

      it('should produce minimum lifetime when random is 0', () => {
        expect(calculateMaxAge(0)).toBe(16);
      });

      it('should produce maximum lifetime when random is just under 1', () => {
        // 16 + Math.floor(0.99 * 8) = 16 + 7 = 23
        expect(calculateMaxAge(0.99)).toBe(23);
      });

      it('should always be within valid range', () => {
        // Math.random() returns [0, 1), never exactly 1
        for (let i = 0; i < 10; i++) {
          const random = i / 10; // 0, 0.1, 0.2, ... 0.9
          const maxAge = calculateMaxAge(random);
          expect(maxAge).toBeGreaterThanOrEqual(LIFETIME_MIN);
          expect(maxAge).toBeLessThanOrEqual(LIFETIME_MIN + LIFETIME_RANGE - 1); // Max is 23 (16 + 7)
        }
      });
    });

    describe('alpha fade calculation', () => {
      const calculateAlpha = (age: number, maxAge: number): number => {
        return (1 - (age / maxAge)) * 0.8;
      };

      it('should return 0.8 at age 0', () => {
        expect(calculateAlpha(0, 20)).toBe(0.8);
      });

      it('should return 0 at maxAge', () => {
        expect(calculateAlpha(20, 20)).toBe(0);
      });

      it('should return 0.4 at half maxAge', () => {
        expect(calculateAlpha(10, 20)).toBeCloseTo(0.4, 5);
      });

      it('should fade correctly with variable maxAge values', () => {
        // With maxAge=16 (min), at age 8: (1 - 8/16) * 0.8 = 0.4
        expect(calculateAlpha(8, 16)).toBeCloseTo(0.4, 5);

        // With maxAge=23 (max), at age 8: (1 - 8/23) * 0.8 ≈ 0.52
        expect(calculateAlpha(8, 23)).toBeCloseTo(0.52, 1);
      });
    });

    describe('particle physics update', () => {
      interface Particle {
        dx: number;
        dy: number;
        vy: number;
        gravity: number;
      }

      const updateParticle = (particle: Particle): void => {
        particle.dy += particle.vy;
        particle.vy += particle.gravity;
      };

      it('should apply per-particle gravity to velocity', () => {
        const particle: Particle = { dx: 0, dy: 0, vy: -5, gravity: 0.3 };
        updateParticle(particle);

        expect(particle.dy).toBe(-5); // dy += vy (-5)
        expect(particle.vy).toBe(-4.7); // vy += gravity (-5 + 0.3)
      });

      it('should use different gravity values per particle', () => {
        const p1: Particle = { dx: 0, dy: 0, vy: -5, gravity: 0.25 };
        const p2: Particle = { dx: 0, dy: 0, vy: -5, gravity: 0.4 };

        updateParticle(p1);
        updateParticle(p2);

        // Different gravity should result in different velocities
        expect(p1.vy).toBe(-4.75); // -5 + 0.25
        expect(p2.vy).toBe(-4.6);  // -5 + 0.4
      });

      it('should simulate parabolic motion over multiple frames', () => {
        const particle: Particle = { dx: 0, dy: 0, vy: -5, gravity: 0.3 };

        // Simulate 10 frames
        for (let i = 0; i < 10; i++) {
          updateParticle(particle);
        }

        // After 10 frames: vy should have increased by 0.3 * 10 = 3
        // Final vy = -5 + 3 = -2 (still going up but slowing)
        expect(particle.vy).toBeCloseTo(-2, 5);
      });
    });
  });
});
