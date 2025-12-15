import Phaser from 'phaser';
import { COLORS, FONTS, FONT_SIZES, PANEL_STYLES, PROGRESS_BAR } from './UIStyles';

export interface UIHeaderConfig {
  title: string;
  width: number;         // Screen width
  height?: number;       // Header height (default: 100)
  showProgress?: boolean;
  current?: number;      // Current progress value
  total?: number;        // Total for progress
  progressLabel?: string; // Custom label (default: "X/Y Label (Z%)")
  progressLabelSuffix?: string; // e.g., "Unlocked" or "Discovered"
}

/**
 * Reusable header component with optional progress bar
 */
export class UIHeader {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private headerBg: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private progressText: Phaser.GameObjects.Text | null = null;
  private progressBarBg: Phaser.GameObjects.Graphics | null = null;
  private progressBarFill: Phaser.GameObjects.Graphics | null = null;

  private config: Required<UIHeaderConfig>;
  private barX: number = 0;
  private barY: number = 0;

  constructor(scene: Phaser.Scene, config: UIHeaderConfig) {
    this.scene = scene;
    this.config = {
      title: config.title,
      width: config.width,
      height: config.height ?? PANEL_STYLES.HEADER.height,
      showProgress: config.showProgress ?? false,
      current: config.current ?? 0,
      total: config.total ?? 1,
      progressLabel: config.progressLabel ?? '',
      progressLabelSuffix: config.progressLabelSuffix ?? 'Unlocked',
    };

    this.container = scene.add.container(0, 0);

    // Header background
    this.headerBg = scene.add.graphics();
    this.headerBg.fillStyle(PANEL_STYLES.HEADER.color, PANEL_STYLES.HEADER.alpha);
    this.headerBg.fillRect(0, 0, this.config.width, this.config.height);
    this.container.add(this.headerBg);

    // Title
    this.titleText = scene.add.text(this.config.width / 2, 35, this.config.title, {
      fontSize: FONT_SIZES.TITLE,
      color: COLORS.TEXT_GOLD,
      fontFamily: FONTS.PRIMARY,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.container.add(this.titleText);

    // Progress bar (optional)
    if (this.config.showProgress) {
      this.createProgressBar();
    }
  }

  private createProgressBar(): void {
    const { width, current, total, progressLabel, progressLabelSuffix } = this.config;

    // Progress text
    const percent = Math.round((current / Math.max(total, 1)) * 100);
    const label = progressLabel || `${current}/${total} ${progressLabelSuffix} (${percent}%)`;

    this.progressText = this.scene.add.text(width / 2, 70, label, {
      fontSize: FONT_SIZES.BODY_SMALL,
      color: COLORS.TEXT_GRAY,
      fontFamily: FONTS.PRIMARY,
    });
    this.progressText.setOrigin(0.5, 0.5);
    this.container.add(this.progressText);

    // Progress bar
    this.barX = width / 2 - PROGRESS_BAR.WIDTH / 2;
    this.barY = 85;

    // Background bar
    this.progressBarBg = this.scene.add.graphics();
    this.progressBarBg.fillStyle(PROGRESS_BAR.BG_COLOR, 1);
    this.progressBarBg.fillRoundedRect(this.barX, this.barY, PROGRESS_BAR.WIDTH, PROGRESS_BAR.HEIGHT, PROGRESS_BAR.RADIUS);
    this.container.add(this.progressBarBg);

    // Fill bar
    this.progressBarFill = this.scene.add.graphics();
    this.drawProgressFill(current, total);
    this.container.add(this.progressBarFill);
  }

  private drawProgressFill(current: number, total: number): void {
    if (!this.progressBarFill) return;

    const progress = Math.max(0, Math.min(1, current / Math.max(total, 1)));
    const fillWidth = PROGRESS_BAR.WIDTH * progress;

    this.progressBarFill.clear();
    if (fillWidth > 0) {
      this.progressBarFill.fillStyle(PROGRESS_BAR.FILL_COLOR, 1);
      this.progressBarFill.fillRoundedRect(this.barX, this.barY, fillWidth, PROGRESS_BAR.HEIGHT, PROGRESS_BAR.RADIUS);
    }
  }

  /**
   * Update progress values
   */
  updateProgress(current: number, total: number): void {
    this.config.current = current;
    this.config.total = total;

    if (this.progressText) {
      const percent = Math.round((current / Math.max(total, 1)) * 100);
      const label = `${current}/${total} ${this.config.progressLabelSuffix} (${percent}%)`;
      this.progressText.setText(label);
    }

    this.drawProgressFill(current, total);
  }

  /**
   * Update title text
   */
  setTitle(title: string): void {
    this.titleText.setText(title);
  }

  /**
   * Get the container
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Get header height (useful for positioning content below)
   */
  getHeight(): number {
    return this.config.height;
  }

  /**
   * Set depth
   */
  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  /**
   * Destroy the header
   */
  destroy(): void {
    this.container.destroy();
  }
}
