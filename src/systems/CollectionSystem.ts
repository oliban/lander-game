import { COLLECTIBLE_TYPES } from '../constants';
import { getAchievementSystem } from './AchievementSystem';

const STORAGE_KEY = 'peaceShuttle_collection';

export interface CollectionSaveData {
  discoveredItems: string[];
}

type CollectionListener = (itemType: string) => void;

export class CollectionSystem {
  private data: CollectionSaveData;
  private listeners: CollectionListener[] = [];
  private allItemTypes: string[];

  constructor() {
    this.allItemTypes = Object.keys(COLLECTIBLE_TYPES);
    this.data = this.load();
  }

  private load(): CollectionSaveData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load collection:', e);
    }
    return {
      discoveredItems: [],
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save collection:', e);
    }
  }

  onDiscover(listener: CollectionListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: CollectionListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  isDiscovered(itemType: string): boolean {
    return this.data.discoveredItems.includes(itemType);
  }

  markDiscovered(itemType: string): boolean {
    if (this.isDiscovered(itemType)) {
      return false;
    }

    // Verify it's a valid collectible type
    if (!this.allItemTypes.includes(itemType)) {
      console.warn(`Unknown collectible type: ${itemType}`);
      return false;
    }

    this.data.discoveredItems.push(itemType);
    this.save();

    // Notify listeners
    for (const listener of this.listeners) {
      listener(itemType);
    }

    // Check for collector achievement
    this.checkCollectorAchievement();

    return true;
  }

  private checkCollectorAchievement(): void {
    if (this.isComplete()) {
      const achievementSystem = getAchievementSystem();
      achievementSystem.unlock('collector');
    }
  }

  getDiscoveredCount(): number {
    return this.data.discoveredItems.length;
  }

  getTotalCount(): number {
    return this.allItemTypes.length;
  }

  isComplete(): boolean {
    return this.getDiscoveredCount() >= this.getTotalCount();
  }

  getAllItemTypes(): string[] {
    return [...this.allItemTypes];
  }

  getDiscoveredItems(): string[] {
    return [...this.data.discoveredItems];
  }

  // Get recent discoveries (for menu display)
  getRecentDiscoveries(count: number = 4): string[] {
    // Return the most recently discovered items (last in array = most recent)
    return this.data.discoveredItems.slice(-count).reverse();
  }
}

// Singleton instance
let instance: CollectionSystem | null = null;

export function getCollectionSystem(): CollectionSystem {
  if (!instance) {
    instance = new CollectionSystem();
  }
  return instance;
}
