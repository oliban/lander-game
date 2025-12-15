import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DOGFIGHT_CONFIG } from '../constants';
import { Shuttle } from '../objects/Shuttle';
import { LandingPad } from '../objects/LandingPad';

export interface DogfightCallbacks {
  getShuttles: () => Shuttle[];
  getLandingPads: () => LandingPad[];
  getMusicManager: () => { fadeOutAndStop: (duration: number) => void };
  playSound: (key: string, config?: { volume?: number }) => void;
  setGameState: (state: string) => void;
  stopUIScene: () => void;
  restartScene: (data: object) => void;
  startMenuScene: () => void;
}

export class DogfightManager {
  private scene: Phaser.Scene;
  private callbacks: DogfightCallbacks;

  constructor(scene: Phaser.Scene, callbacks: DogfightCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Update auto landing gear for all shuttles in dogfight mode.
   * Extends gear when close to pads, retracts when far from all pads.
   */
  updateAutoLandingGear(): void {
    const shuttles = this.callbacks.getShuttles();
    const landingPads = this.callbacks.getLandingPads();

    for (const shuttle of shuttles) {
      if (!shuttle.active) continue;

      // Find minimum distance to any landing pad
      let minDistToPad = Infinity;
      for (const pad of landingPads) {
        const dx = shuttle.x - pad.x;
        const dy = shuttle.y - pad.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistToPad) {
          minDistToPad = dist;
        }
      }

      // Auto-extend when close to a pad
      if (minDistToPad < DOGFIGHT_CONFIG.AUTO_GEAR_EXTEND_DISTANCE) {
        shuttle.extendLandingGear();
      }
      // Auto-retract when far from all pads
      else if (minDistToPad > DOGFIGHT_CONFIG.AUTO_GEAR_RETRACT_DISTANCE) {
        shuttle.retractLandingGear();
      }
    }
  }

  /**
   * Show the dogfight winner screen with celebration effects.
   */
  showWinner(p1Kills: number, p2Kills: number): void {
    const winner = p1Kills >= DOGFIGHT_CONFIG.KILLS_TO_WIN ? 1 : 2;
    const winnerColor = winner === 1 ? '#FF6B6B' : '#4ECDC4';

    // Freeze gameplay
    this.callbacks.setGameState('victory');

    // Fade out country music and play victory fanfare
    this.callbacks.getMusicManager().fadeOutAndStop(1500);
    this.callbacks.playSound('fanfare', { volume: 0.8 });

    // Dark overlay
    this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(999);

    // Trophy emoji
    this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, '🏆', {
      fontSize: '96px'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Winner announcement
    this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30,
      `PLAYER ${winner} WINS!`, {
      fontSize: '56px',
      color: winnerColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Final score
    this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40,
      `Final Score: ${p1Kills} - ${p2Kills}`, {
      fontSize: '32px',
      color: '#FFFFFF'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Instructions
    this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100,
      'Press ENTER to play again\nPress ESC for menu', {
      fontSize: '20px',
      color: '#AAAAAA',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Celebration particles (confetti)
    this.createVictoryParticles();

    // Key handlers for restart
    const enterKey = this.scene.input.keyboard!.addKey('ENTER');
    enterKey.once('down', () => {
      this.callbacks.stopUIScene();
      this.callbacks.restartScene({ playerCount: 2, gameMode: 'dogfight', p1Kills: 0, p2Kills: 0 });
    });

    const escKey = this.scene.input.keyboard!.addKey('ESC');
    escKey.once('down', () => {
      this.callbacks.stopUIScene();
      this.callbacks.startMenuScene();
    });
  }

  /**
   * Create confetti particles for victory celebration.
   */
  private createVictoryParticles(): void {
    const colors = [0xFFD700, 0xFF6B6B, 0x4ECDC4, 0xFFFFFF];
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * GAME_WIDTH;
      const particle = this.scene.add.rectangle(x, -20, 8, 8, colors[i % colors.length])
        .setScrollFactor(0).setDepth(1001);

      this.scene.tweens.add({
        targets: particle,
        y: GAME_HEIGHT + 50,
        x: x + (Math.random() - 0.5) * 200,
        rotation: Math.random() * 10,
        duration: 2000 + Math.random() * 2000,
        delay: Math.random() * 1000,
        ease: 'Quad.easeIn'
      });
    }
  }

  /**
   * Quick restart after a death in dogfight mode (preserves kill counts).
   */
  quickRestart(p1Kills: number, p2Kills: number): void {
    this.scene.time.delayedCall(DOGFIGHT_CONFIG.RESTART_DELAY_MS, () => {
      this.callbacks.stopUIScene();
      this.callbacks.restartScene({
        playerCount: 2,
        gameMode: 'dogfight',
        p1Kills: p1Kills,
        p2Kills: p2Kills,
      });
    });
  }

  /**
   * Check if a player has won the dogfight.
   */
  checkForWinner(p1Kills: number, p2Kills: number): boolean {
    return p1Kills >= DOGFIGHT_CONFIG.KILLS_TO_WIN || p2Kills >= DOGFIGHT_CONFIG.KILLS_TO_WIN;
  }
}
