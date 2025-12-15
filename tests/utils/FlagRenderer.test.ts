import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlagRenderer, COUNTRY_COLORS } from '../../src/utils/FlagRenderer';

// Mock Phaser Graphics object
class MockGraphics {
  calls: Array<{ method: string; args: any[] }> = [];

  fillStyle(color: number, alpha: number) {
    this.calls.push({ method: 'fillStyle', args: [color, alpha] });
  }

  fillRect(x: number, y: number, width: number, height: number) {
    this.calls.push({ method: 'fillRect', args: [x, y, width, height] });
  }

  lineStyle(width: number, color: number, alpha?: number) {
    this.calls.push({ method: 'lineStyle', args: [width, color, alpha] });
  }

  lineBetween(x1: number, y1: number, x2: number, y2: number) {
    this.calls.push({ method: 'lineBetween', args: [x1, y1, x2, y2] });
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    this.calls.push({ method: 'strokeRect', args: [x, y, width, height] });
  }

  getCalls() {
    return this.calls;
  }

  reset() {
    this.calls = [];
  }

  // Helper method to count specific method calls
  countMethod(methodName: string): number {
    return this.calls.filter((call) => call.method === methodName).length;
  }

  // Helper method to get calls of a specific type
  getCallsOfType(methodName: string) {
    return this.calls.filter((call) => call.method === methodName);
  }

  // Helper method to check if a color was used
  hasColor(color: number): boolean {
    return this.calls.some((call) => {
      if (call.method === 'fillStyle') {
        return call.args[0] === color;
      }
      if (call.method === 'lineStyle') {
        return call.args[1] === color; // Color is second parameter for lineStyle
      }
      return false;
    });
  }
}

describe('FlagRenderer', () => {
  let graphics: MockGraphics;

  beforeEach(() => {
    graphics = new MockGraphics();
  });

  describe('COUNTRY_COLORS', () => {
    it('should have color definitions for all supported countries', () => {
      expect(COUNTRY_COLORS['United Kingdom']).toBeDefined();
      expect(COUNTRY_COLORS['France']).toBeDefined();
      expect(COUNTRY_COLORS['Switzerland']).toBeDefined();
      expect(COUNTRY_COLORS['Germany']).toBeDefined();
      expect(COUNTRY_COLORS['Poland']).toBeDefined();
      expect(COUNTRY_COLORS['Russia']).toBeDefined();
      expect(COUNTRY_COLORS['USA']).toBeDefined();
    });

    it('should have primary, secondary, and accent colors for each country', () => {
      Object.keys(COUNTRY_COLORS).forEach((country) => {
        const colors = COUNTRY_COLORS[country as keyof typeof COUNTRY_COLORS];
        expect(colors.primary).toBeDefined();
        expect(colors.secondary).toBeDefined();
        expect(colors.accent).toBeDefined();
      });
    });

    it('should have correct UK colors', () => {
      expect(COUNTRY_COLORS['United Kingdom'].primary).toBe(0x012169); // Blue
      expect(COUNTRY_COLORS['United Kingdom'].secondary).toBe(0xFFFFFF); // White
      expect(COUNTRY_COLORS['United Kingdom'].accent).toBe(0xC8102E); // Red
    });
  });

  describe('drawFlag', () => {
    it('should draw a flag with border', () => {
      FlagRenderer.drawFlag(graphics as any, 'Poland', 0, 0, 24, 16);

      // Should have border drawn
      const borderCalls = graphics.getCallsOfType('strokeRect');
      expect(borderCalls.length).toBeGreaterThan(0);
      expect(borderCalls[borderCalls.length - 1].args).toEqual([0, 0, 24, 16]);
    });

    it('should draw generic flag for unknown country', () => {
      FlagRenderer.drawFlag(graphics as any, 'Unknown Country', 0, 0, 24, 16);

      // Should use gray color for generic flag
      expect(graphics.hasColor(0x888888)).toBe(true);
    });

    it('should delegate to specific country flag methods', () => {
      FlagRenderer.drawFlag(graphics as any, 'France', 10, 20, 30, 20);

      // Should have French tricolor colors
      expect(graphics.hasColor(0x002395)).toBe(true); // Blue
      expect(graphics.hasColor(0xFFFFFF)).toBe(true); // White
      expect(graphics.hasColor(0xED2939)).toBe(true); // Red
    });

    it('should handle USA and Washington DC as same flag', () => {
      const graphics1 = new MockGraphics();
      const graphics2 = new MockGraphics();

      FlagRenderer.drawFlag(graphics1 as any, 'USA', 0, 0, 24, 16);
      FlagRenderer.drawFlag(graphics2 as any, 'Washington DC', 0, 0, 24, 16);

      // Both should use same colors
      expect(graphics1.hasColor(0xB22234)).toBe(true);
      expect(graphics2.hasColor(0xB22234)).toBe(true);
    });
  });

  describe('drawUnionJack', () => {
    it('should draw UK flag with correct colors', () => {
      FlagRenderer.drawUnionJack(graphics as any, 0, 0, 24, 16);

      expect(graphics.hasColor(0x012169)).toBe(true); // Blue background
      expect(graphics.hasColor(0xFFFFFF)).toBe(true); // White crosses
      expect(graphics.hasColor(0xC8102E)).toBe(true); // Red crosses
    });

    it('should draw background rectangle', () => {
      FlagRenderer.drawUnionJack(graphics as any, 10, 20, 24, 16);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      expect(fillRectCalls.length).toBeGreaterThan(0);
      expect(fillRectCalls[0].args).toEqual([10, 20, 24, 16]);
    });

    it('should draw diagonal lines', () => {
      FlagRenderer.drawUnionJack(graphics as any, 0, 0, 24, 16);

      const lineCalls = graphics.getCallsOfType('lineBetween');
      expect(lineCalls.length).toBeGreaterThanOrEqual(4); // At least 4 diagonal + cross lines
    });
  });

  describe('drawFrenchFlag', () => {
    it('should draw French tricolor with correct colors', () => {
      FlagRenderer.drawFrenchFlag(graphics as any, 0, 0, 24, 16);

      expect(graphics.hasColor(0x002395)).toBe(true); // Blue
      expect(graphics.hasColor(0xFFFFFF)).toBe(true); // White
      expect(graphics.hasColor(0xED2939)).toBe(true); // Red
    });

    it('should draw three vertical stripes of equal width', () => {
      FlagRenderer.drawFrenchFlag(graphics as any, 0, 0, 24, 16);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      expect(fillRectCalls.length).toBe(3);

      // Check that each stripe is 8 pixels wide (24 / 3)
      expect(fillRectCalls[0].args).toEqual([0, 0, 8, 16]); // Blue
      expect(fillRectCalls[1].args).toEqual([8, 0, 8, 16]); // White
      expect(fillRectCalls[2].args).toEqual([16, 0, 8, 16]); // Red
    });
  });

  describe('drawGermanFlag', () => {
    it('should draw German flag with correct colors', () => {
      FlagRenderer.drawGermanFlag(graphics as any, 0, 0, 24, 18);

      expect(graphics.hasColor(0x000000)).toBe(true); // Black
      expect(graphics.hasColor(0xDD0000)).toBe(true); // Red
      expect(graphics.hasColor(0xFFCC00)).toBe(true); // Gold
    });

    it('should draw three horizontal stripes of equal height', () => {
      FlagRenderer.drawGermanFlag(graphics as any, 0, 0, 24, 18);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      expect(fillRectCalls.length).toBe(3);

      // Check that each stripe is 6 pixels tall (18 / 3)
      expect(fillRectCalls[0].args).toEqual([0, 0, 24, 6]); // Black
      expect(fillRectCalls[1].args).toEqual([0, 6, 24, 6]); // Red
      expect(fillRectCalls[2].args).toEqual([0, 12, 24, 6]); // Gold
    });
  });

  describe('drawPolishFlag', () => {
    it('should draw Polish flag with correct colors', () => {
      FlagRenderer.drawPolishFlag(graphics as any, 0, 0, 24, 16);

      expect(graphics.hasColor(0xFFFFFF)).toBe(true); // White
      expect(graphics.hasColor(0xDC143C)).toBe(true); // Red
    });

    it('should draw two horizontal stripes of equal height', () => {
      FlagRenderer.drawPolishFlag(graphics as any, 0, 0, 24, 16);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      expect(fillRectCalls.length).toBe(2);

      // Check that each stripe is 8 pixels tall (16 / 2)
      expect(fillRectCalls[0].args).toEqual([0, 0, 24, 8]); // White
      expect(fillRectCalls[1].args).toEqual([0, 8, 24, 8]); // Red
    });
  });

  describe('drawRussianFlag', () => {
    it('should draw Russian flag with correct colors', () => {
      FlagRenderer.drawRussianFlag(graphics as any, 0, 0, 24, 18);

      expect(graphics.hasColor(0xFFFFFF)).toBe(true); // White
      expect(graphics.hasColor(0x0039A6)).toBe(true); // Blue
      expect(graphics.hasColor(0xD52B1E)).toBe(true); // Red
    });

    it('should draw three horizontal stripes of equal height', () => {
      FlagRenderer.drawRussianFlag(graphics as any, 0, 0, 24, 18);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      expect(fillRectCalls.length).toBe(3);

      // Check that each stripe is 6 pixels tall (18 / 3)
      expect(fillRectCalls[0].args).toEqual([0, 0, 24, 6]); // White
      expect(fillRectCalls[1].args).toEqual([0, 6, 24, 6]); // Blue
      expect(fillRectCalls[2].args).toEqual([0, 12, 24, 6]); // Red
    });
  });

  describe('drawSwissFlag', () => {
    it('should draw Swiss flag with correct colors', () => {
      FlagRenderer.drawSwissFlag(graphics as any, 0, 0, 24, 16);

      expect(graphics.hasColor(0xDA291C)).toBe(true); // Red background
      expect(graphics.hasColor(0xFFFFFF)).toBe(true); // White cross
    });

    it('should draw red background', () => {
      FlagRenderer.drawSwissFlag(graphics as any, 0, 0, 24, 16);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      expect(fillRectCalls.length).toBe(1);
      expect(fillRectCalls[0].args).toEqual([0, 0, 24, 16]);
    });

    it('should draw cross lines', () => {
      FlagRenderer.drawSwissFlag(graphics as any, 0, 0, 24, 16);

      const lineCalls = graphics.getCallsOfType('lineBetween');
      expect(lineCalls.length).toBe(2); // Vertical and horizontal bar
    });

    it('should draw cross in center', () => {
      FlagRenderer.drawSwissFlag(graphics as any, 0, 0, 24, 16);

      const lineCalls = graphics.getCallsOfType('lineBetween');
      // Vertical bar should be centered at x=12 (24/2)
      const verticalBar = lineCalls[0];
      expect(verticalBar.args[0]).toBe(12); // x1
      expect(verticalBar.args[2]).toBe(12); // x2

      // Horizontal bar should be centered at y=8 (16/2)
      const horizontalBar = lineCalls[1];
      expect(horizontalBar.args[1]).toBe(8); // y1
      expect(horizontalBar.args[3]).toBe(8); // y2
    });
  });

  describe('drawUSAFlag', () => {
    it('should draw USA flag with correct colors', () => {
      FlagRenderer.drawUSAFlag(graphics as any, 0, 0, 40, 26);

      expect(graphics.hasColor(0xB22234)).toBe(true); // Red
      expect(graphics.hasColor(0xFFFFFF)).toBe(true); // White
      expect(graphics.hasColor(0x3C3B6E)).toBe(true); // Blue canton
    });

    it('should draw 13 stripes (7 white, 6 red)', () => {
      FlagRenderer.drawUSAFlag(graphics as any, 0, 0, 40, 26);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      // Should have: 1 red background + 7 white stripes + 1 blue canton = 9 rectangles
      expect(fillRectCalls.length).toBe(9);
    });

    it('should draw blue canton in top-left corner', () => {
      FlagRenderer.drawUSAFlag(graphics as any, 0, 0, 40, 20);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      const cantonCall = fillRectCalls[fillRectCalls.length - 1]; // Last call should be canton

      // Canton should be 40% width, 50% height
      expect(cantonCall.args).toEqual([0, 0, 16, 10]);
    });

    it('should draw white stripes at correct positions', () => {
      const height = 26;
      const stripeHeight = height / 13;

      FlagRenderer.drawUSAFlag(graphics as any, 0, 0, 40, height);

      const fillRectCalls = graphics.getCallsOfType('fillRect');
      const whiteStripeCalls = fillRectCalls.slice(1, 8); // Skip red background, take 7 white stripes

      // Check that white stripes are at correct y positions (0, 2, 4, 6, 8, 10, 12)
      for (let i = 0; i < 7; i++) {
        expect(whiteStripeCalls[i].args[1]).toBe(i * stripeHeight * 2);
      }
    });
  });

  describe('Integration tests', () => {
    it('should handle different positions and sizes', () => {
      const positions = [
        { x: 0, y: 0, width: 24, height: 16 },
        { x: 100, y: 200, width: 48, height: 32 },
        { x: -10, y: -20, width: 12, height: 8 },
      ];

      positions.forEach((pos) => {
        graphics.reset();
        FlagRenderer.drawFlag(graphics as any, 'Poland', pos.x, pos.y, pos.width, pos.height);

        const fillRectCalls = graphics.getCallsOfType('fillRect');
        expect(fillRectCalls.length).toBeGreaterThan(0);

        // First rectangle should match position
        expect(fillRectCalls[0].args[0]).toBe(pos.x);
        expect(fillRectCalls[0].args[1]).toBe(pos.y);
      });
    });

    it('should draw all country flags without errors', () => {
      const countries = [
        'United Kingdom',
        'France',
        'Switzerland',
        'Germany',
        'Poland',
        'Russia',
        'USA',
        'Washington DC',
      ];

      countries.forEach((country) => {
        graphics.reset();
        expect(() => {
          FlagRenderer.drawFlag(graphics as any, country, 0, 0, 24, 16);
        }).not.toThrow();

        // Each flag should have drawn something
        expect(graphics.getCalls().length).toBeGreaterThan(0);
      });
    });

    it('should maintain correct proportions for scaled flags', () => {
      // Draw Polish flag at different scales
      const scales = [
        { width: 24, height: 16 },
        { width: 48, height: 32 },
        { width: 12, height: 8 },
      ];

      scales.forEach((scale) => {
        graphics.reset();
        FlagRenderer.drawPolishFlag(graphics as any, 0, 0, scale.width, scale.height);

        const fillRectCalls = graphics.getCallsOfType('fillRect');
        expect(fillRectCalls.length).toBe(2);

        // Each stripe should be exactly half the height
        expect(fillRectCalls[0].args[3]).toBe(scale.height / 2);
        expect(fillRectCalls[1].args[3]).toBe(scale.height / 2);
      });
    });
  });
});
