/**
 * Audio Settings System
 * Manages music and speech volume with localStorage persistence
 */

const STORAGE_KEY = 'lander_audio_settings';

interface StoredAudioSettings {
  musicVolume: number;
  speechVolume: number;
}

class AudioSettingsManager {
  private musicVolume: number = 0.3;
  private speechVolume: number = 0.7;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings: StoredAudioSettings = JSON.parse(stored);
        this.musicVolume = settings.musicVolume ?? 0.3;
        this.speechVolume = settings.speechVolume ?? 0.7;
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }
  }

  private saveSettings(): void {
    try {
      const settings: StoredAudioSettings = {
        musicVolume: this.musicVolume,
        speechVolume: this.speechVolume,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save audio settings:', e);
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
   * Get music volume (0-1)
   */
  getMusicVolume(): number {
    return this.musicVolume;
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Get speech/SFX volume (0-1)
   */
  getSpeechVolume(): number {
    return this.speechVolume;
  }

  /**
   * Set speech/SFX volume (0-1)
   */
  setSpeechVolume(volume: number): void {
    this.speechVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Reset to default settings
   */
  reset(): void {
    this.musicVolume = 0.3;
    this.speechVolume = 0.7;
    this.saveSettings();
    this.notifyListeners();
  }
}

// Singleton instance
export const AudioSettings = new AudioSettingsManager();
