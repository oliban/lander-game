import Phaser from 'phaser';
import { getCollectionSystem } from '../systems/CollectionSystem';
import { InventorySystem } from '../systems/InventorySystem';

export interface EpsteinFilesCallbacks {
  getShuttle: () => { x: number; y: number; getVelocity: () => { total: number } };
  getTerrainHeightAt: (x: number) => number;
  getInventorySystem: () => InventorySystem;
  playBoingSound: () => void;
}

export class EpsteinFilesManager {
  private scene: Phaser.Scene;
  private callbacks: EpsteinFilesCallbacks;

  // Epstein files dropped from golf cart
  private epsteinFiles: Phaser.GameObjects.Container[] = [];

  // Constants (exposed for testing)
  static readonly PICKUP_RADIUS = 60;
  static readonly LANDED_VELOCITY_THRESHOLD = 0.5;

  constructor(scene: Phaser.Scene, callbacks: EpsteinFilesCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  initialize(): void {
    this.epsteinFiles = [];
  }

  update(): void {
    this.updateEpsteinFiles();
  }

  spawnFiles(positions: { x: number; y: number }[]): void {
    // Spawn collectible Epstein Files at the given positions
    for (const pos of positions) {
      // Create a file document graphic
      const file = this.scene.add.container(pos.x, pos.y);
      file.setDepth(50);
      file.setData('collected', false);

      // File folder graphic
      const folder = this.scene.add.graphics();
      // Folder tab
      folder.fillStyle(0xDEB887, 1); // Burlywood (manila)
      folder.fillRoundedRect(-12, -18, 10, 5, 2);
      // Main folder
      folder.fillStyle(0xF5DEB3, 1); // Wheat (manila folder)
      folder.fillRoundedRect(-15, -15, 30, 22, 3);
      // Folder outline
      folder.lineStyle(1, 0xCD853F, 1);
      folder.strokeRoundedRect(-15, -15, 30, 22, 3);
      // "CLASSIFIED" text line
      folder.fillStyle(0x8B0000, 1);
      folder.fillRect(-10, -8, 20, 3);
      // Document lines
      folder.fillStyle(0x333333, 0.3);
      folder.fillRect(-10, -2, 18, 2);
      folder.fillRect(-10, 2, 15, 2);

      file.add(folder);

      // "EPSTEIN" label
      const label = this.scene.add.text(0, -5, 'EPSTEIN', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '6px',
        color: '#8B0000',
        fontStyle: 'bold',
      });
      label.setOrigin(0.5, 0.5);
      file.add(label);

      // Track this file for pickup detection
      this.epsteinFiles.push(file);

      // Animate file scattering then floating down to terrain
      const scatterX = pos.x + (Math.random() - 0.5) * 100;
      const scatterY = pos.y - 50 - Math.random() * 30;
      const terrainY = this.callbacks.getTerrainHeightAt(scatterX) - 15; // Land on terrain

      // First scatter upward
      this.scene.tweens.add({
        targets: file,
        x: scatterX,
        y: scatterY,
        angle: (Math.random() - 0.5) * 60,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Then float down to terrain level
          this.scene.tweens.add({
            targets: file,
            y: terrainY,
            angle: file.angle + (Math.random() - 0.5) * 20,
            duration: 2000,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              // File is now on the ground - stay there for a while
              file.setData('grounded', true);

              // Fade out after 10 seconds if not collected
              this.scene.time.delayedCall(10000, () => {
                if (file && file.active && !file.getData('collected')) {
                  // Remove from tracking and fade out
                  const idx = this.epsteinFiles.indexOf(file);
                  if (idx >= 0) {
                    this.epsteinFiles.splice(idx, 1);
                  }

                  this.scene.tweens.add({
                    targets: file,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => file.destroy(),
                  });
                }
              });
            },
          });
        },
      });
    }
  }

  private updateEpsteinFiles(): void {
    // Check for shuttle proximity to collect files - must be landed!
    const shuttle = this.callbacks.getShuttle();

    // Check if shuttle is landed (very low velocity and on ground)
    const velocity = shuttle.getVelocity();
    const isLanded = velocity.total < EpsteinFilesManager.LANDED_VELOCITY_THRESHOLD;

    for (let i = this.epsteinFiles.length - 1; i >= 0; i--) {
      const file = this.epsteinFiles[i];
      if (!file || !file.active || file.getData('collected')) continue;

      const dx = shuttle.x - file.x;
      const dy = shuttle.y - file.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < EpsteinFilesManager.PICKUP_RADIUS && isLanded) {
        // Mark as collected
        file.setData('collected', true);

        // Play boing sound
        this.callbacks.playBoingSound();

        // Add to cargo inventory
        this.callbacks.getInventorySystem().add('EPSTEIN_FILES');

        // Track in collection
        const collectionSystem = getCollectionSystem();
        collectionSystem.markDiscovered('EPSTEIN_FILES');

        // Show pickup text
        const pickupText = this.scene.add.text(file.x, file.y - 20, '+1 EPSTEIN FILES', {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          color: '#8B0000',
          fontStyle: 'bold',
          stroke: '#FFFFFF',
          strokeThickness: 2,
        });
        pickupText.setOrigin(0.5, 0.5);
        pickupText.setDepth(150);

        this.scene.tweens.add({
          targets: pickupText,
          y: '-=30',
          alpha: 0,
          duration: 1500,
          onComplete: () => pickupText.destroy(),
        });

        // Quick collect animation - file flies to shuttle
        this.scene.tweens.killTweensOf(file); // Stop floating
        this.scene.tweens.add({
          targets: file,
          x: shuttle.x,
          y: shuttle.y,
          scale: 0,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            const idx = this.epsteinFiles.indexOf(file);
            if (idx >= 0) {
              this.epsteinFiles.splice(idx, 1);
            }
            file.destroy();
          },
        });
      }
    }
  }

  // Cleanup
  destroy(): void {
    for (const file of this.epsteinFiles) {
      if (file) {
        file.destroy();
      }
    }
    this.epsteinFiles = [];
  }
}
