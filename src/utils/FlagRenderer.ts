import Phaser from 'phaser';

// Country-specific color palettes
export const COUNTRY_COLORS = {
  'United Kingdom': {
    primary: 0x012169,    // Blue
    secondary: 0xFFFFFF,  // White
    accent: 0xC8102E,     // Red
  },
  'France': {
    primary: 0x002395,    // Blue
    secondary: 0xFFFFFF,  // White
    accent: 0xED2939,     // Red
  },
  'Switzerland': {
    primary: 0xDA291C,    // Red
    secondary: 0xFFFFFF,  // White
    accent: 0xDA291C,     // Red
  },
  'Germany': {
    primary: 0x000000,    // Black
    secondary: 0xDD0000,  // Red
    accent: 0xFFCC00,     // Gold
  },
  'Poland': {
    primary: 0xFFFFFF,    // White
    secondary: 0xDC143C,  // Red
    accent: 0xDC143C,     // Red
  },
  'Russia': {
    primary: 0xFFFFFF,    // White
    secondary: 0x0039A6,  // Blue
    accent: 0xD52B1E,     // Red
  },
  'USA': {
    primary: 0xB22234,    // Red
    secondary: 0xFFFFFF,  // White
    accent: 0x3C3B6E,     // Blue
  },
};

export class FlagRenderer {
  /**
   * Draws a wind-affected flag that waves based on wind strength
   * @param graphics - Phaser Graphics object to draw on
   * @param country - Country name
   * @param poleX - X position of the flagpole
   * @param poleY - Y position of top of flagpole
   * @param baseWidth - Base width of flag (before wind effect)
   * @param height - Height of the flag
   * @param windStrength - Wind strength (-1 to 1, negative=West, positive=East)
   */
  static drawWindFlag(
    graphics: Phaser.GameObjects.Graphics,
    country: string,
    poleX: number,
    poleY: number,
    baseWidth: number,
    height: number,
    windStrength: number
  ): void {
    const windDir = windStrength >= 0 ? 1 : -1;
    const windMag = Math.abs(windStrength);
    const windEffect = windMag * 12;

    // Flag extends in wind direction from the pole
    const flagStartX = poleX;
    const flagEndX = poleX + (baseWidth + windEffect * 0.5) * windDir;
    const fy = poleY;

    // Helper to draw a wind-affected horizontal stripe
    const drawWindStripe = (color: number, yOffset: number, stripeHeight: number) => {
      graphics.fillStyle(color, 1);
      const topWave = windEffect * 0.15 * (1 - yOffset / height * 0.3);
      const bottomWave = windEffect * 0.15 * (1 - (yOffset + stripeHeight) / height * 0.3);
      graphics.beginPath();
      graphics.moveTo(flagStartX, fy + yOffset);
      graphics.lineTo(flagEndX, fy + yOffset + topWave * windDir);
      graphics.lineTo(flagEndX, fy + yOffset + stripeHeight + bottomWave * windDir);
      graphics.lineTo(flagStartX, fy + yOffset + stripeHeight);
      graphics.closePath();
      graphics.fillPath();
    };

    // Helper for vertical stripes (France)
    const drawVerticalStripe = (color: number, stripeIndex: number, numStripes: number) => {
      graphics.fillStyle(color, 1);
      const stripeWidth = Math.abs(flagEndX - flagStartX) / numStripes;
      const x1 = flagStartX + stripeIndex * stripeWidth * windDir;
      const x2 = flagStartX + (stripeIndex + 1) * stripeWidth * windDir;
      const waveAtX1 = windEffect * 0.15 * (stripeIndex / numStripes);
      const waveAtX2 = windEffect * 0.15 * ((stripeIndex + 1) / numStripes);
      graphics.beginPath();
      graphics.moveTo(x1, fy + waveAtX1 * windDir);
      graphics.lineTo(x2, fy + waveAtX2 * windDir);
      graphics.lineTo(x2, fy + height + waveAtX2 * windDir);
      graphics.lineTo(x1, fy + height + waveAtX1 * windDir);
      graphics.closePath();
      graphics.fillPath();
    };

    switch (country) {
      case 'United Kingdom': {
        drawWindStripe(0x012169, 0, height); // Blue background
        const ukWaveY = windEffect * 0.15 * windDir;
        // White diagonals
        graphics.lineStyle(3, 0xFFFFFF);
        graphics.lineBetween(flagStartX, fy, flagEndX, fy + height + ukWaveY);
        graphics.lineBetween(flagStartX, fy + height, flagEndX, fy + ukWaveY);
        // Red diagonals
        graphics.lineStyle(1.5, 0xC8102E);
        graphics.lineBetween(flagStartX, fy, flagEndX, fy + height + ukWaveY);
        graphics.lineBetween(flagStartX, fy + height, flagEndX, fy + ukWaveY);
        // White cross
        const ukMidX = (flagStartX + flagEndX) / 2;
        const ukMidY = fy + height / 2 + ukWaveY * 0.5;
        graphics.lineStyle(4, 0xFFFFFF);
        graphics.lineBetween(ukMidX, fy + ukWaveY * 0.3, ukMidX, fy + height + ukWaveY * 0.7);
        graphics.lineBetween(flagStartX, ukMidY - ukWaveY * 0.2, flagEndX, ukMidY + ukWaveY * 0.3);
        // Red cross
        graphics.lineStyle(2, 0xC8102E);
        graphics.lineBetween(ukMidX, fy + ukWaveY * 0.3, ukMidX, fy + height + ukWaveY * 0.7);
        graphics.lineBetween(flagStartX, ukMidY - ukWaveY * 0.2, flagEndX, ukMidY + ukWaveY * 0.3);
        break;
      }
      case 'France':
        drawVerticalStripe(0x002395, 0, 3); // Blue
        drawVerticalStripe(0xFFFFFF, 1, 3); // White
        drawVerticalStripe(0xED2939, 2, 3); // Red
        break;
      case 'Germany':
        drawWindStripe(0x000000, 0, height / 3);           // Black
        drawWindStripe(0xDD0000, height / 3, height / 3); // Red
        drawWindStripe(0xFFCC00, height * 2 / 3, height / 3); // Gold
        break;
      case 'Poland':
        drawWindStripe(0xFFFFFF, 0, height / 2);          // White
        drawWindStripe(0xDC143C, height / 2, height / 2); // Red
        break;
      case 'Russia':
        drawWindStripe(0xFFFFFF, 0, height / 3);           // White
        drawWindStripe(0x0039A6, height / 3, height / 3); // Blue
        drawWindStripe(0xD52B1E, height * 2 / 3, height / 3); // Red
        break;
      case 'Switzerland': {
        drawWindStripe(0xDA291C, 0, height); // Red background
        // White cross (simplified for wind effect)
        const swMidX = (flagStartX + flagEndX) / 2;
        const swMidY = fy + height / 2;
        graphics.lineStyle(4, 0xFFFFFF);
        graphics.lineBetween(swMidX, fy + 2, swMidX, fy + height - 2);
        graphics.lineBetween(flagStartX + 2 * windDir, swMidY, flagEndX - 2 * windDir, swMidY);
        break;
      }
      case 'Washington DC':
      case 'USA': {
        // Simplified US flag with wind
        const stripeH = height / 7;
        for (let i = 0; i < 7; i++) {
          const color = i % 2 === 0 ? 0xB22234 : 0xFFFFFF;
          drawWindStripe(color, i * stripeH, stripeH);
        }
        // Blue canton - always at the hoist (pole) side
        const cantonWidth = Math.abs(flagEndX - flagStartX) * 0.4;
        const cantonHeight = height * 0.57;
        graphics.fillStyle(0x3C3B6E, 1);
        graphics.beginPath();
        graphics.moveTo(flagStartX, fy);
        graphics.lineTo(flagStartX + cantonWidth * windDir, fy + windEffect * 0.06 * windDir);
        graphics.lineTo(flagStartX + cantonWidth * windDir, fy + cantonHeight + windEffect * 0.06 * windDir);
        graphics.lineTo(flagStartX, fy + cantonHeight);
        graphics.closePath();
        graphics.fillPath();
        break;
      }
      default:
        drawWindStripe(0x888888, 0, height);
        break;
    }

    // Flag border
    graphics.lineStyle(1, 0x333333, 0.3);
    const borderWave = windEffect * 0.15 * windDir;
    graphics.beginPath();
    graphics.moveTo(flagStartX, fy);
    graphics.lineTo(flagEndX, fy + borderWave);
    graphics.lineTo(flagEndX, fy + height + borderWave);
    graphics.lineTo(flagStartX, fy + height);
    graphics.closePath();
    graphics.strokePath();
  }

  /**
   * Draws the appropriate flag for a given country (static, no wind)
   * @param graphics - Phaser Graphics object to draw on
   * @param country - Country name (e.g., 'United Kingdom', 'France', etc.)
   * @param x - X position of the flag (left edge)
   * @param y - Y position of the flag (top edge)
   * @param width - Width of the flag
   * @param height - Height of the flag
   */
  static drawFlag(
    graphics: Phaser.GameObjects.Graphics,
    country: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    switch (country) {
      case 'United Kingdom':
        FlagRenderer.drawUnionJack(graphics, x, y, width, height);
        break;
      case 'France':
        FlagRenderer.drawFrenchFlag(graphics, x, y, width, height);
        break;
      case 'Switzerland':
        FlagRenderer.drawSwissFlag(graphics, x, y, width, height);
        break;
      case 'Germany':
        FlagRenderer.drawGermanFlag(graphics, x, y, width, height);
        break;
      case 'Poland':
        FlagRenderer.drawPolishFlag(graphics, x, y, width, height);
        break;
      case 'Russia':
        FlagRenderer.drawRussianFlag(graphics, x, y, width, height);
        break;
      case 'Washington DC':
      case 'USA':
        FlagRenderer.drawUSAFlag(graphics, x, y, width, height);
        break;
      default:
        // Generic gray flag
        graphics.fillStyle(0x888888, 1);
        graphics.fillRect(x, y, width, height);
        break;
    }

    // Flag border
    graphics.lineStyle(1, 0x333333, 0.5);
    graphics.strokeRect(x, y, width, height);
  }

  /**
   * Draws the Union Jack (UK flag)
   */
  static drawUnionJack(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Blue background
    graphics.fillStyle(0x012169, 1);
    graphics.fillRect(x, y, width, height);

    // White diagonals
    graphics.lineStyle(3, 0xFFFFFF);
    graphics.lineBetween(x, y, x + width, y + height);
    graphics.lineBetween(x, y + height, x + width, y);

    // Red diagonals (thinner, on top)
    graphics.lineStyle(1.5, 0xC8102E);
    graphics.lineBetween(x, y, x + width, y + height);
    graphics.lineBetween(x, y + height, x + width, y);

    // White cross
    graphics.lineStyle(4, 0xFFFFFF);
    graphics.lineBetween(x + width / 2, y, x + width / 2, y + height);
    graphics.lineBetween(x, y + height / 2, x + width, y + height / 2);

    // Red cross (thinner, on top)
    graphics.lineStyle(2, 0xC8102E);
    graphics.lineBetween(x + width / 2, y, x + width / 2, y + height);
    graphics.lineBetween(x, y + height / 2, x + width, y + height / 2);
  }

  /**
   * Draws the French tricolor flag (vertical stripes)
   */
  static drawFrenchFlag(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const stripeWidth = width / 3;

    // Blue stripe
    graphics.fillStyle(0x002395, 1);
    graphics.fillRect(x, y, stripeWidth, height);

    // White stripe
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillRect(x + stripeWidth, y, stripeWidth, height);

    // Red stripe
    graphics.fillStyle(0xED2939, 1);
    graphics.fillRect(x + stripeWidth * 2, y, stripeWidth, height);
  }

  /**
   * Draws the German flag (horizontal stripes)
   */
  static drawGermanFlag(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const stripeHeight = height / 3;

    // Black stripe
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(x, y, width, stripeHeight);

    // Red stripe
    graphics.fillStyle(0xDD0000, 1);
    graphics.fillRect(x, y + stripeHeight, width, stripeHeight);

    // Gold stripe
    graphics.fillStyle(0xFFCC00, 1);
    graphics.fillRect(x, y + stripeHeight * 2, width, stripeHeight);
  }

  /**
   * Draws the Polish flag (horizontal stripes)
   */
  static drawPolishFlag(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // White stripe (top half)
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillRect(x, y, width, height / 2);

    // Red stripe (bottom half)
    graphics.fillStyle(0xDC143C, 1);
    graphics.fillRect(x, y + height / 2, width, height / 2);
  }

  /**
   * Draws the Russian flag (horizontal stripes)
   */
  static drawRussianFlag(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const stripeHeight = height / 3;

    // White stripe
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillRect(x, y, width, stripeHeight);

    // Blue stripe
    graphics.fillStyle(0x0039A6, 1);
    graphics.fillRect(x, y + stripeHeight, width, stripeHeight);

    // Red stripe
    graphics.fillStyle(0xD52B1E, 1);
    graphics.fillRect(x, y + stripeHeight * 2, width, stripeHeight);
  }

  /**
   * Draws the Swiss flag (red background with white cross)
   */
  static drawSwissFlag(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Red background
    graphics.fillStyle(0xDA291C, 1);
    graphics.fillRect(x, y, width, height);

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // White cross
    graphics.lineStyle(4, 0xFFFFFF);
    // Vertical bar
    graphics.lineBetween(centerX, y + 2, centerX, y + height - 2);
    // Horizontal bar
    graphics.lineBetween(x + 4, centerY, x + width - 4, centerY);
  }

  /**
   * Draws the USA flag (simplified - red/white stripes with blue canton)
   */
  static drawUSAFlag(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const stripeHeight = height / 13;

    // Red background
    graphics.fillStyle(0xB22234, 1);
    graphics.fillRect(x, y, width, height);

    // White stripes (7 stripes: 0, 2, 4, 6, 8, 10, 12)
    graphics.fillStyle(0xFFFFFF, 1);
    for (let i = 0; i < 7; i++) {
      graphics.fillRect(x, y + i * stripeHeight * 2, width, stripeHeight);
    }

    // Blue canton (top-left, 40% width, 50% height)
    graphics.fillStyle(0x3C3B6E, 1);
    graphics.fillRect(x, y, width * 0.4, height * 0.5);
  }
}
