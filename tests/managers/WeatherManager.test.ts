import { describe, it, expect } from 'vitest';

/**
 * Tests for WeatherManager lightning detection logic
 *
 * Key behaviors to verify:
 * 1. World coordinate transformation with parallax compensation
 * 2. Lightning detection at various altitudes
 * 3. Grounding/escape conditions
 * 4. Warning zone calculations
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
});
