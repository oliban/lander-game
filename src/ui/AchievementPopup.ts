import Phaser from 'phaser';
import { Achievement, TIER_COLORS, TIER_LABELS } from '../data/achievements';

const POPUP_WIDTH = 280;
const POPUP_HEIGHT = 100;
const POPUP_MARGIN = 20;
const DISPLAY_DURATION = 3000;
const SLIDE_DURATION = 300;

export class AchievementPopup {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private queue: Achievement[] = [];
  private isShowing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(achievement: Achievement): void {
    this.queue.push(achievement);
    if (!this.isShowing) {
      this.showNext();
    }
  }

  private showNext(): void {
    if (this.queue.length === 0) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    const achievement = this.queue.shift()!;
    this.createPopup(achievement);
  }

  private createPopup(achievement: Achievement): void {
    const camera = this.scene.cameras.main;
    const startX = camera.width + POPUP_WIDTH / 2;
    const endX = camera.width - POPUP_WIDTH / 2 - POPUP_MARGIN;
    const y = POPUP_MARGIN + POPUP_HEIGHT / 2;

    // Create container off-screen to the right
    this.container = this.scene.add.container(startX, y);
    this.container.setScrollFactor(0);
    this.container.setDepth(10000); // Frontmost layer

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-POPUP_WIDTH / 2, -POPUP_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 12);

    // Border with tier color
    const tierColor = TIER_COLORS[achievement.tier];
    bg.lineStyle(3, tierColor, 1);
    bg.strokeRoundedRect(-POPUP_WIDTH / 2, -POPUP_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 12);

    // Trophy icon
    const trophyText = this.scene.add.text(-POPUP_WIDTH / 2 + 25, 0, '🏆', {
      fontSize: '32px',
    });
    trophyText.setOrigin(0.5, 0.5);

    // "ACHIEVEMENT UNLOCKED" header
    const header = this.scene.add.text(10, -POPUP_HEIGHT / 2 + 18, 'ACHIEVEMENT UNLOCKED', {
      fontSize: '11px',
      color: '#888888',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0.5);

    // Achievement name
    const name = this.scene.add.text(10, -5, achievement.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    name.setOrigin(0.5, 0.5);

    // Description
    const desc = this.scene.add.text(10, 18, achievement.description, {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    desc.setOrigin(0.5, 0.5);

    // Tier badge
    const tierLabel = TIER_LABELS[achievement.tier];
    const tierBadge = this.scene.add.text(POPUP_WIDTH / 2 - 15, POPUP_HEIGHT / 2 - 15, tierLabel, {
      fontSize: '10px',
      color: '#' + tierColor.toString(16).padStart(6, '0'),
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    tierBadge.setOrigin(1, 1);

    this.container.add([bg, trophyText, header, name, desc, tierBadge]);

    // Play achievement chime sound using Web Audio API
    this.playAchievementSound();

    // Slide in animation
    this.scene.tweens.add({
      targets: this.container,
      x: endX,
      duration: SLIDE_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Wait then slide out
        this.scene.time.delayedCall(DISPLAY_DURATION, () => {
          this.slideOut();
        });
      },
    });
  }

  private slideOut(): void {
    if (!this.container) return;

    const camera = this.scene.cameras.main;
    const exitX = camera.width + POPUP_WIDTH / 2;

    this.scene.tweens.add({
      targets: this.container,
      x: exitX,
      duration: SLIDE_DURATION,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (this.container) {
          this.container.destroy();
          this.container = null;
        }
        this.showNext();
      },
    });
  }

  destroy(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.queue = [];
    this.isShowing = false;
  }

  private playAchievementSound(): void {
    try {
      // Get the Web Audio context from Phaser's sound manager
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const soundManager = this.scene.sound as any;
      const audioContext = soundManager.context as AudioContext;
      if (!audioContext) return;

      const sampleRate = audioContext.sampleRate;
      const duration = 0.5;
      const numSamples = Math.floor(sampleRate * duration);

      // Create audio buffer for the chime
      const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      // Generate a pleasant PS5-style achievement chime
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;

        // First tone (higher pitch) - quick attack
        const freq1 = 880; // A5
        const env1 = Math.exp(-t * 8) * (t < 0.1 ? t * 10 : 1);

        // Second tone (harmonious) - delayed start
        const freq2 = 659.25; // E5
        const delay = 0.08;
        const t2 = Math.max(0, t - delay);
        const env2 = t > delay ? Math.exp(-t2 * 6) * (t2 < 0.08 ? t2 * 12.5 : 1) : 0;

        // Third tone (lower) - more delayed
        const freq3 = 523.25; // C5
        const delay3 = 0.16;
        const t3 = Math.max(0, t - delay3);
        const env3 = t > delay3 ? Math.exp(-t3 * 5) * (t3 < 0.08 ? t3 * 12.5 : 1) : 0;

        // Combine tones
        const sample =
          Math.sin(2 * Math.PI * freq1 * t) * env1 * 0.4 +
          Math.sin(2 * Math.PI * freq2 * t) * env2 * 0.35 +
          Math.sin(2 * Math.PI * freq3 * t) * env3 * 0.25;

        channelData[i] = sample * 0.4; // Overall volume
      }

      // Play the buffer
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.6;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();
    } catch {
      // Audio context may not be available
    }
  }
}
