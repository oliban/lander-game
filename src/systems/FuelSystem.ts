import { INITIAL_FUEL } from '../constants';

export class FuelSystem {
  private fuel: number;
  private maxFuel: number;
  private onFuelChange: ((fuel: number, max: number) => void) | null = null;

  constructor(initialFuel: number = INITIAL_FUEL) {
    this.fuel = initialFuel;
    this.maxFuel = initialFuel;
  }

  setOnFuelChange(callback: (fuel: number, max: number) => void): void {
    this.onFuelChange = callback;
    // Trigger initial update
    callback(this.fuel, this.maxFuel);
  }

  consume(amount: number): boolean {
    if (this.fuel <= 0) return false;

    this.fuel = Math.max(0, this.fuel - amount);
    this.notifyChange();
    return true;
  }

  add(amount: number): void {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
    this.notifyChange();
  }

  setFuel(amount: number): void {
    this.fuel = Phaser.Math.Clamp(amount, 0, this.maxFuel);
    this.notifyChange();
  }

  getFuel(): number {
    return this.fuel;
  }

  getMaxFuel(): number {
    return this.maxFuel;
  }

  getPercentage(): number {
    return (this.fuel / this.maxFuel) * 100;
  }

  isEmpty(): boolean {
    return this.fuel <= 0;
  }

  isFull(): boolean {
    return this.fuel >= this.maxFuel;
  }

  private notifyChange(): void {
    if (this.onFuelChange) {
      this.onFuelChange(this.fuel, this.maxFuel);
    }
  }
}
