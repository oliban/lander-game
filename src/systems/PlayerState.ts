import { Shuttle, ShuttleControls } from '../objects/Shuttle';
import { FuelSystem } from './FuelSystem';
import { InventorySystem } from './InventorySystem';

/**
 * PlayerState consolidates all player-specific state into a single class.
 * This replaces the duplicate P1/P2 properties pattern in GameScene.
 *
 * Usage:
 *   const player = this.getPlayer(playerNum);
 *   const shuttle = player.shuttle;
 *   const fuelSys = player.fuelSystem;
 */
export class PlayerState {
  /** Player number (1 or 2) */
  readonly playerNum: number;

  /** The player's shuttle */
  shuttle: Shuttle;

  /** The player's fuel system */
  fuelSystem: FuelSystem;

  /** The player's inventory system */
  inventorySystem: InventorySystem;

  /** The player's control keys */
  controls: ShuttleControls;

  /** Kill count for dogfight mode */
  kills: number = 0;

  /** Death message for game over screen */
  deathMessage: string = '';

  /** Sonic boom triggered flag (prevents repeated triggers) */
  sonicBoomTriggered: boolean = false;

  constructor(
    playerNum: number,
    shuttle: Shuttle,
    fuelSystem: FuelSystem,
    inventorySystem: InventorySystem,
    controls: ShuttleControls
  ) {
    this.playerNum = playerNum;
    this.shuttle = shuttle;
    this.fuelSystem = fuelSystem;
    this.inventorySystem = inventorySystem;
    this.controls = controls;
  }

  /**
   * Check if this player's shuttle is active (not crashed/destroyed)
   */
  get isActive(): boolean {
    return this.shuttle?.active ?? false;
  }
}
