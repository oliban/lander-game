import Phaser from 'phaser';
import { COUNTRY_MUSIC, MUSIC_CROSSFADE_DURATION, MUSIC_DEFAULT_VOLUME } from '../constants';

export class MusicManager {
  private scene: Phaser.Scene;
  private currentTrack: Phaser.Sound.BaseSound | null = null;
  private nextTrack: Phaser.Sound.BaseSound | null = null;
  private currentCountry: string = '';
  private isCrossfading: boolean = false;
  private masterVolume: number = MUSIC_DEFAULT_VOLUME;
  private enabled: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Called every frame with the current country name
   * Handles country change detection and crossfade initiation
   */
  update(countryName: string): void {
    if (!this.enabled) return;

    // Detect country change
    if (countryName !== this.currentCountry && !this.isCrossfading) {
      this.transitionToCountry(countryName);
    }
  }

  /**
   * Start playing music for a country (initial play, no crossfade)
   */
  startMusic(countryName: string): void {
    if (!this.enabled) return;

    const trackKey = COUNTRY_MUSIC[countryName];
    if (!trackKey) return;

    // Stop any existing music tracks to prevent duplicates on scene restart
    this.stopAllMusicTracks();

    this.currentCountry = countryName;
    this.currentTrack = this.scene.sound.add(trackKey, {
      loop: true,
      volume: this.masterVolume,
    });
    this.currentTrack.play();
  }

  /**
   * Stop all music tracks in the sound manager (prevents duplicates on restart)
   */
  private stopAllMusicTracks(): void {
    const musicKeys = Object.values(COUNTRY_MUSIC);
    this.scene.sound.getAllPlaying().forEach(sound => {
      if (musicKeys.includes(sound.key)) {
        sound.stop();
        sound.destroy();
      }
    });
  }

  /**
   * Transition to a new country's music with crossfade
   */
  private transitionToCountry(newCountry: string): void {
    const newTrackKey = COUNTRY_MUSIC[newCountry];
    if (!newTrackKey) return;

    this.isCrossfading = true;
    this.currentCountry = newCountry;

    // Create and start the new track at volume 0
    this.nextTrack = this.scene.sound.add(newTrackKey, {
      loop: true,
      volume: 0,
    });
    this.nextTrack.play();

    // Fade out current track
    if (this.currentTrack && this.currentTrack.isPlaying) {
      this.scene.tweens.add({
        targets: this.currentTrack,
        volume: 0,
        duration: MUSIC_CROSSFADE_DURATION,
        ease: 'Linear',
        onComplete: () => {
          // Stop and clean up old track
          if (this.currentTrack) {
            this.currentTrack.stop();
            this.currentTrack.destroy();
          }
        },
      });
    }

    // Fade in new track
    this.scene.tweens.add({
      targets: this.nextTrack,
      volume: this.masterVolume,
      duration: MUSIC_CROSSFADE_DURATION,
      ease: 'Linear',
      onComplete: () => {
        // Swap references
        this.currentTrack = this.nextTrack;
        this.nextTrack = null;
        this.isCrossfading = false;
      },
    });
  }

  /**
   * Stop all music immediately (for game over, menu, etc.)
   */
  stopAll(): void {
    if (this.currentTrack) {
      this.currentTrack.stop();
      this.currentTrack.destroy();
      this.currentTrack = null;
    }
    if (this.nextTrack) {
      this.nextTrack.stop();
      this.nextTrack.destroy();
      this.nextTrack = null;
    }
    this.currentCountry = '';
    this.isCrossfading = false;
  }

  /**
   * Fade out and stop all music (for graceful transitions)
   */
  fadeOutAndStop(duration: number = 1000): void {
    const tracksToFade = [this.currentTrack, this.nextTrack].filter(t => t);

    for (const track of tracksToFade) {
      if (track && track.isPlaying) {
        this.scene.tweens.add({
          targets: track,
          volume: 0,
          duration: duration,
          ease: 'Linear',
          onComplete: () => {
            track.stop();
            track.destroy();
          },
        });
      }
    }

    this.currentTrack = null;
    this.nextTrack = null;
    this.currentCountry = '';
    this.isCrossfading = false;
  }

  /**
   * Set master volume for background music
   */
  setVolume(volume: number): void {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.currentTrack && !this.isCrossfading) {
      (this.currentTrack as Phaser.Sound.WebAudioSound).setVolume(this.masterVolume);
    }
  }

  /**
   * Enable/disable music system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * Check if music is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current playing country
   */
  getCurrentCountry(): string {
    return this.currentCountry;
  }
}
