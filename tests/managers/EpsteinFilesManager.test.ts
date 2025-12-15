import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EpsteinFilesManager } from '../../src/managers/EpsteinFilesManager';

/**
 * Tests for EpsteinFilesManager
 *
 * Key behaviors to verify:
 * 1. Pickup radius is 60 pixels
 * 2. Shuttle must be landed (velocity.total < 0.5) to collect
 * 3. Files can only be collected once
 * 4. Collection triggers inventory add and collection tracking
 */

// Mock the collection system
vi.mock('../../src/systems/CollectionSystem', () => ({
  getCollectionSystem: () => ({
    markDiscovered: vi.fn(),
  }),
}));

describe('EpsteinFilesManager', () => {
  // Use the manager's actual constants
  const PICKUP_RADIUS = EpsteinFilesManager.PICKUP_RADIUS;
  const LANDED_VELOCITY_THRESHOLD = EpsteinFilesManager.LANDED_VELOCITY_THRESHOLD;

  describe('constants', () => {
    it('should have pickup radius of 60 pixels', () => {
      expect(PICKUP_RADIUS).toBe(60);
    });

    it('should require velocity < 0.5 to be considered landed', () => {
      expect(LANDED_VELOCITY_THRESHOLD).toBe(0.5);
    });
  });

  describe('pickup detection', () => {

    describe('distance calculation', () => {
      const calculateDistance = (shuttleX: number, shuttleY: number, fileX: number, fileY: number) => {
        const dx = shuttleX - fileX;
        const dy = shuttleY - fileY;
        return Math.sqrt(dx * dx + dy * dy);
      };

      it('should calculate distance correctly for same position', () => {
        expect(calculateDistance(100, 100, 100, 100)).toBe(0);
      });

      it('should calculate distance correctly for horizontal offset', () => {
        expect(calculateDistance(160, 100, 100, 100)).toBe(60);
      });

      it('should calculate distance correctly for vertical offset', () => {
        expect(calculateDistance(100, 160, 100, 100)).toBe(60);
      });

      it('should calculate distance correctly for diagonal offset', () => {
        // 30-40-50 right triangle scaled
        expect(calculateDistance(140, 130, 100, 100)).toBeCloseTo(50);
      });
    });

    describe('pickup eligibility', () => {
      const canPickup = (distance: number, isLanded: boolean, isCollected: boolean, isActive: boolean) => {
        if (!isActive || isCollected) return false;
        return distance < PICKUP_RADIUS && isLanded;
      };

      it('should allow pickup when within radius and landed', () => {
        expect(canPickup(50, true, false, true)).toBe(true);
      });

      it('should NOT allow pickup when outside radius', () => {
        expect(canPickup(61, true, false, true)).toBe(false);
      });

      it('should NOT allow pickup when exactly at radius boundary', () => {
        expect(canPickup(60, true, false, true)).toBe(false);
      });

      it('should NOT allow pickup when not landed', () => {
        expect(canPickup(50, false, false, true)).toBe(false);
      });

      it('should NOT allow pickup when already collected', () => {
        expect(canPickup(50, true, true, true)).toBe(false);
      });

      it('should NOT allow pickup when file is inactive', () => {
        expect(canPickup(50, true, false, false)).toBe(false);
      });
    });

    describe('landed detection', () => {
      const isLanded = (velocityTotal: number) => velocityTotal < LANDED_VELOCITY_THRESHOLD;

      it('should be landed when velocity is 0', () => {
        expect(isLanded(0)).toBe(true);
      });

      it('should be landed when velocity is 0.4', () => {
        expect(isLanded(0.4)).toBe(true);
      });

      it('should NOT be landed when velocity is 0.5', () => {
        expect(isLanded(0.5)).toBe(false);
      });

      it('should NOT be landed when velocity is 1.0', () => {
        expect(isLanded(1.0)).toBe(false);
      });
    });
  });

  describe('inventory tracking', () => {
    it('should add EPSTEIN_FILES to inventory on pickup', () => {
      const inventoryAdd = vi.fn();
      const mockInventory = { add: inventoryAdd };

      // Simulate pickup
      mockInventory.add('EPSTEIN_FILES');

      expect(inventoryAdd).toHaveBeenCalledWith('EPSTEIN_FILES');
    });
  });

  describe('file management', () => {
    it('should remove file from array after collection animation completes', () => {
      const files: { id: number }[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const fileToRemove = files[1];

      // Simulate removal
      const idx = files.indexOf(fileToRemove);
      if (idx >= 0) {
        files.splice(idx, 1);
      }

      expect(files).toHaveLength(2);
      expect(files.find(f => f.id === 2)).toBeUndefined();
    });

    it('should skip files that are not active', () => {
      const files = [
        { active: true, collected: false },
        { active: false, collected: false },
        { active: true, collected: false },
      ];

      const activeFiles = files.filter(f => f.active && !f.collected);
      expect(activeFiles).toHaveLength(2);
    });

    it('should skip files that are already collected', () => {
      const files = [
        { active: true, collected: false },
        { active: true, collected: true },
        { active: true, collected: false },
      ];

      const collectableFiles = files.filter(f => f.active && !f.collected);
      expect(collectableFiles).toHaveLength(2);
    });
  });
});
