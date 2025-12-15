import Phaser from 'phaser';
import { LandingPad } from '../objects/LandingPad';
import { Collectible } from '../objects/Collectible';

export interface CollisionManagerCallbacks {
  getShuttle1BodyId: () => number;
  getShuttle2BodyId: () => number;
  onTerrainCollision: (playerNum: number) => void;
  onLandingPadCollision: (pad: LandingPad, playerNum: number) => void;
  onBoatDeckCollision: (playerNum: number) => void;
  onProjectileHit: (playerNum: number) => void;
  onCollectiblePickup: (collectible: Collectible, playerNum: number) => void;
  onTombstoneBounce: (tombstoneBody: MatterJS.BodyType) => void;
  onBrickWallCollision: (playerNum: number) => void;
  onTombstoneTerrainCollision: (tombstoneBody: MatterJS.BodyType) => void;
}

export class CollisionManager {
  private scene: Phaser.Scene;
  private callbacks: CollisionManagerCallbacks;

  constructor(scene: Phaser.Scene, callbacks: CollisionManagerCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Set up Matter.js collision event listeners
   */
  initialize(): void {
    this.scene.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Check shuttle collision with terrain
        if (this.isShuttleCollision(bodyA, bodyB, 'terrain')) {
          const shuttleBody = bodyA.label === 'terrain' ? bodyB : bodyA;
          const playerNum = this.getPlayerFromBody(shuttleBody);
          this.callbacks.onTerrainCollision(playerNum);
        }

        // Check shuttle collision with landing pad
        if (this.isShuttleCollision(bodyA, bodyB, 'landingPad')) {
          const padBody = bodyA.label === 'landingPad' ? bodyA : bodyB;
          const shuttleBody = bodyA.label === 'landingPad' ? bodyB : bodyA;
          const pad = (padBody as unknown as { landingPadRef: LandingPad }).landingPadRef;
          if (pad) {
            const playerNum = this.getPlayerFromBody(shuttleBody);
            this.callbacks.onLandingPadCollision(pad, playerNum);
          }
        }

        // Check shuttle collision with boat deck
        if (this.isShuttleCollision(bodyA, bodyB, 'boatDeck')) {
          const shuttleBody = bodyA.label === 'boatDeck' ? bodyB : bodyA;
          const playerNum = this.getPlayerFromBody(shuttleBody);
          this.callbacks.onBoatDeckCollision(playerNum);
        }

        // Check shuttle collision with projectile
        if (this.isShuttleCollision(bodyA, bodyB, 'projectile')) {
          const shuttleBody = bodyA.label === 'projectile' ? bodyB : bodyA;
          const playerNum = this.getPlayerFromBody(shuttleBody);
          this.callbacks.onProjectileHit(playerNum);
        }

        // Check shuttle collision with collectible
        if (this.isShuttleCollision(bodyA, bodyB, 'collectible')) {
          const collectibleBody = bodyA.label === 'collectible' ? bodyA : bodyB;
          const shuttleBody = bodyA.label === 'collectible' ? bodyB : bodyA;
          const collectible = (collectibleBody as unknown as { collectibleRef: Collectible }).collectibleRef;
          if (collectible) {
            const playerNum = this.getPlayerFromBody(shuttleBody);
            this.callbacks.onCollectiblePickup(collectible, playerNum);
          }
        }

        // Check shuttle collision with tombstone (for Puskás Award)
        if (this.isShuttleCollision(bodyA, bodyB, 'tombstone')) {
          const tombstoneBody = bodyA.label === 'tombstone' ? bodyA : bodyB;
          this.callbacks.onTombstoneBounce(tombstoneBody);
        }

        // Check shuttle collision with brick wall
        if (this.isShuttleCollision(bodyA, bodyB, 'brick_wall')) {
          const shuttleBody = bodyA.label === 'brick_wall' ? bodyB : bodyA;
          const playerNum = this.getPlayerFromBody(shuttleBody);
          this.callbacks.onBrickWallCollision(playerNum);
        }

        // Check tombstone collision with terrain (resets juggle count)
        if (this.isTombstoneTerrainCollision(bodyA.label, bodyB.label)) {
          const tombstoneBody = bodyA.label === 'tombstone' ? bodyA : bodyB;
          this.callbacks.onTombstoneTerrainCollision(tombstoneBody);
        }
      }
    });
  }

  /**
   * Check if a collision involves a shuttle and a specific labeled body
   */
  private isShuttleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType, label: string): boolean {
    const shuttle1BodyId = this.callbacks.getShuttle1BodyId();
    const shuttle2BodyId = this.callbacks.getShuttle2BodyId();

    const isShuttleA = bodyA.id === shuttle1BodyId || bodyA.id === shuttle2BodyId;
    const isShuttleB = bodyB.id === shuttle1BodyId || bodyB.id === shuttle2BodyId;

    return (isShuttleA && bodyB.label === label) || (isShuttleB && bodyA.label === label);
  }

  /**
   * Determine which player (1 or 2) from a shuttle body
   */
  private getPlayerFromBody(shuttleBody: MatterJS.BodyType): number {
    const shuttle2BodyId = this.callbacks.getShuttle2BodyId();
    if (shuttle2BodyId !== -1 && shuttleBody.id === shuttle2BodyId) {
      return 2;
    }
    return 1;
  }

  /**
   * Check if collision is between tombstone and terrain
   */
  private isTombstoneTerrainCollision(labelA: string, labelB: string): boolean {
    return (labelA === 'tombstone' && labelB === 'terrain') ||
           (labelB === 'tombstone' && labelA === 'terrain');
  }
}
