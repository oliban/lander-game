import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { getAchievementSystem } from '../systems/AchievementSystem';
import { Achievement, TIER_COLORS, TIER_LABELS } from '../data/achievements';

const ITEM_HEIGHT = 70;
const LIST_PADDING = 20;
const VISIBLE_ITEMS = 7;

export class AchievementsScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScroll = 0;
  private listContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    const achievementSystem = getAchievementSystem();

    // Dark background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d1b2a);

    // Header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1a1a2e, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 100);

    const title = this.add.text(GAME_WIDTH / 2, 35, '🏆 ACHIEVEMENTS 🏆', {
      fontSize: '32px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Progress
    const unlocked = achievementSystem.getUnlockedCount();
    const total = achievementSystem.getTotalCount();
    const percent = Math.round((unlocked / total) * 100);

    const progress = this.add.text(GAME_WIDTH / 2, 70, `${unlocked}/${total} Unlocked (${percent}%)`, {
      fontSize: '18px',
      color: '#AAAAAA',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    progress.setOrigin(0.5, 0.5);

    // Progress bar
    const barWidth = 300;
    const barHeight = 8;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 85;

    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x333333, 1);
    progressBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

    const progressBarFill = this.add.graphics();
    progressBarFill.fillStyle(0xffd700, 1);
    progressBarFill.fillRoundedRect(barX, barY, barWidth * (unlocked / total), barHeight, 4);

    // Create scrollable list container
    const listY = 110;
    const listHeight = GAME_HEIGHT - listY - 60;

    // Mask for scrolling
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, listY, GAME_WIDTH, listHeight);
    const mask = maskShape.createGeometryMask();

    this.listContainer = this.add.container(0, listY);
    this.listContainer.setMask(mask);

    // Populate list
    const achievements = achievementSystem.getAll();
    this.maxScroll = Math.max(0, achievements.length * ITEM_HEIGHT - listHeight + LIST_PADDING * 2);

    achievements.forEach((achievement, index) => {
      const itemY = LIST_PADDING + index * ITEM_HEIGHT;
      this.createAchievementItem(achievement, itemY, achievementSystem.isUnlocked(achievement.id));
    });

    // Scroll handling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScroll);
      this.listContainer.y = listY - this.scrollY;
    });

    // Touch/drag scrolling
    let dragStartY = 0;
    let dragStartScroll = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > listY && pointer.y < listY + listHeight) {
        dragStartY = pointer.y;
        dragStartScroll = this.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && dragStartY > 0) {
        const delta = dragStartY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(dragStartScroll + delta, 0, this.maxScroll);
        this.listContainer.y = listY - this.scrollY;
      }
    });

    this.input.on('pointerup', () => {
      dragStartY = 0;
    });

    // Back button
    const backButton = this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 35, 'BACK', () => {
      this.scene.start('MenuScene');
    });

    // ESC key to go back
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private createAchievementItem(achievement: Achievement, y: number, isUnlocked: boolean): void {
    const itemWidth = GAME_WIDTH - LIST_PADDING * 2;
    const x = LIST_PADDING;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(isUnlocked ? 0x1a3a1a : 0x1a1a2e, 0.8);
    bg.fillRoundedRect(x, y, itemWidth, ITEM_HEIGHT - 5, 8);

    if (isUnlocked) {
      bg.lineStyle(2, TIER_COLORS[achievement.tier], 0.5);
      bg.strokeRoundedRect(x, y, itemWidth, ITEM_HEIGHT - 5, 8);
    }

    this.listContainer.add(bg);

    // Icon
    const icon = this.add.text(x + 35, y + (ITEM_HEIGHT - 5) / 2, isUnlocked ? '✅' : '🔒', {
      fontSize: '28px',
    });
    icon.setOrigin(0.5, 0.5);
    this.listContainer.add(icon);

    // Name
    const nameColor = isUnlocked ? '#FFFFFF' : '#666666';
    const name = this.add.text(x + 70, y + 18, isUnlocked ? achievement.name : '???', {
      fontSize: '18px',
      color: nameColor,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    this.listContainer.add(name);

    // Description
    const descColor = isUnlocked ? '#AAAAAA' : '#444444';
    const desc = this.add.text(x + 70, y + 42, isUnlocked ? achievement.description : 'Hidden achievement', {
      fontSize: '13px',
      color: descColor,
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    this.listContainer.add(desc);

    // Tier badge
    const tierColor = TIER_COLORS[achievement.tier];
    const tierLabel = TIER_LABELS[achievement.tier];
    const tierBadge = this.add.text(x + itemWidth - 15, y + (ITEM_HEIGHT - 5) / 2, tierLabel, {
      fontSize: '12px',
      color: isUnlocked ? '#' + tierColor.toString(16).padStart(6, '0') : '#444444',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    tierBadge.setOrigin(1, 0.5);
    this.listContainer.add(tierBadge);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x4caf50, 1);
    bg.fillRoundedRect(-80, -20, 160, 40, 8);
    bg.lineStyle(2, 0x2e7d32);
    bg.strokeRoundedRect(-80, -20, 160, 40, 8);

    const text = this.add.text(0, 0, label, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-80, -20, 160, 40), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x66bb6a, 1);
      bg.fillRoundedRect(-80, -20, 160, 40, 8);
      bg.lineStyle(2, 0x2e7d32);
      bg.strokeRoundedRect(-80, -20, 160, 40, 8);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x4caf50, 1);
      bg.fillRoundedRect(-80, -20, 160, 40, 8);
      bg.lineStyle(2, 0x2e7d32);
      bg.strokeRoundedRect(-80, -20, 160, 40, 8);
    });

    container.on('pointerdown', callback);

    return container;
  }
}
