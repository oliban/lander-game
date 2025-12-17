/**
 * Performance Settings System
 * Manages quality presets and auto-adjustment for low-end devices
 */

export type QualityLevel = 'ultra' | 'high' | 'medium' | 'low' | 'potato';

export interface QualityPreset {
  name: string;
  weather: 'full' | 'light' | 'off';
  chemtrails: boolean;
  chemtrailLifespan: number; // ms
  scorchMarks: boolean;
  maxScorchMarks: number;
  explosionDebris: boolean;
  explosionDebrisCount: number;
  explosionSmoke: boolean;
  thrusterParticles: boolean;
  particleMultiplier: number; // 0.0 - 1.0
  waterSplash: boolean;
  rainSplash: boolean;
  windDebris: boolean;
  flagAnimations: boolean;
  decorations: boolean;
  cameraShake: boolean;
  achievementAnimations: boolean;
  powerupVisuals: boolean;
  // New performance settings
  speedTrails: boolean; // Smoke trails when moving fast
  cannonMultiplier: number; // 0.0 - 1.0, fraction of cannons to create
  collisionCheckInterval: number; // ms between full collision checks (0 = every frame)
  scorchRaycastInterval: number; // ms between scorch mark raycasts
  entityUpdates: boolean; // Update non-essential entities (sharks, golf cart, etc.)
  oceanWaves: boolean; // Animated ocean waves (very expensive)
  altitudeOverlay: boolean; // Gradient altitude warning effect
  projectileCollisions: boolean; // Projectile-vs-projectile collision checks
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  ultra: {
    name: 'Ultra',
    weather: 'full',
    chemtrails: true,
    chemtrailLifespan: 15000,
    scorchMarks: true,
    maxScorchMarks: 150,
    explosionDebris: true,
    explosionDebrisCount: 12,
    explosionSmoke: true,
    thrusterParticles: true,
    particleMultiplier: 1.0,
    waterSplash: true,
    rainSplash: true,
    windDebris: true,
    flagAnimations: true,
    decorations: true,
    cameraShake: true,
    achievementAnimations: true,
    powerupVisuals: true,
    speedTrails: true,
    cannonMultiplier: 1.0,
    collisionCheckInterval: 0,
    scorchRaycastInterval: 50,
    entityUpdates: true,
    oceanWaves: true,
    altitudeOverlay: true,
    projectileCollisions: true,
  },
  high: {
    name: 'High',
    weather: 'light',
    chemtrails: true,
    chemtrailLifespan: 8000,
    scorchMarks: true,
    maxScorchMarks: 100,
    explosionDebris: true,
    explosionDebrisCount: 12,
    explosionSmoke: true,
    thrusterParticles: true,
    particleMultiplier: 0.75,
    waterSplash: true,
    rainSplash: true,
    windDebris: true,
    flagAnimations: true,
    decorations: true,
    cameraShake: true,
    achievementAnimations: true,
    powerupVisuals: true,
    speedTrails: true,
    cannonMultiplier: 1.0,
    collisionCheckInterval: 0,
    scorchRaycastInterval: 50,
    entityUpdates: true,
    oceanWaves: true,
    altitudeOverlay: true,
    projectileCollisions: true,
  },
  medium: {
    name: 'Medium',
    weather: 'off',
    chemtrails: false,
    chemtrailLifespan: 0,
    scorchMarks: true,
    maxScorchMarks: 50,
    explosionDebris: true,
    explosionDebrisCount: 6,
    explosionSmoke: false,
    thrusterParticles: true,
    particleMultiplier: 0.5,
    waterSplash: true,
    rainSplash: false,
    windDebris: false,
    flagAnimations: false,
    decorations: true,
    cameraShake: true,
    achievementAnimations: true,
    powerupVisuals: true,
    speedTrails: true,
    cannonMultiplier: 0.75,
    collisionCheckInterval: 16, // ~60 fps interval
    scorchRaycastInterval: 100,
    entityUpdates: true,
    oceanWaves: true,
    altitudeOverlay: true,
    projectileCollisions: true,
  },
  low: {
    name: 'Low',
    weather: 'off',
    chemtrails: false,
    chemtrailLifespan: 0,
    scorchMarks: false,
    maxScorchMarks: 0,
    explosionDebris: true,
    explosionDebrisCount: 4,
    explosionSmoke: false,
    thrusterParticles: true,
    particleMultiplier: 0.25,
    waterSplash: false,
    rainSplash: false,
    windDebris: false,
    flagAnimations: false,
    decorations: false,
    cameraShake: false,
    achievementAnimations: false,
    powerupVisuals: true,
    speedTrails: false,
    cannonMultiplier: 0.5,
    collisionCheckInterval: 33, // ~30 fps interval
    scorchRaycastInterval: 200,
    entityUpdates: false,
    oceanWaves: false,
    altitudeOverlay: false,
    projectileCollisions: false,
  },
  potato: {
    name: 'Potato',
    weather: 'off',
    chemtrails: false,
    chemtrailLifespan: 0,
    scorchMarks: false,
    maxScorchMarks: 0,
    explosionDebris: false,
    explosionDebrisCount: 0,
    explosionSmoke: false,
    thrusterParticles: true,
    particleMultiplier: 0.15,
    waterSplash: false,
    rainSplash: false,
    windDebris: false,
    flagAnimations: false,
    decorations: false,
    cameraShake: false,
    achievementAnimations: false,
    powerupVisuals: false,
    speedTrails: false,
    cannonMultiplier: 0.25,
    collisionCheckInterval: 50, // ~20 fps interval
    scorchRaycastInterval: 500,
    entityUpdates: false,
    oceanWaves: false,
    altitudeOverlay: false,
    projectileCollisions: false,
  },
};

const QUALITY_ORDER: QualityLevel[] = ['ultra', 'high', 'medium', 'low', 'potato'];
const STORAGE_KEY = 'lander_performance_settings';

interface StoredSettings {
  qualityLevel: QualityLevel;
  autoAdjust: boolean;
  userSetQuality: boolean; // True if user manually changed quality
}

class PerformanceSettingsManager {
  private qualityLevel: QualityLevel = 'ultra';
  private autoAdjust: boolean = true;
  private userSetQuality: boolean = false;
  private lastAdjustmentTime: number = 0;
  private adjustmentCooldown: number = 2000; // 2 seconds between adjustments
  private fpsHistory: number[] = [];
  private maxFpsHistory: number = 60; // ~1 second of samples at 60fps
  private listeners: Set<() => void> = new Set();

  // Warmup period - ignore FPS during scene initialization
  private warmupStartTime: number = 0;
  private warmupDuration: number = 5000; // 5 seconds warmup after scene start

  // Auto-adjustment thresholds
  private downgradeThreshold: number = 30; // FPS below this triggers downgrade
  private upgradeThreshold: number = 45; // FPS above this allows upgrade

  constructor() {
    this.loadSettings();
    // Log current quality level on startup
    console.log(`[PERF] Starting with quality: ${QUALITY_PRESETS[this.qualityLevel].name} (auto-adjust: ${this.autoAdjust ? 'on' : 'off'})`);
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings: StoredSettings = JSON.parse(stored);
        this.qualityLevel = settings.qualityLevel || 'ultra';
        this.autoAdjust = settings.autoAdjust !== false;
        this.userSetQuality = settings.userSetQuality || false;
      }
    } catch (e) {
      console.warn('Failed to load performance settings:', e);
    }
  }

  private saveSettings(): void {
    try {
      const settings: StoredSettings = {
        qualityLevel: this.qualityLevel,
        autoAdjust: this.autoAdjust,
        userSetQuality: this.userSetQuality,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save performance settings:', e);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Add a listener that gets called when settings change
   */
  addListener(callback: () => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove a settings change listener
   */
  removeListener(callback: () => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Get the current quality preset configuration
   */
  getPreset(): QualityPreset {
    return QUALITY_PRESETS[this.qualityLevel];
  }

  /**
   * Get the current quality level
   */
  getQualityLevel(): QualityLevel {
    return this.qualityLevel;
  }

  /**
   * Set quality level manually
   */
  setQualityLevel(level: QualityLevel, isUserSet: boolean = true): void {
    if (this.qualityLevel !== level) {
      this.qualityLevel = level;
      if (isUserSet) {
        this.userSetQuality = true;
      }
      this.saveSettings();
      this.notifyListeners();
      console.log(`[PERF] Quality set to: ${QUALITY_PRESETS[level].name}`);
    }
  }

  /**
   * Get whether auto-adjust is enabled
   */
  isAutoAdjustEnabled(): boolean {
    return this.autoAdjust;
  }

  /**
   * Set auto-adjust enabled state
   */
  setAutoAdjust(enabled: boolean): void {
    this.autoAdjust = enabled;
    if (enabled) {
      // Reset user set flag when enabling auto-adjust
      this.userSetQuality = false;
    }
    this.saveSettings();
    this.notifyListeners();
    console.log(`[PERF] Auto-adjust: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Call this when a new scene starts to reset warmup timer.
   * This prevents low FPS during scene initialization from triggering downgrades.
   */
  resetWarmup(): void {
    this.warmupStartTime = Date.now();
    this.fpsHistory = []; // Clear old FPS data
    this.lastAdjustmentTime = 0;
    console.log('[PERF] Warmup started - ignoring FPS for 5 seconds');
  }

  /**
   * Call this every frame with the current FPS for auto-adjustment
   */
  updateFPS(currentFPS: number): void {
    // Skip FPS tracking during warmup period (scene initialization)
    const now = Date.now();
    if (now - this.warmupStartTime < this.warmupDuration) {
      return; // Still in warmup, ignore FPS data
    }

    // Track FPS history
    this.fpsHistory.push(currentFPS);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }

    // Skip auto-adjustment if disabled or user manually set quality
    if (!this.autoAdjust) return;

    // Wait for enough samples
    if (this.fpsHistory.length < this.maxFpsHistory) return;

    // Check cooldown (reuse 'now' from above)
    if (now - this.lastAdjustmentTime < this.adjustmentCooldown) return;

    // Calculate average FPS
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // Check if we need to downgrade
    if (avgFPS < this.downgradeThreshold) {
      const downgraded = this.downgradeQuality();
      if (downgraded) {
        this.lastAdjustmentTime = now;
        this.fpsHistory = []; // Reset history after adjustment
        console.log(`[PERF] Auto-downgraded to ${QUALITY_PRESETS[this.qualityLevel].name} (avg FPS: ${avgFPS.toFixed(1)})`);
      } else {
        // Already at lowest quality
        console.log(`[PERF] FPS low (${avgFPS.toFixed(1)}) but already at ${QUALITY_PRESETS[this.qualityLevel].name} (lowest)`);
        this.lastAdjustmentTime = now; // Still reset cooldown to avoid spam
        this.fpsHistory = [];
      }
    }
    // Check if we can upgrade (only if not user-set)
    else if (avgFPS > this.upgradeThreshold && !this.userSetQuality) {
      const upgraded = this.upgradeQuality();
      if (upgraded) {
        this.lastAdjustmentTime = now;
        this.fpsHistory = []; // Reset history after adjustment
        console.log(`[PERF] Auto-upgraded to ${QUALITY_PRESETS[this.qualityLevel].name} (avg FPS: ${avgFPS.toFixed(1)})`);
      }
    }
  }

  /**
   * Downgrade to the next lower quality level
   * Returns true if downgrade was possible
   */
  private downgradeQuality(): boolean {
    const currentIndex = QUALITY_ORDER.indexOf(this.qualityLevel);
    if (currentIndex < QUALITY_ORDER.length - 1) {
      this.qualityLevel = QUALITY_ORDER[currentIndex + 1];
      this.saveSettings();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Upgrade to the next higher quality level
   * Returns true if upgrade was possible
   */
  private upgradeQuality(): boolean {
    const currentIndex = QUALITY_ORDER.indexOf(this.qualityLevel);
    if (currentIndex > 0) {
      this.qualityLevel = QUALITY_ORDER[currentIndex - 1];
      this.saveSettings();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Reset to default settings
   */
  reset(): void {
    this.qualityLevel = 'ultra';
    this.autoAdjust = true;
    this.userSetQuality = false;
    this.fpsHistory = [];
    this.lastAdjustmentTime = 0;
    this.saveSettings();
    this.notifyListeners();
    console.log('[PERF] Settings reset to defaults');
  }

  /**
   * Set default quality based on device detection
   */
  setDefaultForDevice(isMobile: boolean): void {
    // Only set default if user hasn't manually chosen
    if (this.userSetQuality) return;

    // Check if settings were previously saved (returning user)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return;

    // Set default based on device
    if (isMobile) {
      this.qualityLevel = 'medium';
      console.log('[PERF] Mobile detected, defaulting to Medium quality');
    } else {
      this.qualityLevel = 'ultra';
      console.log('[PERF] Desktop detected, defaulting to Ultra quality');
    }
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Get all available quality levels for UI
   */
  getAvailableLevels(): QualityLevel[] {
    return [...QUALITY_ORDER];
  }

  /**
   * Get preset name for display
   */
  getPresetName(level: QualityLevel): string {
    return QUALITY_PRESETS[level].name;
  }

  /**
   * Get current average FPS (for debug display)
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }
}

// Singleton instance
export const PerformanceSettings = new PerformanceSettingsManager();
