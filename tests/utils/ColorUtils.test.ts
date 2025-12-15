import { describe, it, expect } from 'vitest';
import { darkenColor, lightenColor, lerpColor } from '../../src/utils/ColorUtils';

describe('ColorUtils', () => {
  describe('darkenColor', () => {
    it('should darken red by 50%', () => {
      const result = darkenColor(0xFF0000, 0.5);
      expect(result).toBe(0x7F0000);
    });

    it('should darken green by 50%', () => {
      const result = darkenColor(0x00FF00, 0.5);
      expect(result).toBe(0x007F00);
    });

    it('should darken blue by 50%', () => {
      const result = darkenColor(0x0000FF, 0.5);
      expect(result).toBe(0x00007F);
    });

    it('should darken white by 50% to gray', () => {
      const result = darkenColor(0xFFFFFF, 0.5);
      expect(result).toBe(0x7F7F7F);
    });

    it('should darken mixed color correctly', () => {
      const result = darkenColor(0xAABBCC, 0.5);
      // AA = 170, BB = 187, CC = 204
      // * 0.5 = 85, 93, 102
      // = 0x555D66
      expect(result).toBe(0x555D66);
    });

    it('should return black when factor is 0', () => {
      const result = darkenColor(0xFF00FF, 0);
      expect(result).toBe(0x000000);
    });

    it('should return same color when factor is 1', () => {
      const result = darkenColor(0xFF00FF, 1);
      expect(result).toBe(0xFF00FF);
    });

    it('should darken to near-black with small factor', () => {
      const result = darkenColor(0xFFFFFF, 0.1);
      expect(result).toBe(0x191919); // 25, 25, 25
    });

    it('should handle already dark colors', () => {
      const result = darkenColor(0x0A0A0A, 0.5);
      expect(result).toBe(0x050505);
    });

    it('should floor fractional RGB values', () => {
      // 0xFF = 255, 255 * 0.6 = 153, floor(153) = 153 = 0x99
      const result = darkenColor(0xFFFFFF, 0.6);
      expect(result).toBe(0x999999);
    });
  });

  describe('lightenColor', () => {
    it('should lighten dark red by factor 2', () => {
      const result = lightenColor(0x7F0000, 2);
      expect(result).toBe(0xFE0000); // 127 * 2 = 254
    });

    it('should lighten dark green by factor 2', () => {
      const result = lightenColor(0x007F00, 2);
      expect(result).toBe(0x00FE00);
    });

    it('should lighten dark blue by factor 2', () => {
      const result = lightenColor(0x00007F, 2);
      expect(result).toBe(0x0000FE);
    });

    it('should clamp values at 255', () => {
      const result = lightenColor(0x7F7F7F, 3);
      // 127 * 3 = 381, but clamped to 255
      expect(result).toBe(0xFFFFFF);
    });

    it('should handle factor of 1 (no change)', () => {
      const result = lightenColor(0xAABBCC, 1);
      expect(result).toBe(0xAABBCC);
    });

    it('should darken when factor is less than 1', () => {
      const result = lightenColor(0xFFFFFF, 0.5);
      expect(result).toBe(0x7F7F7F);
    });

    it('should return black when factor is 0', () => {
      const result = lightenColor(0xFF00FF, 0);
      expect(result).toBe(0x000000);
    });

    it('should clamp each component independently', () => {
      // R: 200 * 2 = 400 -> 255
      // G: 100 * 2 = 200 -> 200
      // B: 50 * 2 = 100 -> 100
      const result = lightenColor(0xC86432, 2);
      expect(result).toBe(0xFFC864); // 255, 200, 100
    });

    it('should floor fractional values before clamping', () => {
      // 100 * 1.5 = 150, floor(150) = 150
      const result = lightenColor(0x646464, 1.5);
      expect(result).toBe(0x969696); // 150 in hex
    });

    it('should handle white with any factor >= 1', () => {
      const result = lightenColor(0xFFFFFF, 1.5);
      expect(result).toBe(0xFFFFFF);
    });
  });

  describe('lerpColor', () => {
    it('should return color1 when t is 0', () => {
      const result = lerpColor(0xFF0000, 0x0000FF, 0);
      expect(result).toBe(0xFF0000);
    });

    it('should return color2 when t is 1', () => {
      const result = lerpColor(0xFF0000, 0x0000FF, 1);
      expect(result).toBe(0x0000FF);
    });

    it('should interpolate between red and blue at 50%', () => {
      const result = lerpColor(0xFF0000, 0x0000FF, 0.5);
      // R: 255 + (0 - 255) * 0.5 = 127.5 -> round(127.5) = 128 = 0x80
      // G: 0
      // B: 0 + (255 - 0) * 0.5 = 127.5 -> round(127.5) = 128 = 0x80
      expect(result).toBe(0x800080);
    });

    it('should interpolate between black and white', () => {
      const result = lerpColor(0x000000, 0xFFFFFF, 0.5);
      expect(result).toBe(0x808080); // 128, 128, 128
    });

    it('should interpolate at 25%', () => {
      const result = lerpColor(0xFF0000, 0x0000FF, 0.25);
      // R: 255 + (0 - 255) * 0.25 = 191.25 -> round = 191 = 0xBF
      // G: 0
      // B: 0 + (255 - 0) * 0.25 = 63.75 -> round = 64 = 0x40
      expect(result).toBe(0xBF0040);
    });

    it('should interpolate at 75%', () => {
      const result = lerpColor(0xFF0000, 0x0000FF, 0.75);
      // R: 255 + (0 - 255) * 0.75 = 63.75 -> round = 64 = 0x40
      // G: 0
      // B: 0 + (255 - 0) * 0.75 = 191.25 -> round = 191 = 0xBF
      expect(result).toBe(0x4000BF);
    });

    it('should interpolate between two arbitrary colors', () => {
      const result = lerpColor(0xAABBCC, 0x112233, 0.5);
      // R: 170 + (17 - 170) * 0.5 = 93.5 -> round = 94 = 0x5E
      // G: 187 + (34 - 187) * 0.5 = 110.5 -> round = 111 = 0x6F
      // B: 204 + (51 - 204) * 0.5 = 127.5 -> round = 128 = 0x80
      expect(result).toBe(0x5E6F80);
    });

    it('should handle same colors', () => {
      const result = lerpColor(0xFF00FF, 0xFF00FF, 0.5);
      expect(result).toBe(0xFF00FF);
    });

    it('should round interpolated values correctly', () => {
      // Test rounding behavior: 0.5 rounds to nearest even (banker's rounding)
      // but Math.round in JavaScript rounds 0.5 up
      const result = lerpColor(0x000000, 0x010101, 0.5);
      // R: 0 + (1 - 0) * 0.5 = 0.5 -> round = 1
      // G: 0 + (1 - 0) * 0.5 = 0.5 -> round = 1
      // B: 0 + (1 - 0) * 0.5 = 0.5 -> round = 1
      expect(result).toBe(0x010101);
    });

    it('should handle t = 0.1', () => {
      const result = lerpColor(0xFF0000, 0x00FF00, 0.1);
      // R: 255 + (0 - 255) * 0.1 = 229.5 -> round = 230 = 0xE6
      // G: 0 + (255 - 0) * 0.1 = 25.5 -> round = 26 = 0x1A
      // B: 0
      expect(result).toBe(0xE61A00);
    });

    it('should handle t = 0.9', () => {
      const result = lerpColor(0xFF0000, 0x00FF00, 0.9);
      // R: 255 + (0 - 255) * 0.9 = 25.5 -> round = 26 = 0x1A
      // G: 0 + (255 - 0) * 0.9 = 229.5 -> round = 230 = 0xE6
      // B: 0
      expect(result).toBe(0x1AE600);
    });
  });

  describe('edge cases and integration', () => {
    it('should handle pure black color', () => {
      expect(darkenColor(0x000000, 0.5)).toBe(0x000000);
      expect(lightenColor(0x000000, 2)).toBe(0x000000);
      expect(lerpColor(0x000000, 0x000000, 0.5)).toBe(0x000000);
    });

    it('should handle pure white color', () => {
      expect(darkenColor(0xFFFFFF, 1)).toBe(0xFFFFFF);
      expect(lightenColor(0xFFFFFF, 1)).toBe(0xFFFFFF);
      expect(lerpColor(0xFFFFFF, 0xFFFFFF, 0.5)).toBe(0xFFFFFF);
    });

    it('should compose darken and lighten operations', () => {
      const original = 0xAABBCC;
      const darkened = darkenColor(original, 0.5);
      const lightened = lightenColor(darkened, 2);

      // Should be close to original (within rounding errors)
      // 0xAA = 170, * 0.5 = 85, * 2 = 170
      // 0xBB = 187, * 0.5 = 93, * 2 = 186
      // 0xCC = 204, * 0.5 = 102, * 2 = 204
      expect(lightened).toBe(0xAABACC);
    });

    it('should lerp from darkened to lightened color', () => {
      const base = 0x808080;
      const dark = darkenColor(base, 0.5);
      const light = lightenColor(base, 1.5);
      const mid = lerpColor(dark, light, 0.5);

      // dark = 0x404040 (64, 64, 64)
      // light = 0xC0C0C0 (192, 192, 192)
      // mid should be around 0x808080
      expect(mid).toBe(0x808080);
    });
  });
});
