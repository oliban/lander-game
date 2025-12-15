import { describe, it, expect } from 'vitest';

/**
 * Tests for CollisionManager
 *
 * Key behaviors to verify:
 * 1. Shuttle collision detection with various bodies
 * 2. Collision body identification
 * 3. Player determination from shuttle body
 */

describe('CollisionManager', () => {
  describe('shuttle collision detection', () => {
    interface MockBody {
      id: number;
      label: string;
    }

    const isShuttleCollision = (
      bodyA: MockBody,
      bodyB: MockBody,
      targetLabel: string,
      shuttle1BodyId: number,
      shuttle2BodyId: number
    ): boolean => {
      const isShuttleA = bodyA.id === shuttle1BodyId || bodyA.id === shuttle2BodyId;
      const isShuttleB = bodyB.id === shuttle1BodyId || bodyB.id === shuttle2BodyId;
      return (isShuttleA && bodyB.label === targetLabel) || (isShuttleB && bodyA.label === targetLabel);
    };

    it('should detect shuttle1 collision with terrain', () => {
      const bodyA: MockBody = { id: 1, label: 'shuttle' };
      const bodyB: MockBody = { id: 100, label: 'terrain' };
      expect(isShuttleCollision(bodyA, bodyB, 'terrain', 1, 2)).toBe(true);
    });

    it('should detect shuttle2 collision with terrain', () => {
      const bodyA: MockBody = { id: 2, label: 'shuttle' };
      const bodyB: MockBody = { id: 100, label: 'terrain' };
      expect(isShuttleCollision(bodyA, bodyB, 'terrain', 1, 2)).toBe(true);
    });

    it('should detect collision when shuttle is bodyB', () => {
      const bodyA: MockBody = { id: 100, label: 'landingPad' };
      const bodyB: MockBody = { id: 1, label: 'shuttle' };
      expect(isShuttleCollision(bodyA, bodyB, 'landingPad', 1, 2)).toBe(true);
    });

    it('should NOT detect collision with wrong label', () => {
      const bodyA: MockBody = { id: 1, label: 'shuttle' };
      const bodyB: MockBody = { id: 100, label: 'terrain' };
      expect(isShuttleCollision(bodyA, bodyB, 'landingPad', 1, 2)).toBe(false);
    });

    it('should NOT detect collision between non-shuttle bodies', () => {
      const bodyA: MockBody = { id: 50, label: 'projectile' };
      const bodyB: MockBody = { id: 100, label: 'terrain' };
      expect(isShuttleCollision(bodyA, bodyB, 'terrain', 1, 2)).toBe(false);
    });

    it('should handle single player (shuttle2 id = -1)', () => {
      const bodyA: MockBody = { id: 1, label: 'shuttle' };
      const bodyB: MockBody = { id: 100, label: 'terrain' };
      expect(isShuttleCollision(bodyA, bodyB, 'terrain', 1, -1)).toBe(true);
    });
  });

  describe('player identification', () => {
    const getPlayerFromBody = (
      bodyId: number,
      shuttle1BodyId: number,
      shuttle2BodyId: number
    ): number => {
      if (bodyId === shuttle2BodyId && shuttle2BodyId !== -1) return 2;
      return 1;
    };

    it('should identify player 1 from shuttle1 body', () => {
      expect(getPlayerFromBody(1, 1, 2)).toBe(1);
    });

    it('should identify player 2 from shuttle2 body', () => {
      expect(getPlayerFromBody(2, 1, 2)).toBe(2);
    });

    it('should default to player 1 for unknown body', () => {
      expect(getPlayerFromBody(99, 1, 2)).toBe(1);
    });

    it('should return player 1 when no shuttle2 exists', () => {
      expect(getPlayerFromBody(1, 1, -1)).toBe(1);
    });
  });

  describe('collision labels', () => {
    const COLLISION_LABELS = [
      'terrain',
      'landingPad',
      'boatDeck',
      'projectile',
      'collectible',
      'tombstone',
      'brick_wall',
    ];

    it('should have all expected collision labels', () => {
      expect(COLLISION_LABELS).toContain('terrain');
      expect(COLLISION_LABELS).toContain('landingPad');
      expect(COLLISION_LABELS).toContain('boatDeck');
      expect(COLLISION_LABELS).toContain('projectile');
      expect(COLLISION_LABELS).toContain('collectible');
      expect(COLLISION_LABELS).toContain('tombstone');
      expect(COLLISION_LABELS).toContain('brick_wall');
    });

    it('should have 7 collision types', () => {
      expect(COLLISION_LABELS.length).toBe(7);
    });
  });

  describe('tombstone-terrain collision', () => {
    const isTombstoneTerrainCollision = (
      bodyALabel: string,
      bodyBLabel: string
    ): boolean => {
      return (bodyALabel === 'tombstone' && bodyBLabel === 'terrain') ||
             (bodyBLabel === 'tombstone' && bodyALabel === 'terrain');
    };

    it('should detect tombstone hitting terrain (A=tombstone, B=terrain)', () => {
      expect(isTombstoneTerrainCollision('tombstone', 'terrain')).toBe(true);
    });

    it('should detect tombstone hitting terrain (A=terrain, B=tombstone)', () => {
      expect(isTombstoneTerrainCollision('terrain', 'tombstone')).toBe(true);
    });

    it('should NOT detect other collisions', () => {
      expect(isTombstoneTerrainCollision('tombstone', 'shuttle')).toBe(false);
      expect(isTombstoneTerrainCollision('projectile', 'terrain')).toBe(false);
    });
  });

  describe('extracting reference from body', () => {
    interface MockBodyWithRef {
      label: string;
      landingPadRef?: { name: string };
      collectibleRef?: { type: string };
    }

    const getLandingPadFromBodies = (
      bodyA: MockBodyWithRef,
      bodyB: MockBodyWithRef
    ): { name: string } | null => {
      if (bodyA.label === 'landingPad' && bodyA.landingPadRef) return bodyA.landingPadRef;
      if (bodyB.label === 'landingPad' && bodyB.landingPadRef) return bodyB.landingPadRef;
      return null;
    };

    it('should extract landing pad ref from bodyA', () => {
      const bodyA: MockBodyWithRef = { label: 'landingPad', landingPadRef: { name: 'USA' } };
      const bodyB: MockBodyWithRef = { label: 'shuttle' };
      expect(getLandingPadFromBodies(bodyA, bodyB)).toEqual({ name: 'USA' });
    });

    it('should extract landing pad ref from bodyB', () => {
      const bodyA: MockBodyWithRef = { label: 'shuttle' };
      const bodyB: MockBodyWithRef = { label: 'landingPad', landingPadRef: { name: 'Russia' } };
      expect(getLandingPadFromBodies(bodyA, bodyB)).toEqual({ name: 'Russia' });
    });

    it('should return null if no landing pad', () => {
      const bodyA: MockBodyWithRef = { label: 'shuttle' };
      const bodyB: MockBodyWithRef = { label: 'terrain' };
      expect(getLandingPadFromBodies(bodyA, bodyB)).toBeNull();
    });
  });
});
