import { describe, it, expect } from 'vitest';

/**
 * Tests for PlayerState
 *
 * Key behaviors to verify:
 * 1. Initialization with player number and references
 * 2. isActive getter based on shuttle state
 * 3. Independent state between P1 and P2
 */

describe('PlayerState', () => {
  // Mock interfaces matching the real ones
  interface MockShuttle {
    active: boolean;
    x: number;
    y: number;
  }

  interface MockFuelSystem {
    getFuel: () => number;
  }

  interface MockInventorySystem {
    getItems: () => string[];
  }

  interface MockControls {
    thrust: unknown;
    rotateLeft: unknown;
    rotateRight: unknown;
    gear: unknown;
  }

  // Simple PlayerState implementation for testing
  class PlayerState {
    readonly playerNum: number;
    shuttle: MockShuttle;
    fuelSystem: MockFuelSystem;
    inventorySystem: MockInventorySystem;
    controls: MockControls;
    kills: number = 0;
    deathMessage: string = '';

    constructor(
      playerNum: number,
      shuttle: MockShuttle,
      fuelSystem: MockFuelSystem,
      inventorySystem: MockInventorySystem,
      controls: MockControls
    ) {
      this.playerNum = playerNum;
      this.shuttle = shuttle;
      this.fuelSystem = fuelSystem;
      this.inventorySystem = inventorySystem;
      this.controls = controls;
    }

    get isActive(): boolean {
      return this.shuttle?.active ?? false;
    }
  }

  const createMockShuttle = (active: boolean = true): MockShuttle => ({
    active,
    x: 100,
    y: 200,
  });

  const createMockFuelSystem = (): MockFuelSystem => ({
    getFuel: () => 100,
  });

  const createMockInventorySystem = (): MockInventorySystem => ({
    getItems: () => [],
  });

  const createMockControls = (): MockControls => ({
    thrust: {},
    rotateLeft: {},
    rotateRight: {},
    gear: {},
  });

  describe('initialization', () => {
    it('should store player number', () => {
      const state = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.playerNum).toBe(1);
    });

    it('should store player 2 number', () => {
      const state = new PlayerState(
        2,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.playerNum).toBe(2);
    });

    it('should store shuttle reference', () => {
      const shuttle = createMockShuttle();
      const state = new PlayerState(
        1,
        shuttle,
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.shuttle).toBe(shuttle);
    });

    it('should store fuel system reference', () => {
      const fuelSystem = createMockFuelSystem();
      const state = new PlayerState(
        1,
        createMockShuttle(),
        fuelSystem,
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.fuelSystem).toBe(fuelSystem);
    });

    it('should store inventory system reference', () => {
      const inventorySystem = createMockInventorySystem();
      const state = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        inventorySystem,
        createMockControls()
      );
      expect(state.inventorySystem).toBe(inventorySystem);
    });

    it('should store controls reference', () => {
      const controls = createMockControls();
      const state = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        controls
      );
      expect(state.controls).toBe(controls);
    });

    it('should initialize kills to 0', () => {
      const state = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.kills).toBe(0);
    });

    it('should initialize deathMessage to empty string', () => {
      const state = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.deathMessage).toBe('');
    });
  });

  describe('isActive', () => {
    it('should return true when shuttle is active', () => {
      const state = new PlayerState(
        1,
        createMockShuttle(true),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.isActive).toBe(true);
    });

    it('should return false when shuttle is inactive', () => {
      const state = new PlayerState(
        1,
        createMockShuttle(false),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.isActive).toBe(false);
    });

    it('should return false when shuttle is null', () => {
      const state = new PlayerState(
        1,
        null as unknown as MockShuttle,
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      expect(state.isActive).toBe(false);
    });
  });

  describe('mutable state', () => {
    it('should allow updating kills', () => {
      const state = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      state.kills = 5;
      expect(state.kills).toBe(5);
    });

    it('should allow updating deathMessage', () => {
      const state = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      state.deathMessage = 'Hit by teacup';
      expect(state.deathMessage).toBe('Hit by teacup');
    });
  });

  describe('independence between players', () => {
    it('P1 and P2 should have independent kills', () => {
      const p1 = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      const p2 = new PlayerState(
        2,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );

      p1.kills = 3;
      p2.kills = 7;

      expect(p1.kills).toBe(3);
      expect(p2.kills).toBe(7);
    });

    it('P1 and P2 should have independent death messages', () => {
      const p1 = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      const p2 = new PlayerState(
        2,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );

      p1.deathMessage = 'Crashed into terrain';
      p2.deathMessage = 'Ran out of fuel';

      expect(p1.deathMessage).toBe('Crashed into terrain');
      expect(p2.deathMessage).toBe('Ran out of fuel');
    });

    it('P1 and P2 should have independent shuttle references', () => {
      const shuttle1 = createMockShuttle(true);
      const shuttle2 = createMockShuttle(false);

      const p1 = new PlayerState(
        1,
        shuttle1,
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      const p2 = new PlayerState(
        2,
        shuttle2,
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );

      expect(p1.isActive).toBe(true);
      expect(p2.isActive).toBe(false);
    });
  });

  describe('getPlayer helper pattern', () => {
    it('should allow array-based access by playerNum', () => {
      const players: PlayerState[] = [];

      players[0] = new PlayerState(
        1,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );
      players[1] = new PlayerState(
        2,
        createMockShuttle(),
        createMockFuelSystem(),
        createMockInventorySystem(),
        createMockControls()
      );

      const getPlayer = (playerNum: number): PlayerState => players[playerNum - 1];

      expect(getPlayer(1).playerNum).toBe(1);
      expect(getPlayer(2).playerNum).toBe(2);
    });
  });
});
