import { describe, it, expect } from 'vitest';
import {
  FONTS,
  COLORS,
  FONT_SIZES,
  TEXT_STYLES,
  BUTTON_SIZES,
  PANEL_STYLES,
  PROGRESS_BAR,
} from '../../src/ui/UIStyles';

describe('UIStyles', () => {
  describe('FONTS', () => {
    it('should define PRIMARY font family', () => {
      expect(FONTS.PRIMARY).toBe('Arial, Helvetica, sans-serif');
    });

    it('should define SERIF font family', () => {
      expect(FONTS.SERIF).toBe('Georgia, serif');
    });

    it('should define MONO font family', () => {
      expect(FONTS.MONO).toBe('Courier New, monospace');
    });
  });

  describe('COLORS', () => {
    it('should define primary colors as hex numbers', () => {
      expect(COLORS.GOLD).toBe(0xFFD700);
      expect(COLORS.WHITE).toBe(0xFFFFFF);
      expect(COLORS.BLACK).toBe(0x000000);
    });

    it('should define button colors', () => {
      expect(COLORS.BUTTON_GREEN).toBe(0x4CAF50);
      expect(COLORS.BUTTON_GREEN_HOVER).toBe(0x66BB6A);
      expect(COLORS.BUTTON_GREEN_BORDER).toBe(0x2E7D32);
    });

    it('should define text colors as hex strings', () => {
      expect(COLORS.TEXT_GOLD).toBe('#FFD700');
      expect(COLORS.TEXT_WHITE).toBe('#FFFFFF');
      expect(COLORS.TEXT_GRAY).toBe('#AAAAAA');
    });

    it('should define progress bar colors', () => {
      expect(COLORS.PROGRESS_BG).toBe(0x333333);
      expect(COLORS.PROGRESS_FILL).toBe(0xFFD700);
    });
  });

  describe('FONT_SIZES', () => {
    it('should define font sizes as pixel strings', () => {
      expect(FONT_SIZES.TITLE_LARGE).toBe('48px');
      expect(FONT_SIZES.TITLE).toBe('32px');
      expect(FONT_SIZES.SUBTITLE).toBe('24px');
      expect(FONT_SIZES.BODY).toBe('20px');
      expect(FONT_SIZES.BODY_SMALL).toBe('18px');
      expect(FONT_SIZES.CAPTION).toBe('16px');
      expect(FONT_SIZES.SMALL).toBe('14px');
      expect(FONT_SIZES.TINY).toBe('12px');
    });
  });

  describe('TEXT_STYLES', () => {
    it('should define TITLE_LARGE style with correct properties', () => {
      expect(TEXT_STYLES.TITLE_LARGE).toEqual({
        fontSize: '48px',
        color: '#FFD700',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      });
    });

    it('should define TITLE style', () => {
      expect(TEXT_STYLES.TITLE.fontSize).toBe('32px');
      expect(TEXT_STYLES.TITLE.color).toBe('#FFD700');
      expect(TEXT_STYLES.TITLE.fontStyle).toBe('bold');
    });

    it('should define BUTTON style', () => {
      expect(TEXT_STYLES.BUTTON.fontStyle).toBe('bold');
      expect(TEXT_STYLES.BUTTON.color).toBe('#FFFFFF');
    });

    it('should define QUOTE style with serif font', () => {
      expect(TEXT_STYLES.QUOTE.fontFamily).toBe('Georgia, serif');
      expect(TEXT_STYLES.QUOTE.fontStyle).toBe('italic');
    });
  });

  describe('BUTTON_SIZES', () => {
    it('should define LARGE button size', () => {
      expect(BUTTON_SIZES.LARGE).toEqual({
        width: 240,
        height: 50,
        radius: 12,
        fontSize: '24px',
      });
    });

    it('should define MEDIUM button size', () => {
      expect(BUTTON_SIZES.MEDIUM).toEqual({
        width: 200,
        height: 44,
        radius: 12,
        fontSize: '20px',
      });
    });

    it('should define SMALL button size', () => {
      expect(BUTTON_SIZES.SMALL).toEqual({
        width: 160,
        height: 40,
        radius: 8,
        fontSize: '18px',
      });
    });
  });

  describe('PANEL_STYLES', () => {
    it('should define HEADER panel style', () => {
      expect(PANEL_STYLES.HEADER.height).toBe(100);
      expect(PANEL_STYLES.HEADER.alpha).toBe(0.9);
      expect(PANEL_STYLES.HEADER.color).toBe(0x1A1A2E);
    });

    it('should define OVERLAY panel style', () => {
      expect(PANEL_STYLES.OVERLAY.alpha).toBe(0.7);
      expect(PANEL_STYLES.OVERLAY.color).toBe(0x000000);
    });
  });

  describe('PROGRESS_BAR', () => {
    it('should define progress bar dimensions', () => {
      expect(PROGRESS_BAR.WIDTH).toBe(300);
      expect(PROGRESS_BAR.HEIGHT).toBe(8);
      expect(PROGRESS_BAR.RADIUS).toBe(4);
    });

    it('should define progress bar colors', () => {
      expect(PROGRESS_BAR.BG_COLOR).toBe(0x333333);
      expect(PROGRESS_BAR.FILL_COLOR).toBe(0xFFD700);
    });
  });
});
