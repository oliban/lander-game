import Phaser from 'phaser';
import { Shuttle } from '../objects/Shuttle';
import { LandingPad } from '../objects/LandingPad';
import { FuelSystem } from '../systems/FuelSystem';
import { Terrain } from '../objects/Terrain';

export interface SittingDuckCallbacks {
  getShuttle: () => Shuttle;
  getFuelSystem: () => FuelSystem;
  getTerrain: () => Terrain;
  getLandingPads: () => LandingPad[];
  getTimeNow: () => number;
  getGameState: () => string;
  onSittingDuckTriggered: (message: string) => void;
}

export class SittingDuckManager {
  private scene: Phaser.Scene;
  private callbacks: SittingDuckCallbacks;

  private isSittingDuck: boolean = false;
  private sittingDuckStartTime: number = 0;

  private readonly VELOCITY_THRESHOLD = 0.5;
  private readonly GROUND_TOLERANCE = 20;
  private readonly SITTING_DUCK_TIMEOUT = 2000;
  private readonly SHUTTLE_HEIGHT_OFFSET = 18;

  private readonly TAUNT_MESSAGES = [
    "You're a sitting duck! Quack quack!",
    "SITTING DUCK! The cannons thank you!",
    "Quack! Sitting duck spotted! Quack!",
    "A sitting duck! How embarrassing!",
    "🦆 SITTING DUCK ALERT! 🦆",
    "Duck, duck... BOOM! You were a sitting duck!",
    "Sitting duck! Even the ducks are laughing!",
    "What a sitting duck! Tremendous failure!",
  ];

  constructor(scene: Phaser.Scene, callbacks: SittingDuckCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Check for sitting duck condition and trigger game over if met
   */
  update(): void {
    if (this.callbacks.getGameState() !== 'playing') return;

    const fuelSystem = this.callbacks.getFuelSystem();
    const shuttle = this.callbacks.getShuttle();
    const terrain = this.callbacks.getTerrain();
    const landingPads = this.callbacks.getLandingPads();
    const timeNow = this.callbacks.getTimeNow();

    // Check if shuttle has fuel
    if (!fuelSystem.isEmpty()) {
      this.resetTimer();
      return;
    }

    // Check if shuttle is stationary
    const velocity = shuttle.getVelocity();
    const isStationary = velocity.total < this.VELOCITY_THRESHOLD;
    if (!isStationary) {
      this.resetTimer();
      return;
    }

    // Check if shuttle is on ground
    const terrainY = terrain.getHeightAt(shuttle.x);
    const shuttleBottom = shuttle.y + this.SHUTTLE_HEIGHT_OFFSET;
    const isOnGround = Math.abs(terrainY - shuttleBottom) < this.GROUND_TOLERANCE;
    if (!isOnGround) {
      this.resetTimer();
      return;
    }

    // Check if NOT on a landing pad
    const onLandingPad = landingPads.some(pad => {
      const horizontalDist = Math.abs(shuttle.x - pad.x);
      return horizontalDist < pad.width / 2 && Math.abs(pad.y - shuttleBottom) < this.GROUND_TOLERANCE;
    });
    if (onLandingPad) {
      this.resetTimer();
      return;
    }

    // All conditions met - start or check timer
    if (!this.isSittingDuck) {
      this.isSittingDuck = true;
      this.sittingDuckStartTime = timeNow;
    } else {
      const sittingTime = timeNow - this.sittingDuckStartTime;
      if (sittingTime >= this.SITTING_DUCK_TIMEOUT) {
        this.triggerSittingDuck();
      }
    }
  }

  /**
   * Reset the sitting duck timer
   */
  private resetTimer(): void {
    this.isSittingDuck = false;
    this.sittingDuckStartTime = 0;
  }

  /**
   * Trigger sitting duck game over
   */
  private triggerSittingDuck(): void {
    const message = this.TAUNT_MESSAGES[Math.floor(Math.random() * this.TAUNT_MESSAGES.length)];
    this.callbacks.onSittingDuckTriggered(message);
    this.resetTimer();
  }

  /**
   * Get current sitting duck state (for debugging)
   */
  getIsSittingDuck(): boolean {
    return this.isSittingDuck;
  }
}
