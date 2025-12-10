import { ACHIEVEMENTS, Achievement } from '../data/achievements';

const STORAGE_KEY = 'peaceShuttle_achievements';

export interface AchievementSaveData {
  unlockedAchievements: {
    [id: string]: {
      unlockedAt: string;
    };
  };
  stats: {
    totalDeaths: number;
    totalCasinoChipValue: number;
  };
}

type AchievementListener = (achievement: Achievement) => void;

export class AchievementSystem {
  private data: AchievementSaveData;
  private listeners: AchievementListener[] = [];
  private sessionStats = {
    buildingsDestroyed: 0,
    cannonsDestroyed: 0,
    countriesVisited: new Set<string>(),
    p1Kills: 0,
    p2Kills: 0,
    casinoChipValue: 0,
    gameStartTime: 0,
  };

  constructor() {
    this.data = this.load();
  }

  private load(): AchievementSaveData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load achievements:', e);
    }
    return {
      unlockedAchievements: {},
      stats: {
        totalDeaths: 0,
        totalCasinoChipValue: 0,
      },
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save achievements:', e);
    }
  }

  onUnlock(listener: AchievementListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: AchievementListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  isUnlocked(id: string): boolean {
    return id in this.data.unlockedAchievements;
  }

  unlock(id: string): boolean {
    if (this.isUnlocked(id)) {
      return false;
    }

    const achievement = ACHIEVEMENTS.find((a) => a.id === id);
    if (!achievement) {
      console.warn(`Unknown achievement: ${id}`);
      return false;
    }

    this.data.unlockedAchievements[id] = {
      unlockedAt: new Date().toISOString(),
    };
    this.save();

    // Notify listeners
    for (const listener of this.listeners) {
      listener(achievement);
    }

    // Check for trophy hunter (all achievements)
    this.checkTrophyHunter();

    return true;
  }

  private checkTrophyHunter(): void {
    if (this.isUnlocked('trophy_hunter')) return;

    const nonPlatinum = ACHIEVEMENTS.filter((a) => a.tier !== 'platinum');
    const allUnlocked = nonPlatinum.every((a) => this.isUnlocked(a.id));

    if (allUnlocked) {
      this.unlock('trophy_hunter');
    }
  }

  getUnlockedCount(): number {
    return Object.keys(this.data.unlockedAchievements).length;
  }

  getTotalCount(): number {
    return ACHIEVEMENTS.length;
  }

  getAll(): Achievement[] {
    return ACHIEVEMENTS;
  }

  getUnlockDate(id: string): string | null {
    const data = this.data.unlockedAchievements[id];
    return data ? data.unlockedAt : null;
  }

  // Session tracking methods
  startSession(): void {
    // Clear old listeners from previous game sessions
    this.listeners = [];

    this.sessionStats = {
      buildingsDestroyed: 0,
      cannonsDestroyed: 0,
      countriesVisited: new Set<string>(),
      p1Kills: 0,
      p2Kills: 0,
      casinoChipValue: 0,
      gameStartTime: Date.now(),
    };
  }

  // Event handlers for game events
  onLanding(quality: string): void {
    this.unlock('first_contact');
    if (quality === 'perfect') {
      this.unlock('smooth_operator');
    }
  }

  onBuildingDestroyed(): void {
    this.sessionStats.buildingsDestroyed++;
    this.unlock('collateral_damage');
    if (this.sessionStats.buildingsDestroyed >= 25) {
      this.unlock('wrecking_ball');
    }
  }

  onCannonDestroyed(): void {
    this.sessionStats.cannonsDestroyed++;
    if (this.sessionStats.cannonsDestroyed >= 5) {
      this.unlock('cannon_fodder');
    }
  }

  onFisherBoatDestroyed(): void {
    this.unlock('fisher_of_men');
  }

  onGolfCartDestroyed(): void {
    this.unlock('fore');
  }

  onCountryVisited(country: string): void {
    this.sessionStats.countriesVisited.add(country);
    // Check if all countries visited (Washington, USA, UK, France, Germany, Poland, Russia)
    if (this.sessionStats.countriesVisited.size >= 7) {
      this.unlock('world_traveler');
    }
  }

  onDeath(cause: string): void {
    this.data.stats.totalDeaths++;
    this.save();

    // Check time-based achievement
    const elapsed = Date.now() - this.sessionStats.gameStartTime;
    if (elapsed < 60000) {
      // 60 seconds
      this.unlock('gone_in_60_seconds');
    }

    // Cause-specific achievements
    if (cause === 'water') {
      this.unlock('splashdown');
    } else if (cause === 'duck') {
      this.unlock('duck_hunt');
    } else if (cause === 'void') {
      this.unlock('lost_in_space');
    } else if (cause === 'fuel') {
      this.unlock('running_on_empty');
    }

    // Cumulative deaths
    if (this.data.stats.totalDeaths >= 10) {
      this.unlock('frequent_flyer');
    }
  }

  onVictory(hasPeaceMedal: boolean, buildingsDestroyed: number): void {
    this.unlock('mission_complete');
    if (hasPeaceMedal) {
      this.unlock('peacekeeper');
    }
    if (buildingsDestroyed === 0) {
      this.unlock('pacifist');
    }
  }

  onPlayerKill(killer: number): void {
    if (killer === 1) {
      this.sessionStats.p1Kills++;
      this.unlock('first_blood');
      if (this.sessionStats.p1Kills >= 5) {
        this.unlock('ace_pilot');
      }
    } else {
      this.sessionStats.p2Kills++;
      this.unlock('first_blood');
      if (this.sessionStats.p2Kills >= 5) {
        this.unlock('ace_pilot');
      }
    }
  }

  onTwoPlayerGameEnd(p1Kills: number, p2Kills: number): void {
    const diff = Math.abs(p1Kills - p2Kills);
    if (diff >= 5) {
      this.unlock('domination');
    }
  }

  onCasinoChipCollected(value: number): void {
    this.sessionStats.casinoChipValue += value;
    this.data.stats.totalCasinoChipValue += value;
    this.save();

    if (this.data.stats.totalCasinoChipValue >= 500) {
      this.unlock('high_roller');
    }
  }

  // For start screen display
  getRecentUnlocks(count: number = 3): Achievement[] {
    const unlocked = Object.entries(this.data.unlockedAchievements)
      .map(([id, data]) => ({
        achievement: ACHIEVEMENTS.find((a) => a.id === id)!,
        date: new Date(data.unlockedAt),
      }))
      .filter((item) => item.achievement)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, count)
      .map((item) => item.achievement);

    return unlocked;
  }
}

// Singleton instance
let instance: AchievementSystem | null = null;

export function getAchievementSystem(): AchievementSystem {
  if (!instance) {
    instance = new AchievementSystem();
  }
  return instance;
}
