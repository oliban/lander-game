import Phaser from 'phaser';
import { darkenColor, lightenColor } from '../utils/ColorUtils';
import { COLORS, FONTS, BUTTON_SIZES } from './UIStyles';

export interface UIButtonConfig {
  x: number;
  y: number;
  label: string;
  onClick: () => void;
  color?: number;        // Default: BUTTON_GREEN
  hoverColor?: number;   // Default: auto-calculated lighter
  borderColor?: number;  // Default: auto-calculated darker
  width?: number;        // Default: 240
  height?: number;       // Default: 50
  radius?: number;       // Default: 12
  fontSize?: string;     // Default: '24px'
  borderWidth?: number;  // Default: 3
}

/**
 * Reusable UI button component with hover effects
 */
export class UIButton {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private config: Required<UIButtonConfig>;

  constructor(scene: Phaser.Scene, config: UIButtonConfig) {
    // Apply defaults
    this.config = {
      x: config.x,
      y: config.y,
      label: config.label,
      onClick: config.onClick,
      color: config.color ?? COLORS.BUTTON_GREEN,
      hoverColor: config.hoverColor ?? lightenColor(config.color ?? COLORS.BUTTON_GREEN, 1.15),
      borderColor: config.borderColor ?? darkenColor(config.color ?? COLORS.BUTTON_GREEN, 0.7),
      width: config.width ?? BUTTON_SIZES.LARGE.width,
      height: config.height ?? BUTTON_SIZES.LARGE.height,
      radius: config.radius ?? BUTTON_SIZES.LARGE.radius,
      fontSize: config.fontSize ?? BUTTON_SIZES.LARGE.fontSize,
      borderWidth: config.borderWidth ?? 3,
    };

    // Create container
    this.container = scene.add.container(this.config.x, this.config.y);

    // Create background graphics
    this.bg = scene.add.graphics();
    this.drawButton(this.config.color);

    // Create text
    this.text = scene.add.text(0, 0, this.config.label, {
      fontSize: this.config.fontSize,
      color: '#FFFFFF',
      fontFamily: FONTS.PRIMARY,
      fontStyle: 'bold',
    });
    this.text.setOrigin(0.5, 0.5);

    // Add to container
    this.container.add([this.bg, this.text]);

    // Setup interactivity
    const halfW = this.config.width / 2;
    const halfH = this.config.height / 2;
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-halfW, -halfH, this.config.width, this.config.height),
      Phaser.Geom.Rectangle.Contains
    );

    // Hover effects
    this.container.on('pointerover', () => {
      this.drawButton(this.config.hoverColor);
    });

    this.container.on('pointerout', () => {
      this.drawButton(this.config.color);
    });

    // Click handler
    this.container.on('pointerdown', this.config.onClick);
  }

  private drawButton(fillColor: number): void {
    const { width, height, radius, borderColor, borderWidth } = this.config;
    const halfW = width / 2;
    const halfH = height / 2;

    this.bg.clear();
    this.bg.fillStyle(fillColor, 1);
    this.bg.fillRoundedRect(-halfW, -halfH, width, height, radius);
    this.bg.lineStyle(borderWidth, borderColor);
    this.bg.strokeRoundedRect(-halfW, -halfH, width, height, radius);
  }

  /**
   * Get the container for adding to other containers or setting depth
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Set button visibility
   */
  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  /**
   * Set button position
   */
  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  /**
   * Set button depth
   */
  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  /**
   * Update button label text
   */
  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  /**
   * Enable or disable button interactivity
   */
  setEnabled(enabled: boolean): this {
    if (enabled) {
      this.container.setInteractive();
      this.container.setAlpha(1);
    } else {
      this.container.disableInteractive();
      this.container.setAlpha(0.5);
    }
    return this;
  }

  /**
   * Destroy the button
   */
  destroy(): void {
    this.container.destroy();
  }
}

/**
 * Helper function to create a standard green button
 */
export function createGreenButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  size: 'large' | 'medium' | 'small' = 'large'
): UIButton {
  const sizeConfig = BUTTON_SIZES[size.toUpperCase() as keyof typeof BUTTON_SIZES];
  return new UIButton(scene, {
    x,
    y,
    label,
    onClick,
    color: COLORS.BUTTON_GREEN,
    hoverColor: COLORS.BUTTON_GREEN_HOVER,
    borderColor: COLORS.BUTTON_GREEN_BORDER,
    ...sizeConfig,
  });
}

/**
 * Helper function to create a colored button
 */
export function createColoredButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: number,
  onClick: () => void,
  size: 'large' | 'medium' | 'small' = 'medium'
): UIButton {
  const sizeConfig = BUTTON_SIZES[size.toUpperCase() as keyof typeof BUTTON_SIZES];
  return new UIButton(scene, {
    x,
    y,
    label,
    onClick,
    color,
    ...sizeConfig,
  });
}
