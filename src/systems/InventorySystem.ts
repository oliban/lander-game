import { COLLECTIBLE_TYPES } from '../constants';
import { CollectibleType } from '../objects/Collectible';

export interface InventoryItem {
  type: CollectibleType;
  count: number;
  fuelValue: number;
  name: string;
  color: number;
  isMystery?: boolean;
}

// Generate random casino chip value (weighted towards lower values)
function generateCasinoChipValue(): number {
  const roll = Math.random();
  if (roll < 0.01) {
    // 1% chance for jackpot (400-500)
    return 400 + Math.floor(Math.random() * 101);
  } else if (roll < 0.05) {
    // 4% chance for high (200-399)
    return 200 + Math.floor(Math.random() * 200);
  } else if (roll < 0.20) {
    // 15% chance for medium (75-199)
    return 75 + Math.floor(Math.random() * 125);
  } else {
    // 80% chance for low (10-74)
    return 10 + Math.floor(Math.random() * 65);
  }
}

export class InventorySystem {
  private inventory: Map<CollectibleType, number> = new Map();
  private casinoChipValues: number[] = []; // Individual values for each casino chip
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

    // Generate random values for casino chips
    if (type === 'CASINO_CHIP') {
      for (let i = 0; i < count; i++) {
        this.casinoChipValues.push(generateCasinoChipValue());
      }
    }

    this.notifyChange();
  }

  remove(type: CollectibleType, count: number = 1): boolean {
    const current = this.inventory.get(type) || 0;
    if (current < count) return false;

    this.inventory.set(type, current - count);

    // Remove casino chip values (remove from front - oldest first)
    if (type === 'CASINO_CHIP') {
      this.casinoChipValues.splice(0, count);
    }

    this.notifyChange();
    return true;
  }

  // Get the total value of casino chips that would be sold
  getCasinoChipTotalValue(count: number): number {
    let total = 0;
    for (let i = 0; i < Math.min(count, this.casinoChipValues.length); i++) {
      total += this.casinoChipValues[i];
    }
    return total;
  }

  // Get individual casino chip values (for display)
  getCasinoChipValues(): number[] {
    return [...this.casinoChipValues];
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
        const typeData = COLLECTIBLE_TYPES[type] as { name: string; fuelValue: number; color: number; mystery?: boolean };
        items.push({
          type,
          count,
          fuelValue: typeData.fuelValue,
          name: typeData.name,
          color: typeData.color,
          isMystery: typeData.mystery,
        });
      }
    }
    return items;
  }

  getAllItems(): InventoryItem[] {
    const items: InventoryItem[] = [];
    for (const type of Object.keys(COLLECTIBLE_TYPES) as CollectibleType[]) {
      const typeData = COLLECTIBLE_TYPES[type] as { name: string; fuelValue: number; color: number; mystery?: boolean };
      items.push({
        type,
        count: this.inventory.get(type) || 0,
        fuelValue: typeData.fuelValue,
        name: typeData.name,
        color: typeData.color,
        isMystery: typeData.mystery,
      });
    }
    return items;
  }

  clear(): void {
    for (const type of Object.keys(COLLECTIBLE_TYPES) as CollectibleType[]) {
      this.inventory.set(type, 0);
    }
    this.casinoChipValues = []; // Also clear casino chip values
    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onInventoryChange) {
      this.onInventoryChange(this.getItems());
    }
  }
}
