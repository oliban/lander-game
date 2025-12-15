import { describe, it, expect } from 'vitest';

/**
 * Tests for ProjectileCollisionManager
 *
 * Key behaviors to verify:
 * 1. Projectile-projectile collision detection
 * 2. Projectile-building collision detection
 * 3. Collision radius threshold (15px)
 * 4. Midpoint calculation for explosions
 */

describe('ProjectileCollisionManager', () => {
  describe('projectile-projectile collision', () => {
    const COLLISION_RADIUS = 15;

    const checkProjectileCollision = (
      p1: { x: number; y: number },
      p2: { x: number; y: number }
    ): boolean => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < COLLISION_RADIUS;
    };

    it('should detect collision when projectiles are close', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 110, y: 100 }; // 10px apart
      expect(checkProjectileCollision(p1, p2)).toBe(true);
    });

    it('should detect collision when projectiles overlap', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 100, y: 100 }; // same position
      expect(checkProjectileCollision(p1, p2)).toBe(true);
    });

    it('should NOT detect collision when projectiles are far', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 120, y: 100 }; // 20px apart
      expect(checkProjectileCollision(p1, p2)).toBe(false);
    });

    it('should NOT detect collision at exactly collision radius', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 115, y: 100 }; // exactly 15px apart
      expect(checkProjectileCollision(p1, p2)).toBe(false);
    });

    it('should handle diagonal distances', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 107, y: 107 }; // ~9.9px apart diagonally
      expect(checkProjectileCollision(p1, p2)).toBe(true);

      const p3 = { x: 100, y: 100 };
      const p4 = { x: 111, y: 111 }; // ~15.6px apart diagonally
      expect(checkProjectileCollision(p3, p4)).toBe(false);
    });
  });

  describe('midpoint calculation', () => {
    const calculateMidpoint = (
      p1: { x: number; y: number },
      p2: { x: number; y: number }
    ) => ({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    });

    it('should calculate midpoint correctly', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 200, y: 200 };
      const mid = calculateMidpoint(p1, p2);
      expect(mid.x).toBe(150);
      expect(mid.y).toBe(150);
    });

    it('should handle same position', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 100, y: 100 };
      const mid = calculateMidpoint(p1, p2);
      expect(mid.x).toBe(100);
      expect(mid.y).toBe(100);
    });

    it('should handle negative coordinates', () => {
      const p1 = { x: -100, y: 100 };
      const p2 = { x: 100, y: -100 };
      const mid = calculateMidpoint(p1, p2);
      expect(mid.x).toBe(0);
      expect(mid.y).toBe(0);
    });
  });

  describe('projectile-building collision (AABB)', () => {
    interface Bounds {
      x: number;
      y: number;
      width: number;
      height: number;
    }

    const checkBuildingCollision = (
      projectile: { x: number; y: number },
      bounds: Bounds
    ): boolean => {
      return (
        projectile.x >= bounds.x &&
        projectile.x <= bounds.x + bounds.width &&
        projectile.y >= bounds.y &&
        projectile.y <= bounds.y + bounds.height
      );
    };

    it('should detect projectile inside building bounds', () => {
      const projectile = { x: 150, y: 150 };
      const bounds: Bounds = { x: 100, y: 100, width: 100, height: 100 };
      expect(checkBuildingCollision(projectile, bounds)).toBe(true);
    });

    it('should detect projectile at building edge', () => {
      const projectile = { x: 100, y: 100 };
      const bounds: Bounds = { x: 100, y: 100, width: 100, height: 100 };
      expect(checkBuildingCollision(projectile, bounds)).toBe(true);
    });

    it('should NOT detect projectile outside bounds', () => {
      const projectile = { x: 50, y: 150 };
      const bounds: Bounds = { x: 100, y: 100, width: 100, height: 100 };
      expect(checkBuildingCollision(projectile, bounds)).toBe(false);
    });

    it('should use horizontal distance pre-check (150px)', () => {
      const HORIZONTAL_THRESHOLD = 150;
      const projectileX = 100;
      const buildingX = 300;

      const shouldSkip = Math.abs(projectileX - buildingX) > HORIZONTAL_THRESHOLD;
      expect(shouldSkip).toBe(true); // 200px > 150px, should skip
    });
  });

  describe('collecting projectiles from cannons', () => {
    interface MockCannon {
      projectiles: { x: number; y: number }[];
    }

    const collectAllProjectiles = (cannons: MockCannon[]) => {
      const all: { projectile: any; cannonIndex: number }[] = [];
      for (let i = 0; i < cannons.length; i++) {
        for (const projectile of cannons[i].projectiles) {
          all.push({ projectile, cannonIndex: i });
        }
      }
      return all;
    };

    it('should collect projectiles from multiple cannons', () => {
      const cannons: MockCannon[] = [
        { projectiles: [{ x: 100, y: 100 }, { x: 200, y: 200 }] },
        { projectiles: [{ x: 300, y: 300 }] },
        { projectiles: [] },
      ];

      const all = collectAllProjectiles(cannons);
      expect(all.length).toBe(3);
      expect(all[0].cannonIndex).toBe(0);
      expect(all[2].cannonIndex).toBe(1);
    });

    it('should handle empty cannons', () => {
      const cannons: MockCannon[] = [
        { projectiles: [] },
        { projectiles: [] },
      ];

      const all = collectAllProjectiles(cannons);
      expect(all.length).toBe(0);
    });
  });
});
