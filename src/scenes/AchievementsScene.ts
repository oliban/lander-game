import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { getAchievementSystem } from '../systems/AchievementSystem';
import { Achievement, TIER_COLORS, TIER_LABELS } from '../data/achievements';
import { UIHeader } from '../ui/UIHeader';
import { ScrollableContainer } from '../ui/ScrollableContainer';
import { createGreenButton } from '../ui/UIButton';

const ITEM_HEIGHT = 70;
const LIST_PADDING = 20;

export class AchievementsScene extends Phaser.Scene {
  private scrollContainer!: ScrollableContainer;

  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    const achievementSystem = getAchievementSystem();

    // Dark background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d1b2a);

    // Progress stats
    const unlocked = achievementSystem.getUnlockedCount();
    const total = achievementSystem.getTotalCount();

    // Header with progress bar
    const header = new UIHeader(this, {
      title: '🏆 ACHIEVEMENTS 🏆',
      width: GAME_WIDTH,
      showProgress: true,
      current: unlocked,
      total: total,
      progressLabelSuffix: 'Unlocked',
    });

    // Calculate list dimensions
    const listY = header.getHeight() + 10;
    const listHeight = GAME_HEIGHT - listY - 60;

    // Get achievements and calculate content height
    const achievements = achievementSystem.getAll();
    const contentHeight = achievements.length * ITEM_HEIGHT + LIST_PADDING * 2;

    // Create scrollable container
    this.scrollContainer = new ScrollableContainer(this, {
      y: listY,
      width: GAME_WIDTH,
      height: listHeight,
      contentHeight: contentHeight,
    });

    // Reveal hints for locked achievements when player has 80%+ unlocked
    const revealHints = (unlocked / total) >= 0.8;

    // Populate list
    achievements.forEach((achievement, index) => {
      const itemY = LIST_PADDING + index * ITEM_HEIGHT;
      this.createAchievementItem(achievement, itemY, achievementSystem.isUnlocked(achievement.id), revealHints);
    });

    // Back button
    createGreenButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 35, 'BACK', () => {
      this.scene.start('MenuScene');
    }, 'small');

    // ESC key to go back
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private createAchievementItem(achievement: Achievement, y: number, isUnlocked: boolean, revealHints: boolean): void {
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

    this.scrollContainer.add(bg);

    // Icon
    const icon = this.add.text(x + 35, y + (ITEM_HEIGHT - 5) / 2, isUnlocked ? '✅' : '🔒', {
      fontSize: '28px',
    });
    icon.setOrigin(0.5, 0.5);
    this.scrollContainer.add(icon);

    // Name - reveal if unlocked OR if hints are revealed (80%+ progress)
    const showDetails = isUnlocked || revealHints;
    const nameColor = isUnlocked ? '#FFFFFF' : '#888888';
    const name = this.add.text(x + 70, y + 18, showDetails ? achievement.name : '???', {
      fontSize: '18px',
      color: nameColor,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    this.scrollContainer.add(name);

    // Description - reveal if unlocked OR if hints are revealed (80%+ progress)
    const descColor = isUnlocked ? '#AAAAAA' : '#666666';
    const desc = this.add.text(x + 70, y + 42, showDetails ? achievement.description : 'Hidden achievement', {
      fontSize: '13px',
      color: descColor,
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    this.scrollContainer.add(desc);

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
    this.scrollContainer.add(tierBadge);
  }
}
