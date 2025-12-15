import Phaser from 'phaser';
import { getCollectionSystem } from '../systems/CollectionSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { COUNTRIES, COLLECTIBLE_TYPES } from '../constants';

export interface PropagandaCallbacks {
  getShuttle: () => { x: number; y: number };
  getTerrainHeightAt: (x: number) => number;
  getInventorySystem: () => InventorySystem;
  playBoingSound: () => void;
}

export class PropagandaManager {
  private scene: Phaser.Scene;
  private callbacks: PropagandaCallbacks;

  // Propaganda banners dropped from biplanes
  private propagandaBanners: Phaser.GameObjects.Container[] = [];

  // Water bounds (cached)
  private atlanticStart: number;
  private atlanticEnd: number;

  constructor(scene: Phaser.Scene, callbacks: PropagandaCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    // Cache water bounds
    this.atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    this.atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 5000;
  }

  initialize(): void {
    this.propagandaBanners = [];
  }

  update(): void {
    this.updatePropagandaBanners();
  }

  spawnBanner(startX: number, startY: number, propagandaType: string, message: string, accentColor: number): void {
    // Create banner container
    const banner = this.scene.add.container(startX, startY);
    banner.setDepth(50);
    banner.setData('collected', false);
    banner.setData('grounded', false);
    banner.setData('sinking', false);
    banner.setData('propagandaType', propagandaType);

    // Banner graphic - tattered shape
    const bannerGraphics = this.scene.add.graphics();
    const bw = 70;

    bannerGraphics.fillStyle(0xFFFFF5, 0.9);
    bannerGraphics.beginPath();
    bannerGraphics.moveTo(-bw / 2, -8);
    bannerGraphics.lineTo(bw / 2 - 8, -10);
    bannerGraphics.lineTo(bw / 2, 6);
    bannerGraphics.lineTo(bw / 2 - 15, 10);
    bannerGraphics.lineTo(-bw / 2 + 5, 8);
    bannerGraphics.lineTo(-bw / 2, -8);
    bannerGraphics.closePath();
    bannerGraphics.fillPath();

    bannerGraphics.lineStyle(2, accentColor, 0.8);
    bannerGraphics.strokePath();

    banner.add(bannerGraphics);

    // Add truncated message text
    const shortMessage = message.length > 12 ? message.substring(0, 12) + '...' : message;
    const msgText = this.scene.add.text(0, 0, shortMessage, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '7px',
      color: '#333333',
      fontStyle: 'bold',
    });
    msgText.setOrigin(0.5, 0.5);
    banner.add(msgText);

    this.propagandaBanners.push(banner);

    // Calculate terrain landing position
    const terrainY = this.callbacks.getTerrainHeightAt(startX) - 15;

    // Check if landing in water (Atlantic Ocean)
    const isOverWater = startX >= this.atlanticStart && startX < this.atlanticEnd;

    // Falling leaf animation - swaying side to side while descending (50% faster)
    const fallDuration = 3000;
    const swayAmount = 120;
    const swayFrequency = 3;

    let elapsed = 0;
    const leafUpdate = this.scene.time.addEvent({
      delay: 16,
      repeat: Math.floor(fallDuration / 16),
      callback: () => {
        if (!banner || !banner.active || banner.getData('collected')) {
          leafUpdate.destroy();
          return;
        }

        elapsed += 16;
        const progress = Math.min(elapsed / fallDuration, 1);

        // Vertical fall with slight acceleration, but stop at terrain
        const targetY = startY + progress * progress * (terrainY - startY);
        banner.y = Math.min(targetY, terrainY);

        // Horizontal sway (sinusoidal)
        const swayProgress = progress * swayFrequency * Math.PI * 2;
        banner.x = startX + Math.sin(swayProgress) * swayAmount * (1 - progress * 0.5);

        // Rotation follows the sway direction (tilts into the turn)
        const swayVelocity = Math.cos(swayProgress);
        banner.angle = swayVelocity * 35;

        // Check if landed on terrain/water
        if (banner.y >= terrainY - 5) {
          banner.y = terrainY;
          banner.angle = (Math.random() - 0.5) * 20; // Random resting angle
          banner.setData('grounded', true);
          leafUpdate.destroy();

          // If landed in water, start sinking
          if (isOverWater) {
            banner.setData('sinking', true);
            const sinkDepth = terrainY + 150;

            this.scene.tweens.add({
              targets: banner,
              y: sinkDepth,
              alpha: 0,
              duration: 3000,
              ease: 'Quad.easeIn',
              onComplete: () => {
                const idx = this.propagandaBanners.indexOf(banner);
                if (idx >= 0) {
                  this.propagandaBanners.splice(idx, 1);
                }
                banner.destroy();
              },
            });
          } else {
            // Fade out after 15 seconds if not collected (on land)
            this.scene.time.delayedCall(15000, () => {
              if (banner && banner.active && !banner.getData('collected')) {
                const idx = this.propagandaBanners.indexOf(banner);
                if (idx >= 0) {
                  this.propagandaBanners.splice(idx, 1);
                }

                this.scene.tweens.add({
                  targets: banner,
                  alpha: 0,
                  duration: 500,
                  onComplete: () => banner.destroy(),
                });
              }
            });
          }
        }
      },
    });
  }

  private updatePropagandaBanners(): void {
    const pickupRadius = 60;
    const shuttle = this.callbacks.getShuttle();

    for (let i = this.propagandaBanners.length - 1; i >= 0; i--) {
      const banner = this.propagandaBanners[i];
      if (!banner || !banner.active || banner.getData('collected') || banner.getData('sinking')) continue;

      const dx = shuttle.x - banner.x;
      const dy = shuttle.y - banner.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Can catch mid-air or on ground
      if (dist < pickupRadius) {
        banner.setData('collected', true);

        // Play boing sound
        this.callbacks.playBoingSound();

        // Add to cargo inventory
        const propagandaType = banner.getData('propagandaType') as keyof typeof COLLECTIBLE_TYPES;
        this.callbacks.getInventorySystem().add(propagandaType);

        // Track in collection
        const collectionSystem = getCollectionSystem();
        collectionSystem.markDiscovered(propagandaType);

        // Get display name from constants
        const itemData = COLLECTIBLE_TYPES[propagandaType];
        const displayName = itemData ? itemData.name : 'Propaganda';

        // Show pickup text
        const pickupText = this.scene.add.text(banner.x, banner.y - 20, `+1 ${displayName.toUpperCase()}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          color: '#3C3B6E',
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

        // Collect animation - banner flies to shuttle
        this.scene.tweens.killTweensOf(banner);
        this.scene.tweens.add({
          targets: banner,
          x: shuttle.x,
          y: shuttle.y,
          scale: 0,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            const idx = this.propagandaBanners.indexOf(banner);
            if (idx >= 0) {
              this.propagandaBanners.splice(idx, 1);
            }
            banner.destroy();
          },
        });
      }
    }
  }

  // Cleanup
  destroy(): void {
    for (const banner of this.propagandaBanners) {
      if (banner) {
        banner.destroy();
      }
    }
    this.propagandaBanners = [];
  }
}
