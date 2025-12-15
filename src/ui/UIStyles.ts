/**
 * Shared UI style constants for consistent look across all scenes
 */

// Font families
export const FONTS = {
  PRIMARY: 'Arial, Helvetica, sans-serif',
  SERIF: 'Georgia, serif',
  MONO: 'Courier New, monospace',
};

// Color palette (hex numbers for Phaser graphics)
export const COLORS = {
  // Primary colors
  GOLD: 0xFFD700,
  WHITE: 0xFFFFFF,
  BLACK: 0x000000,

  // Button colors
  BUTTON_GREEN: 0x4CAF50,
  BUTTON_GREEN_HOVER: 0x66BB6A,
  BUTTON_GREEN_BORDER: 0x2E7D32,

  BUTTON_RED: 0xCC0000,
  BUTTON_BLUE: 0x2196F3,
  BUTTON_ORANGE: 0xFF9800,

  // Background colors
  PANEL_DARK: 0x1A1A2E,
  PANEL_BLACK: 0x000000,
  OVERLAY_DARK: 0x000000,

  // Text colors (as hex strings for Phaser text)
  TEXT_GOLD: '#FFD700',
  TEXT_WHITE: '#FFFFFF',
  TEXT_GRAY: '#AAAAAA',
  TEXT_LIGHT_GRAY: '#CCCCCC',
  TEXT_DARK: '#333333',

  // Progress bar
  PROGRESS_BG: 0x333333,
  PROGRESS_FILL: 0xFFD700,

  // Misc
  GRAY: 0x888888,
  DARK_GRAY: 0x333333,
};

// Font sizes
export const FONT_SIZES = {
  TITLE_LARGE: '48px',
  TITLE: '32px',
  SUBTITLE: '24px',
  BODY: '20px',
  BODY_SMALL: '18px',
  CAPTION: '16px',
  SMALL: '14px',
  TINY: '12px',
};

// Pre-defined text styles for common use cases
export const TEXT_STYLES = {
  TITLE_LARGE: {
    fontSize: FONT_SIZES.TITLE_LARGE,
    color: COLORS.TEXT_GOLD,
    fontFamily: FONTS.PRIMARY,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
  },

  TITLE: {
    fontSize: FONT_SIZES.TITLE,
    color: COLORS.TEXT_GOLD,
    fontFamily: FONTS.PRIMARY,
    fontStyle: 'bold',
  },

  SUBTITLE: {
    fontSize: FONT_SIZES.SUBTITLE,
    color: COLORS.TEXT_WHITE,
    fontFamily: FONTS.PRIMARY,
  },

  BODY: {
    fontSize: FONT_SIZES.BODY,
    color: COLORS.TEXT_WHITE,
    fontFamily: FONTS.PRIMARY,
  },

  BODY_BOLD: {
    fontSize: FONT_SIZES.BODY,
    color: COLORS.TEXT_WHITE,
    fontFamily: FONTS.PRIMARY,
    fontStyle: 'bold',
  },

  BODY_SMALL: {
    fontSize: FONT_SIZES.BODY_SMALL,
    color: COLORS.TEXT_GRAY,
    fontFamily: FONTS.PRIMARY,
  },

  CAPTION: {
    fontSize: FONT_SIZES.CAPTION,
    color: COLORS.TEXT_GRAY,
    fontFamily: FONTS.PRIMARY,
  },

  QUOTE: {
    fontSize: FONT_SIZES.CAPTION,
    color: COLORS.TEXT_GOLD,
    fontFamily: FONTS.SERIF,
    fontStyle: 'italic',
  },

  BUTTON: {
    fontSize: FONT_SIZES.SUBTITLE,
    color: COLORS.TEXT_WHITE,
    fontFamily: FONTS.PRIMARY,
    fontStyle: 'bold',
  },

  BUTTON_SMALL: {
    fontSize: FONT_SIZES.BODY_SMALL,
    color: COLORS.TEXT_WHITE,
    fontFamily: FONTS.PRIMARY,
    fontStyle: 'bold',
  },
};

// Standard button sizes
export const BUTTON_SIZES = {
  LARGE: { width: 240, height: 50, radius: 12, fontSize: '24px' },
  MEDIUM: { width: 200, height: 44, radius: 12, fontSize: '20px' },
  SMALL: { width: 160, height: 40, radius: 8, fontSize: '18px' },
};

// Panel/container styling
export const PANEL_STYLES = {
  HEADER: {
    height: 100,
    alpha: 0.9,
    color: COLORS.PANEL_DARK,
  },
  OVERLAY: {
    alpha: 0.7,
    color: COLORS.PANEL_BLACK,
  },
};

// Progress bar defaults
export const PROGRESS_BAR = {
  WIDTH: 300,
  HEIGHT: 8,
  RADIUS: 4,
  BG_COLOR: COLORS.PROGRESS_BG,
  FILL_COLOR: COLORS.PROGRESS_FILL,
};
