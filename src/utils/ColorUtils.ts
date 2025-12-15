/**
 * Color utility functions for manipulating hexadecimal color values.
 * These functions work with colors represented as numbers (e.g., 0xFF0000 for red).
 */

/**
 * Darkens a color by multiplying each RGB component by a factor.
 *
 * @param color - The color as a hexadecimal number (e.g., 0xFF0000)
 * @param factor - The darkening factor (0-1). Lower values = darker color.
 * @returns The darkened color as a hexadecimal number
 *
 * @example
 * darkenColor(0xFF0000, 0.5) // Returns 0x7F0000 (darker red)
 */
export function darkenColor(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xFF) * factor);
  const g = Math.floor(((color >> 8) & 0xFF) * factor);
  const b = Math.floor((color & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
}

/**
 * Lightens a color by multiplying each RGB component by a factor.
 * Unlike darkenColor, this function clamps each component to a maximum of 255.
 *
 * @param color - The color as a hexadecimal number (e.g., 0xFF0000)
 * @param factor - The lightening factor (>1 for lighter). Higher values = lighter color.
 * @returns The lightened color as a hexadecimal number
 *
 * @example
 * lightenColor(0x7F0000, 2) // Returns 0xFE0000 (lighter red)
 */
export function lightenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) * factor));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) * factor));
  const b = Math.min(255, Math.floor((color & 0xFF) * factor));
  return (r << 16) | (g << 8) | b;
}

/**
 * Linearly interpolates between two colors.
 *
 * @param color1 - The first color as a hexadecimal number
 * @param color2 - The second color as a hexadecimal number
 * @param t - The interpolation factor (0-1). 0 returns color1, 1 returns color2.
 * @returns The interpolated color as a hexadecimal number
 *
 * @example
 * lerpColor(0xFF0000, 0x0000FF, 0.5) // Returns 0x7F007F (purple, halfway between red and blue)
 */
export function lerpColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
}
