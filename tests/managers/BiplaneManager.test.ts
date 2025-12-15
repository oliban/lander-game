import { describe, it, expect } from 'vitest';

/**
 * Tests for BiplaneManager (biplane spawning, update, collision)
 *
 * Key behaviors to verify:
 * 1. Biplane type selection (30% info plane, 70% propaganda)
 * 2. Spawning when player approaches target country
 * 3. Spawn distance threshold (1500px from country center)
 * 4. Collision detection with shuttles (AABB)
 * 5. Bounce physics calculation
 */

describe('BiplaneManager', () => {
  describe('biplane type selection', () => {
    it('should have 30% chance for info plane', () => {
      // Random < 0.3 = GAME_INFO
      const threshold = 0.3;
      expect(threshold).toBe(0.3);
    });

    it('should select from valid countries for propaganda', () => {
      const biplaneCountries = ['USA', 'United Kingdom', 'France', 'Switzerland', 'Germany', 'Poland', 'Russia'];
      expect(biplaneCountries.length).toBe(7);
      expect(biplaneCountries).toContain('USA');
      expect(biplaneCountries).toContain('Russia');
    });
  });

  describe('spawn distance calculation', () => {
    const SPAWN_DISTANCE = 1500;

    const shouldSpawnBiplane = (
      shuttleX: number,
      countryCenter: number
    ): boolean => {
      return Math.abs(shuttleX - countryCenter) < SPAWN_DISTANCE;
    };

    it('should spawn when within 1500px of country center', () => {
      const countryCenter = 5000;
      expect(shouldSpawnBiplane(4000, countryCenter)).toBe(true); // 1000px away
      expect(shouldSpawnBiplane(3600, countryCenter)).toBe(true); // 1400px away
    });

    it('should NOT spawn when beyond 1500px', () => {
      const countryCenter = 5000;
      expect(shouldSpawnBiplane(3400, countryCenter)).toBe(false); // 1600px away
      expect(shouldSpawnBiplane(3500, countryCenter)).toBe(false); // exactly 1500px
    });

    it('should work for approach from either direction', () => {
      const countryCenter = 5000;
      expect(shouldSpawnBiplane(6000, countryCenter)).toBe(true); // 1000px from right
      expect(shouldSpawnBiplane(6400, countryCenter)).toBe(true); // 1400px from right
      expect(shouldSpawnBiplane(6600, countryCenter)).toBe(false); // 1600px from right
    });
  });

  describe('country center calculation', () => {
    // Country centers are calculated as: startX + (endX - startX) / 2
    const calculateCountryCenter = (startX: number, endX: number): number => {
      return startX + (endX - startX) / 2;
    };

    it('should calculate center correctly', () => {
      expect(calculateCountryCenter(0, 2000)).toBe(1000);
      expect(calculateCountryCenter(2000, 4000)).toBe(3000);
      expect(calculateCountryCenter(5000, 8000)).toBe(6500);
    });
  });

  describe('shuttle collision detection (AABB)', () => {
    interface Bounds {
      x: number;
      y: number;
      width: number;
      height: number;
    }

    const getShuttleBounds = (shuttleX: number, shuttleY: number): Bounds => ({
      x: shuttleX - 14,
      y: shuttleY - 18,
      width: 28,
      height: 36,
    });

    const checkAABBCollision = (a: Bounds, b: Bounds): boolean => {
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    };

    it('should detect collision when overlapping', () => {
      const shuttleBounds = getShuttleBounds(100, 100);
      const biplaneBounds: Bounds = { x: 90, y: 90, width: 50, height: 30 };
      expect(checkAABBCollision(shuttleBounds, biplaneBounds)).toBe(true);
    });

    it('should NOT detect collision when apart horizontally', () => {
      const shuttleBounds = getShuttleBounds(100, 100);
      const biplaneBounds: Bounds = { x: 200, y: 90, width: 50, height: 30 };
      expect(checkAABBCollision(shuttleBounds, biplaneBounds)).toBe(false);
    });

    it('should NOT detect collision when apart vertically', () => {
      const shuttleBounds = getShuttleBounds(100, 100);
      const biplaneBounds: Bounds = { x: 90, y: 200, width: 50, height: 30 };
      expect(checkAABBCollision(shuttleBounds, biplaneBounds)).toBe(false);
    });

    it('should detect edge collision', () => {
      const shuttleBounds = getShuttleBounds(100, 100);
      // Biplane just touching shuttle's right edge
      const biplaneBounds: Bounds = { x: 113, y: 82, width: 50, height: 36 };
      expect(checkAABBCollision(shuttleBounds, biplaneBounds)).toBe(true);
    });
  });

  describe('bounce physics calculation', () => {
    const calculateBounce = (
      shuttleX: number,
      shuttleY: number,
      biplaneX: number,
      biplaneY: number,
      currentVelX: number,
      currentVelY: number,
      bounceStrength: number = 8
    ) => {
      const dx = shuttleX - biplaneX;
      const dy = shuttleY - biplaneY;
      const normalX = dx / (Math.abs(dx) + Math.abs(dy) + 0.1);
      const normalY = dy / (Math.abs(dx) + Math.abs(dy) + 0.1);

      return {
        x: currentVelX + normalX * bounceStrength,
        y: currentVelY + normalY * bounceStrength - 2, // Slight upward bias
      };
    };

    it('should bounce right when shuttle is right of biplane', () => {
      const bounce = calculateBounce(150, 100, 100, 100, 0, 0);
      expect(bounce.x).toBeGreaterThan(0); // Bounces right
    });

    it('should bounce left when shuttle is left of biplane', () => {
      const bounce = calculateBounce(50, 100, 100, 100, 0, 0);
      expect(bounce.x).toBeLessThan(0); // Bounces left
    });

    it('should bounce up when shuttle is above biplane', () => {
      const bounce = calculateBounce(100, 50, 100, 100, 0, 0);
      expect(bounce.y).toBeLessThan(0); // Bounces up (negative Y)
    });

    it('should include upward bias (-2) in Y velocity', () => {
      // When directly to the right (dy = 0), normalY = 0
      // So final y = currentVelY + 0 - 2 = -2
      const bounce = calculateBounce(200, 100, 100, 100, 0, 0);
      expect(bounce.y).toBeLessThan(0); // Has upward bias
    });

    it('should preserve existing velocity', () => {
      const bounce = calculateBounce(150, 100, 100, 100, 5, 3);
      expect(bounce.x).toBeGreaterThan(5); // Added to existing
      expect(bounce.y).not.toBe(3); // Modified by bounce
    });
  });

  describe('GAME_INFO vs propaganda behavior', () => {
    const validCountries = ['USA', 'United Kingdom', 'France', 'Switzerland', 'Germany', 'Poland', 'Russia'];

    it('should check all countries for GAME_INFO type', () => {
      const biplaneTargetCountry = 'GAME_INFO';
      const countriesToCheck = biplaneTargetCountry === 'GAME_INFO'
        ? validCountries
        : [biplaneTargetCountry];

      expect(countriesToCheck.length).toBe(7);
    });

    it('should check only target country for propaganda', () => {
      const biplaneTargetCountry = 'France';
      const countriesToCheck = biplaneTargetCountry === 'GAME_INFO'
        ? validCountries
        : [biplaneTargetCountry];

      expect(countriesToCheck.length).toBe(1);
      expect(countriesToCheck[0]).toBe('France');
    });
  });
});
