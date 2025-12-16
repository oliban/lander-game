import Phaser from 'phaser';

/**
 * Format a value as a dollar amount for display.
 * @param value - The numeric value to format
 * @param prefix - Optional prefix (e.g., '+' for gains)
 * @returns Formatted string like "$45" or "+$10"
 */
export function formatDollarValue(value: number | string, prefix: string = ''): string {
  return `${prefix}$${value}`;
}

export interface DestructionMessageConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  points: number;
  name: string;
  nameColor?: string;
  nameFontSize?: string;
  pointsFontSize?: string;
  duration?: number;
  delay?: number;
  floatDistance?: number;
  extraText?: string;
  extraTextColor?: string;
  onComplete?: () => void;
}

/**
 * Show a destruction message with points floating up and fading.
 * Consolidates showDestructionPoints, showFisherBoatDestroyed,
 * showGolfCartDestroyed, and showBiplaneDestroyed into one utility.
 */
export function showDestructionMessage(config: DestructionMessageConfig): void {
  const {
    scene,
    x,
    y,
    points,
    name,
    nameColor = '#FF6600',
    nameFontSize = '16px',
    pointsFontSize = '24px',
    duration = 3500,
    delay = 500,
    floatDistance = 80,
    extraText,
    extraTextColor = '#C0C0C0',
    onComplete,
  } = config;

  const texts: Phaser.GameObjects.Text[] = [];

  // Show name/title
  const nameText = scene.add.text(x, y - 20, name, {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: nameFontSize,
    color: nameColor,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: nameFontSize === '16px' ? 3 : 4,
  });
  nameText.setOrigin(0.5, 0.5);
  nameText.setDepth(150);
  texts.push(nameText);

  // Show points
  const pointsText = scene.add.text(x, y + (nameFontSize === '16px' ? 10 : 15), `+${points} POINTS!`, {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: pointsFontSize,
    color: '#FFD700',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
  });
  pointsText.setOrigin(0.5, 0.5);
  pointsText.setDepth(150);
  texts.push(pointsText);

  // Optional extra text (e.g., "RED BARON!" achievement hint)
  if (extraText) {
    const extraTextObj = scene.add.text(x, y + 50, extraText, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: extraTextColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    extraTextObj.setOrigin(0.5, 0.5);
    extraTextObj.setDepth(150);
    texts.push(extraTextObj);
  }

  // Animate all texts - float up and fade
  scene.tweens.add({
    targets: texts,
    y: `-=${floatDistance}`,
    alpha: 0,
    duration,
    delay,
    ease: 'Power1',
    onComplete: () => {
      texts.forEach(t => t.destroy());
      onComplete?.();
    },
  });
}
