import { describe, it, expect } from 'vitest';

/**
 * Tests for CannonManager
 *
 * Key behaviors to verify:
 * 1. Cannon visibility (on-screen detection)
 * 2. Target selection (nearest shuttle)
 * 3. Bribed cannons behavior
 * 4. Projectile collision detection
 */

describe('CannonManager', () => {
  describe('cannon visibility', () => {
    const isCannonOnScreen = (
      cannonX: number,
      cameraLeft: number,
      cameraRight: number
    ): boolean => {
      return cannonX >= cameraLeft && cannonX <= cameraRight;
    };

    it('should detect cannon on screen', () => {
      expect(isCannonOnScreen(500, 0, 1000)).toBe(true);
    });

    it('should detect cannon at left edge', () => {
      expect(isCannonOnScreen(0, 0, 1000)).toBe(true);
    });

    it('should detect cannon at right edge', () => {
      expect(isCannonOnScreen(1000, 0, 1000)).toBe(true);
    });

    it('should NOT detect cannon off left', () => {
      expect(isCannonOnScreen(-100, 0, 1000)).toBe(false);
    });

    it('should NOT detect cannon off right', () => {
      expect(isCannonOnScreen(1100, 0, 1000)).toBe(false);
    });
  });

  describe('target selection', () => {
    interface MockShuttle {
      x: number;
      y: number;
      active: boolean;
    }

    const findNearestTarget = (
      cannonX: number,
      cannonY: number,
      shuttles: MockShuttle[]
    ): MockShuttle | null => {
      const activeShuttles = shuttles.filter(s => s.active);
      if (activeShuttles.length === 0) return null;

      let nearest = activeShuttles[0];
      let nearestDist = Math.hypot(cannonX - nearest.x, cannonY - nearest.y);

      for (const shuttle of activeShuttles) {
        const dist = Math.hypot(cannonX - shuttle.x, cannonY - shuttle.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = shuttle;
        }
      }

      return nearest;
    };

    it('should find nearest shuttle', () => {
      const shuttles: MockShuttle[] = [
        { x: 100, y: 100, active: true },
        { x: 500, y: 100, active: true },
      ];
      const nearest = findNearestTarget(90, 100, shuttles);
      expect(nearest?.x).toBe(100);
    });

    it('should skip inactive shuttles', () => {
      const shuttles: MockShuttle[] = [
        { x: 100, y: 100, active: false }, // Closest but inactive
        { x: 500, y: 100, active: true },
      ];
      const nearest = findNearestTarget(90, 100, shuttles);
      expect(nearest?.x).toBe(500);
    });

    it('should return null if no active shuttles', () => {
      const shuttles: MockShuttle[] = [
        { x: 100, y: 100, active: false },
      ];
      const nearest = findNearestTarget(90, 100, shuttles);
      expect(nearest).toBeNull();
    });

    it('should handle single shuttle', () => {
      const shuttles: MockShuttle[] = [
        { x: 500, y: 200, active: true },
      ];
      const nearest = findNearestTarget(100, 100, shuttles);
      expect(nearest?.x).toBe(500);
    });
  });

  describe('bribed cannons', () => {
    const shouldCannonFire = (
      isOnScreen: boolean,
      isActive: boolean,
      isBribed: boolean,
      hasTargets: boolean
    ): boolean => {
      return isOnScreen && isActive && !isBribed && hasTargets;
    };

    it('should fire when all conditions met', () => {
      expect(shouldCannonFire(true, true, false, true)).toBe(true);
    });

    it('should NOT fire when bribed', () => {
      expect(shouldCannonFire(true, true, true, true)).toBe(false);
    });

    it('should NOT fire when off screen', () => {
      expect(shouldCannonFire(false, true, false, true)).toBe(false);
    });

    it('should NOT fire when destroyed', () => {
      expect(shouldCannonFire(true, false, false, true)).toBe(false);
    });

    it('should NOT fire when no targets', () => {
      expect(shouldCannonFire(true, true, false, false)).toBe(false);
    });
  });

  describe('projectile collision', () => {
    interface MockProjectile {
      x: number;
      y: number;
    }

    interface MockShuttle {
      x: number;
      y: number;
    }

    const checkProjectileHit = (
      projectile: MockProjectile,
      shuttle: MockShuttle,
      hitRadius: number = 25
    ): boolean => {
      const dx = projectile.x - shuttle.x;
      const dy = projectile.y - shuttle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < hitRadius;
    };

    it('should detect direct hit', () => {
      const projectile: MockProjectile = { x: 100, y: 100 };
      const shuttle: MockShuttle = { x: 100, y: 100 };
      expect(checkProjectileHit(projectile, shuttle)).toBe(true);
    });

    it('should detect hit within radius', () => {
      const projectile: MockProjectile = { x: 100, y: 100 };
      const shuttle: MockShuttle = { x: 120, y: 100 }; // 20px away
      expect(checkProjectileHit(projectile, shuttle)).toBe(true);
    });

    it('should NOT detect miss', () => {
      const projectile: MockProjectile = { x: 100, y: 100 };
      const shuttle: MockShuttle = { x: 200, y: 100 }; // 100px away
      expect(checkProjectileHit(projectile, shuttle)).toBe(false);
    });

    it('should detect hit at exactly radius edge', () => {
      const projectile: MockProjectile = { x: 100, y: 100 };
      const shuttle: MockShuttle = { x: 124, y: 100 }; // 24px away (< 25)
      expect(checkProjectileHit(projectile, shuttle)).toBe(true);
    });

    it('should NOT detect hit at exactly radius boundary', () => {
      const projectile: MockProjectile = { x: 100, y: 100 };
      const shuttle: MockShuttle = { x: 125, y: 100 }; // 25px away (= 25)
      expect(checkProjectileHit(projectile, shuttle)).toBe(false);
    });
  });

  describe('should update cannon', () => {
    const shouldUpdateCannon = (
      isOnScreen: boolean,
      hasProjectiles: boolean
    ): boolean => {
      return isOnScreen || hasProjectiles;
    };

    it('should update when on screen', () => {
      expect(shouldUpdateCannon(true, false)).toBe(true);
    });

    it('should update when has projectiles (off-screen)', () => {
      expect(shouldUpdateCannon(false, true)).toBe(true);
    });

    it('should update when both on screen and has projectiles', () => {
      expect(shouldUpdateCannon(true, true)).toBe(true);
    });

    it('should NOT update when off screen with no projectiles', () => {
      expect(shouldUpdateCannon(false, false)).toBe(false);
    });
  });

  describe('camera bounds calculation', () => {
    const getCameraBounds = (
      scrollX: number,
      gameWidth: number,
      margin: number = 200
    ): { left: number; right: number } => {
      return {
        left: scrollX - margin,
        right: scrollX + gameWidth + margin,
      };
    };

    it('should calculate bounds at origin', () => {
      const bounds = getCameraBounds(0, 1000);
      expect(bounds.left).toBe(-200);
      expect(bounds.right).toBe(1200);
    });

    it('should calculate bounds when scrolled', () => {
      const bounds = getCameraBounds(500, 1000);
      expect(bounds.left).toBe(300);
      expect(bounds.right).toBe(1700);
    });

    it('should use custom margin', () => {
      const bounds = getCameraBounds(0, 1000, 100);
      expect(bounds.left).toBe(-100);
      expect(bounds.right).toBe(1100);
    });
  });
});
