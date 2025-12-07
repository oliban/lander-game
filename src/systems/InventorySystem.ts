import { COLLECTIBLE_TYPES } from '../constants';
import { CollectibleType } from '../objects/Collectible';

export interface InventoryItem {
  type: CollectibleType;
  count: number;
  fuelValue: number;
  name: string;
  color: number;
}

export class InventorySystem {
  private inventory: Map<CollectibleType, number> = new Map();
  private onInventoryChange: ((items: InventoryItem[]) => void) | null = null;

  constructor() {
    // Initialize all types with 0
    for (const type of Object.keys(COLLECTIBLE_TYPES) as CollectibleType[]) {
      this.inventory.set(type, 0);
    }
  }

  setOnInventoryChange(callback: (items: InventoryItem[]) => void): void {
    this.onInventoryChange = callback;
    this.notifyChange();
  }

  add(type: CollectibleType, count: number = 1): void {
    const current = this.inventory.get(type) || 0;
    this.inventory.set(type, current + count);
    this.notifyChange();
  }

  remove(type: CollectibleType, count: number = 1): boolean {
    const current = this.inventory.get(type) || 0;
    if (current < count) return false;

    this.inventory.set(type, current - count);
    this.notifyChange();
    return true;
  }

  getCount(type: CollectibleType): number {
    return this.inventory.get(type) || 0;
  }

  getTotalFuelValue(): number {
    let total = 0;
    for (const [type, count] of this.inventory) {
      total += count * COLLECTIBLE_TYPES[type].fuelValue;
    }
    return total;
  }

  getItems(): InventoryItem[] {
    const items: InventoryItem[] = [];
    for (const [type, count] of this.inventory) {
      if (count > 0) {
        const typeData = COLLECTIBLE_TYPES[type];
        items.push({
          type,
          count,
          fuelValue: typeData.fuelValue,
          name: typeData.name,
          color: typeData.color,
        });
      }
    }
    return items;
  }

  getAllItems(): InventoryItem[] {
    const items: InventoryItem[] = [];
    for (const type of Object.keys(COLLECTIBLE_TYPES) as CollectibleType[]) {
      const typeData = COLLECTIBLE_TYPES[type];
      items.push({
        type,
        count: this.inventory.get(type) || 0,
        fuelValue: typeData.fuelValue,
        name: typeData.name,
        color: typeData.color,
      });
    }
    return items;
  }

  clear(): void {
    for (const type of Object.keys(COLLECTIBLE_TYPES) as CollectibleType[]) {
      this.inventory.set(type, 0);
    }
    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onInventoryChange) {
      this.onInventoryChange(this.getItems());
    }
  }
}
