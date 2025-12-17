import Phaser from 'phaser';
import { COUNTRIES } from '../constants';

type CauseOfDeath = 'water' | 'terrain' | 'landing' | 'duck' | 'void' | 'fuel' | string;

export interface TombstoneCallbacks {
  getTerrainHeightAt: (x: number) => number;
  onAchievementUnlock: (achievementId: string) => void;
  playSound: (key: string, config?: { volume?: number }) => void;
  isGameInitialized: () => boolean;
}

export class TombstoneManager {
  private scene: Phaser.Scene;
  private callbacks: TombstoneCallbacks;

  // Tombstone data
  private tombstoneGraphics: Phaser.GameObjects.Container[] = [];
  private tombstoneBodies: MatterJS.BodyType[] = [];
  private static readonly TOMBSTONE_STORAGE_KEY = 'peaceShuttle_tombstones';

  // Puskás Award tracking (juggling tombstones)
  private tombstoneBounceCount: number = 0;
  private juggledTombstoneId: number | null = null;
  private lastTombstoneBounceTime: number = 0;

  // Water bounds (cached)
  private atlanticStart: number;
  private atlanticEnd: number;

  constructor(scene: Phaser.Scene, callbacks: TombstoneCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    // Cache water bounds
    this.atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    this.atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
  }

  initialize(): void {
    this.tombstoneGraphics = [];
    this.tombstoneBodies = [];
    this.tombstoneBounceCount = 0;
    this.juggledTombstoneId = null;
    this.lastTombstoneBounceTime = 0;

    // Load tombstones from previous deaths
    this.loadTombstones();
  }

  update(): void {
    this.updatePhysics();
    this.updateSinking();
  }

  private loadTombstones(): void {
    try {
      const saved = localStorage.getItem(TombstoneManager.TOMBSTONE_STORAGE_KEY);
      if (saved) {
        const tombstones: { x: number; y: number; date: string; cause?: CauseOfDeath }[] = JSON.parse(saved);
        // Limit to last 20 tombstones to prevent clutter
        const recent = tombstones.slice(-20);
        for (const ts of recent) {
          // All tombstones have physics so they react to explosions
          this.createTombstoneGraphic(ts.x, ts.y, false, false, ts.cause);
        }
      }
    } catch (e) {
      console.error('Failed to load tombstones:', e);
    }
  }

  private saveTombstone(x: number, y: number, cause?: CauseOfDeath): void {
    try {
      const saved = localStorage.getItem(TombstoneManager.TOMBSTONE_STORAGE_KEY);
      const tombstones: { x: number; y: number; date: string; cause?: CauseOfDeath }[] = saved ? JSON.parse(saved) : [];
      tombstones.push({ x, y, date: new Date().toISOString(), cause });
      // Keep only last 50 tombstones
      const trimmed = tombstones.slice(-50);
      localStorage.setItem(TombstoneManager.TOMBSTONE_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save tombstone:', e);
    }
  }

  private getCauseEmoji(cause?: CauseOfDeath): string {
    // Standard death causes
    switch (cause) {
      case 'water': return '🌊';
      case 'terrain': return '💥';
      case 'landing': return '🛬';
      case 'duck': return '🦆';
      case 'void': return '🌌';
      case 'fuel': return '⛽';
      case 'p1_bombed': return '🟢';
      case 'p2_bombed': return '🔵';
      case 'self_bomb': return '🤦';
    }

    // Projectile type emojis
    const projectileEmojis: { [key: string]: string } = {
      'teacup': '🫖',
      'doubledecker': '🚌',
      'blackcab': '🚕',
      'guardhat': '💂',
      'baguette': '🥖',
      'wine': '🍷',
      'croissant': '🥐',
      'pretzel': '🥨',
      'beer': '🍺',
      'pierogi': '🥟',
      'pottery': '🏺',
      'proj_matryoshka': '🪆',
      'balalaika': '🪕',
      'borscht': '🍲',
      'samovar': '🫖',
      'cannonball': '💣',
      'lightning': '⚡',
    };

    if (cause && projectileEmojis[cause]) {
      return projectileEmojis[cause];
    }

    return '💀';
  }

  private createTombstoneGraphic(
    x: number,
    y: number,
    isStatic: boolean = true,
    isUnderwater: boolean = false,
    cause?: CauseOfDeath
  ): { container: Phaser.GameObjects.Container; body: MatterJS.BodyType | null } {
    const container = this.scene.add.container(x, y);
    container.setDepth(5);

    // Use darker, bluer colors if underwater
    const stoneColor = isUnderwater ? 0x334455 : 0x555555;
    const edgeColor = isUnderwater ? 0x223344 : 0x333333;
    const crossColor = isUnderwater ? 0x556677 : 0x888888;
    const textColor = isUnderwater ? '#667788' : '#AAAAAA';
    const stoneAlpha = isUnderwater ? 0.6 : 1;
    const textAlpha = isUnderwater ? 0.4 : 1;

    // Tombstone body (rounded rectangle)
    const stone = this.scene.add.graphics();
    stone.fillStyle(stoneColor, stoneAlpha);
    stone.fillRoundedRect(-12, -30, 24, 30, { tl: 8, tr: 8, bl: 2, br: 2 });
    // Darker edge
    stone.lineStyle(2, edgeColor);
    stone.strokeRoundedRect(-12, -30, 24, 30, { tl: 8, tr: 8, bl: 2, br: 2 });

    // Cross on top
    stone.fillStyle(crossColor, stoneAlpha);
    stone.fillRect(-2, -38, 4, 10);
    stone.fillRect(-6, -34, 12, 4);

    // RIP text
    const ripText = this.scene.add.text(0, -18, 'RIP', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: textColor,
      fontStyle: 'bold',
    });
    ripText.setOrigin(0.5, 0.5);
    ripText.setAlpha(textAlpha);

    // Cause of death emoji below RIP
    const causeEmoji = this.scene.add.text(0, -7, this.getCauseEmoji(cause), {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9px',
    });
    causeEmoji.setOrigin(0.5, 0.5);
    causeEmoji.setAlpha(textAlpha);

    container.add([stone, ripText, causeEmoji]);
    this.tombstoneGraphics.push(container);

    // Create physics body for dynamic tombstones
    let body: MatterJS.BodyType | null = null;
    if (!isStatic) {
      const matter = (this.scene as any).matter;
      body = matter.add.rectangle(x, y - 15, 24, 38, {
        isStatic: false,
        label: 'tombstone',
        friction: 0.8,
        frictionAir: 0.01,
        restitution: 0.2,
        mass: 2,
        collisionFilter: {
          category: 8,
          mask: 1 | 2,
        },
      });
      this.tombstoneBodies.push(body!);

      // Link body to container for syncing
      (body as unknown as { containerRef: Phaser.GameObjects.Container }).containerRef = container;
    }

    return { container, body };
  }

  spawnTombstone(deathX: number, deathY: number, cause?: CauseOfDeath): void {
    const isInWater = deathX >= this.atlanticStart && deathX < this.atlanticEnd;
    const terrainY = this.callbacks.getTerrainHeightAt(deathX);

    if (isInWater) {
      // For water deaths, delay the tombstone spawn until after the ship has sunk
      const sinkDepth = terrainY + 150;

      this.scene.time.delayedCall(3500, () => {
        this.saveTombstone(deathX, sinkDepth, cause);
        this.createTombstoneGraphic(deathX, sinkDepth, true, true, cause);
      });
    } else {
      // Normal death - spawn physics tombstone at death location
      this.saveTombstone(deathX, terrainY, cause);
      this.createTombstoneGraphic(deathX, deathY, false, false, cause);
    }
  }

  private updatePhysics(): void {
    for (const body of this.tombstoneBodies) {
      if (!body) continue;
      const container = (body as unknown as { containerRef: Phaser.GameObjects.Container }).containerRef;
      if (container) {
        container.setPosition(body.position.x, body.position.y + 15);
        container.setRotation(body.angle);
      }
    }
  }

  private updateSinking(): void {
    for (let i = this.tombstoneBodies.length - 1; i >= 0; i--) {
      const body = this.tombstoneBodies[i];
      if (!body) continue;

      const container = (body as unknown as { containerRef: Phaser.GameObjects.Container }).containerRef;
      if (!container) continue;

      const isInWater = body.position.x >= this.atlanticStart && body.position.x < this.atlanticEnd;

      if (isInWater) {
        const waterLevel = this.callbacks.getTerrainHeightAt(body.position.x);

        if (body.position.y > waterLevel - 20) {
          const alreadySinking = (body as unknown as { isSinking?: boolean }).isSinking;

          if (!alreadySinking) {
            (body as unknown as { isSinking: boolean }).isSinking = true;

            const splashX = body.position.x;
            const splashY = waterLevel;

            // Remove physics body from world
            const matter = (this.scene as any).matter;
            matter.world.remove(body);
            this.tombstoneBodies.splice(i, 1);

            const sinkDepth = waterLevel + 150;
            this.saveTombstone(splashX, sinkDepth);

            // Splash effect (only if game initialized)
            if (this.callbacks.isGameInitialized()) {
              this.callbacks.playSound('water_splash', { volume: 0.3 });
              this.createSplashEffect(splashX, splashY);
            }

            // Sink animation
            this.scene.tweens.add({
              targets: container,
              y: sinkDepth,
              duration: 3000,
              ease: 'Sine.easeIn',
            });

            // Tint to underwater colors
            this.scene.tweens.add({
              targets: container,
              alpha: 0.6,
              duration: 2000,
            });
          }
        }
      }
    }
  }

  private createSplashEffect(splashX: number, splashY: number): void {
    // Water droplets
    for (let d = 0; d < 18; d++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 4 + Math.random() * 8;
      const droplet = this.scene.add.graphics();
      droplet.fillStyle(0x4169E1, 0.8);
      droplet.fillCircle(0, 0, 3 + Math.random() * 5);
      droplet.setPosition(splashX + (Math.random() - 0.5) * 25, splashY);
      droplet.setDepth(101);

      this.scene.tweens.add({
        targets: droplet,
        x: droplet.x + Math.cos(angle) * speed * 14,
        y: droplet.y + Math.sin(angle) * speed * 16 + 50,
        alpha: 0,
        scale: 0.3,
        duration: 600 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      });
    }

    // Expanding ripples
    for (let r = 0; r < 3; r++) {
      const ripple = this.scene.add.graphics();
      ripple.lineStyle(2, 0x87CEEB, 0.7);
      ripple.strokeCircle(splashX, splashY, 5);
      ripple.setDepth(100);

      this.scene.tweens.add({
        targets: ripple,
        scaleX: 4 + r * 2,
        scaleY: 1.5 + r * 0.5,
        alpha: 0,
        duration: 800 + r * 200,
        delay: r * 150,
        ease: 'Quad.easeOut',
        onComplete: () => ripple.destroy(),
      });
    }

    // Foam bubbles
    for (let b = 0; b < 8; b++) {
      const foam = this.scene.add.graphics();
      foam.fillStyle(0xFFFFFF, 0.6);
      foam.fillCircle(0, 0, 2 + Math.random() * 3);
      foam.setPosition(splashX + (Math.random() - 0.5) * 30, splashY + Math.random() * 10);
      foam.setDepth(102);

      this.scene.tweens.add({
        targets: foam,
        y: foam.y - 20 - Math.random() * 20,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        delay: 100 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => foam.destroy(),
      });
    }
  }

  // Called when shuttle collides with tombstone
  handleBounce(tombstoneBody: MatterJS.BodyType): void {
    const now = Date.now();
    const tombstoneId = tombstoneBody.id;

    const velocity = tombstoneBody.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    // If this is the first contact with this tombstone, just start tracking it
    if (this.juggledTombstoneId !== tombstoneId) {
      this.tombstoneBounceCount = 0;
      this.juggledTombstoneId = tombstoneId;
      this.lastTombstoneBounceTime = now;
      console.log(`[PUSKAS] Started juggling tombstone ${tombstoneId} - kick it again while airborne!`);
      return;
    }

    // Debounce - ignore if same tombstone collision within 300ms
    if (now - this.lastTombstoneBounceTime < 300) {
      return;
    }

    // Only count as bounce if tombstone has some velocity
    if (speed < 0.5) {
      console.log(`[PUSKAS] Tombstone ${tombstoneId} not moving fast enough (speed: ${speed.toFixed(2)}) - not a valid bounce`);
      return;
    }

    this.lastTombstoneBounceTime = now;
    this.tombstoneBounceCount++;

    console.log(`[PUSKAS] Tombstone bounce #${this.tombstoneBounceCount} (tombstone ${tombstoneId}, speed: ${speed.toFixed(2)})`);

    // Award achievement for 3 bounces in a row
    if (this.tombstoneBounceCount >= 3) {
      this.callbacks.onAchievementUnlock('puskas_award');
    }
  }

  // Called when tombstone hits terrain (resets juggle)
  resetJuggle(tombstoneBody: MatterJS.BodyType): void {
    if (tombstoneBody.id === this.juggledTombstoneId) {
      this.tombstoneBounceCount = 0;
      this.juggledTombstoneId = null;
    }
  }

  // Check if a body is a tombstone
  isTombstoneBody(body: MatterJS.BodyType): boolean {
    return body.label === 'tombstone';
  }

  // Get all tombstone bodies (for explosion shockwave)
  getBodies(): MatterJS.BodyType[] {
    return this.tombstoneBodies;
  }

  // Cleanup
  destroy(): void {
    for (const container of this.tombstoneGraphics) {
      container.destroy();
    }
    this.tombstoneGraphics = [];

    const matter = (this.scene as any).matter;
    for (const body of this.tombstoneBodies) {
      if (body) {
        matter.world.remove(body);
      }
    }
    this.tombstoneBodies = [];
  }
}
