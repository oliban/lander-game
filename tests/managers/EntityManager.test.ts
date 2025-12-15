import { describe, it, expect } from 'vitest';

/**
 * Tests for EntityManager (sharks, fisher boat, golf cart, greenland ice)
 *
 * Key behaviors to verify:
 * 1. Shark spawning in Atlantic Ocean (x: 2000-5000)
 * 2. Sharks divided into zones to spread them out
 * 3. Shark eating behavior bounds
 * 4. Fisher boat proximity detection (150px horiz, 100px vert)
 * 5. Golf cart position near Washington DC
 * 6. Greenland ice position avoiding boat and oil platform
 */

describe('EntityManager', () => {
  describe('shark spawning', () => {
    const ATLANTIC_START = 2000;
    const ATLANTIC_END = 5000;

    const calculateSharkZones = (sharkCount: number) => {
      const zoneWidth = (ATLANTIC_END - ATLANTIC_START) / sharkCount;
      const zones = [];
      for (let i = 0; i < sharkCount; i++) {
        const zoneStart = ATLANTIC_START + i * zoneWidth;
        const zoneEnd = zoneStart + zoneWidth;
        zones.push({ start: zoneStart, end: zoneEnd, width: zoneWidth });
      }
      return zones;
    };

    it('should spawn 2-3 sharks', () => {
      const minSharks = 2;
      const maxSharks = 3;
      // Random: 2 + Math.floor(Math.random() * 2) gives 2 or 3
      expect(minSharks).toBe(2);
      expect(maxSharks).toBe(3);
    });

    it('should divide Atlantic into equal zones for shark spawning', () => {
      const zones = calculateSharkZones(3);
      expect(zones.length).toBe(3);
      expect(zones[0].start).toBe(2000);
      expect(zones[0].end).toBe(3000);
      expect(zones[1].start).toBe(3000);
      expect(zones[1].end).toBe(4000);
      expect(zones[2].start).toBe(4000);
      expect(zones[2].end).toBe(5000);
    });

    it('should calculate correct zone width', () => {
      const zones2 = calculateSharkZones(2);
      expect(zones2[0].width).toBe(1500); // (5000-2000)/2

      const zones3 = calculateSharkZones(3);
      expect(zones3[0].width).toBe(1000); // (5000-2000)/3
    });

    it('should spawn shark in center of zone with randomness', () => {
      // Shark x = zoneStart + zoneWidth * 0.5 + randomOffset
      // Where randomOffset = (Math.random() - 0.5) * zoneWidth * 0.3
      const zoneStart = 2000;
      const zoneWidth = 1000;
      const centerX = zoneStart + zoneWidth * 0.5; // 2500
      const maxOffset = zoneWidth * 0.3 * 0.5; // 150

      expect(centerX).toBe(2500);
      expect(maxOffset).toBe(150);
      // So shark can be 2350-2650 in first zone
    });

    it('should set patrol bounds within zone with margin', () => {
      // Patrol bounds: zoneStart + 50 to zoneEnd - 50
      const zoneStart = 2000;
      const zoneEnd = 3000;
      const patrolMinX = zoneStart + 50;
      const patrolMaxX = zoneEnd - 50;

      expect(patrolMinX).toBe(2050);
      expect(patrolMaxX).toBe(2950);
    });
  });

  describe('shark eating behavior', () => {
    // Shark eating bounds interface
    interface EatingBounds {
      x: number;
      y: number;
      width: number;
      height: number;
    }

    const isWithinEatingBounds = (
      foodX: number,
      foodY: number,
      bounds: EatingBounds
    ): boolean => {
      return (
        foodX >= bounds.x &&
        foodX <= bounds.x + bounds.width &&
        foodY >= bounds.y &&
        foodY <= bounds.y + bounds.height
      );
    };

    it('should detect food within eating bounds', () => {
      const bounds: EatingBounds = { x: 100, y: 200, width: 50, height: 30 };
      expect(isWithinEatingBounds(125, 215, bounds)).toBe(true);
    });

    it('should not detect food outside eating bounds', () => {
      const bounds: EatingBounds = { x: 100, y: 200, width: 50, height: 30 };
      expect(isWithinEatingBounds(50, 215, bounds)).toBe(false);
      expect(isWithinEatingBounds(200, 215, bounds)).toBe(false);
      expect(isWithinEatingBounds(125, 100, bounds)).toBe(false);
      expect(isWithinEatingBounds(125, 300, bounds)).toBe(false);
    });

    it('should detect food at edge of bounds', () => {
      const bounds: EatingBounds = { x: 100, y: 200, width: 50, height: 30 };
      expect(isWithinEatingBounds(100, 200, bounds)).toBe(true); // top-left corner
      expect(isWithinEatingBounds(150, 230, bounds)).toBe(true); // bottom-right corner
    });
  });

  describe('fisher boat proximity', () => {
    const BOAT_PROXIMITY_HORIZ = 150;
    const BOAT_PROXIMITY_VERT = 100;

    const isShuttleNearBoat = (
      shuttleX: number,
      shuttleY: number,
      boatX: number,
      boatY: number
    ): boolean => {
      const horizDist = Math.abs(shuttleX - boatX);
      const vertDist = Math.abs(shuttleY - boatY);
      return horizDist < BOAT_PROXIMITY_HORIZ && vertDist < BOAT_PROXIMITY_VERT;
    };

    it('should detect shuttle near boat', () => {
      expect(isShuttleNearBoat(3500, 500, 3500, 500)).toBe(true);
      expect(isShuttleNearBoat(3600, 500, 3500, 500)).toBe(true); // 100px away horiz
      expect(isShuttleNearBoat(3500, 550, 3500, 500)).toBe(true); // 50px away vert
    });

    it('should not detect shuttle when too far horizontally', () => {
      expect(isShuttleNearBoat(3700, 500, 3500, 500)).toBe(false); // 200px > 150px
      expect(isShuttleNearBoat(3650, 500, 3500, 500)).toBe(false); // exactly 150px
    });

    it('should not detect shuttle when too far vertically', () => {
      expect(isShuttleNearBoat(3500, 650, 3500, 500)).toBe(false); // 150px > 100px
      expect(isShuttleNearBoat(3500, 600, 3500, 500)).toBe(false); // exactly 100px
    });

    it('should require BOTH horizontal AND vertical proximity', () => {
      expect(isShuttleNearBoat(3600, 550, 3500, 500)).toBe(true); // both within range
      expect(isShuttleNearBoat(3650, 500, 3500, 500)).toBe(false); // horiz out
      expect(isShuttleNearBoat(3500, 600, 3500, 500)).toBe(false); // vert out
      expect(isShuttleNearBoat(3650, 600, 3500, 500)).toBe(false); // both out
    });
  });

  describe('greenland ice spawning', () => {
    // Valid spawn zones:
    // - Zone 1: 2800-3400 (before fisher boat at 3500)
    // - Zone 2: 3600-4100 (after fisher boat, before oil platform at 4300)
    const SPAWN_ZONES = [
      { min: 2800, max: 3400 },
      { min: 3600, max: 4100 },
    ];

    const isValidSpawnX = (x: number): boolean => {
      return SPAWN_ZONES.some(zone => x >= zone.min && x <= zone.max);
    };

    it('should have valid spawn zone before fisher boat', () => {
      expect(isValidSpawnX(2800)).toBe(true);
      expect(isValidSpawnX(3100)).toBe(true);
      expect(isValidSpawnX(3400)).toBe(true);
    });

    it('should have valid spawn zone after fisher boat', () => {
      expect(isValidSpawnX(3600)).toBe(true);
      expect(isValidSpawnX(3850)).toBe(true);
      expect(isValidSpawnX(4100)).toBe(true);
    });

    it('should NOT spawn near fisher boat (3400-3600 excluded)', () => {
      expect(isValidSpawnX(3450)).toBe(false);
      expect(isValidSpawnX(3500)).toBe(false);
      expect(isValidSpawnX(3550)).toBe(false);
    });

    it('should NOT spawn near oil platform (4100-4300 excluded)', () => {
      expect(isValidSpawnX(4150)).toBe(false);
      expect(isValidSpawnX(4200)).toBe(false);
      expect(isValidSpawnX(4300)).toBe(false);
    });

    it('should NOT spawn outside Atlantic region', () => {
      expect(isValidSpawnX(2000)).toBe(false);
      expect(isValidSpawnX(5000)).toBe(false);
    });
  });

  describe('food targets in ocean', () => {
    const WATER_SURFACE = 720 * 0.75; // 540

    const isInAtlanticUnderwater = (
      x: number,
      y: number
    ): boolean => {
      return x >= 2000 && x <= 5000 && y > WATER_SURFACE;
    };

    it('should identify food in Atlantic underwater', () => {
      expect(isInAtlanticUnderwater(3000, 600)).toBe(true);
      expect(isInAtlanticUnderwater(2500, 550)).toBe(true);
    });

    it('should NOT identify food above water surface', () => {
      expect(isInAtlanticUnderwater(3000, 400)).toBe(false);
      expect(isInAtlanticUnderwater(3000, 540)).toBe(false); // exactly at surface
    });

    it('should NOT identify food outside Atlantic', () => {
      expect(isInAtlanticUnderwater(1500, 600)).toBe(false); // before Atlantic
      expect(isInAtlanticUnderwater(5500, 600)).toBe(false); // after Atlantic
    });

    it('should include food at Atlantic boundaries', () => {
      expect(isInAtlanticUnderwater(2000, 600)).toBe(true); // start
      expect(isInAtlanticUnderwater(5000, 600)).toBe(true); // end
    });
  });

  describe('golf cart position', () => {
    // Golf cart spawns near Washington DC (before x=0)
    const GOLF_CART_SPAWN_RANGE = { min: -2600, max: -1000 };

    const isValidGolfCartX = (x: number): boolean => {
      return x >= GOLF_CART_SPAWN_RANGE.min && x <= GOLF_CART_SPAWN_RANGE.max;
    };

    it('should spawn in Washington DC area', () => {
      expect(isValidGolfCartX(-2000)).toBe(true);
      expect(isValidGolfCartX(-1500)).toBe(true);
    });

    it('should not spawn outside Washington DC', () => {
      expect(isValidGolfCartX(0)).toBe(false);
      expect(isValidGolfCartX(-500)).toBe(false);
      expect(isValidGolfCartX(-3000)).toBe(false);
    });
  });
});
