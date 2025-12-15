import Phaser from 'phaser';
import { CountryDecoration, getCountryAssetPrefix } from '../objects/CountryDecoration';
import { MedalHouse } from '../objects/MedalHouse';
import { COUNTRIES, LANDING_PADS } from '../constants';

interface FlatArea {
  x: number;
  y: number;
  width: number;
}

export interface DecorationManagerCallbacks {
  getFlatAreas: () => FlatArea[];
  getHeightAt: (x: number) => number;
  getCannonPositions: () => { x: number; y: number }[];
}

export class DecorationManager {
  private scene: Phaser.Scene;
  private callbacks: DecorationManagerCallbacks;
  private decorations: (CountryDecoration | MedalHouse)[] = [];
  private medalHouse: MedalHouse | null = null;

  constructor(scene: Phaser.Scene, callbacks: DecorationManagerCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Create all decorations based on terrain flat areas
   */
  createDecorations(): void {
    const flatAreas = this.callbacks.getFlatAreas();
    const cannonPositions = this.callbacks.getCannonPositions();

    // Track used images to prevent duplicates: Set of "country_type_index" strings
    const usedImages = new Set<string>();

    for (const area of flatAreas) {
      // Determine which country this flat area is in
      let countryName = 'USA';
      for (let i = COUNTRIES.length - 1; i >= 0; i--) {
        if (area.x >= COUNTRIES[i].startX) {
          countryName = COUNTRIES[i].name;
          break;
        }
      }

      // Get the asset prefix for this country
      const assetPrefix = getCountryAssetPrefix(countryName);
      if (!assetPrefix) continue; // Skip Atlantic Ocean

      // Random chance to place a decoration (80%)
      if (Math.random() > 0.8) continue;

      // Skip if too close to any cannon (within 80 pixels - check 2D distance)
      const decorationY = this.callbacks.getHeightAt(area.x);
      const tooCloseToCannon = cannonPositions.some((cannon) => {
        const dx = cannon.x - area.x;
        const dy = cannon.y - decorationY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 80;
      });
      if (tooCloseToCannon) continue;

      // Choose building (70%) or landmark (30%)
      const isLandmark = Math.random() < 0.3;
      const typeStr = isLandmark ? 'landmark' : 'building';

      // Find an unused image index for this country/type combo
      let index = -1;
      const availableIndices: number[] = [];
      for (let i = 0; i < 16; i++) {
        // Skip Washington building indices 12 (Union Station) and 13 (Kennedy Center)
        if (assetPrefix === 'Washington' && typeStr === 'building' && (i === 12 || i === 13)) continue;
        const key = `${assetPrefix}_${typeStr}_${i}`;
        if (!usedImages.has(key)) {
          availableIndices.push(i);
        }
      }

      // Track final type used
      let finalIsLandmark = isLandmark;

      // If no available images of this type, try the other type
      if (availableIndices.length === 0) {
        finalIsLandmark = !isLandmark;
        const altTypeStr = isLandmark ? 'building' : 'landmark';
        for (let i = 0; i < 16; i++) {
          const key = `${assetPrefix}_${altTypeStr}_${i}`;
          if (!usedImages.has(key)) {
            availableIndices.push(i);
          }
        }
        if (availableIndices.length > 0) {
          index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          const key = `${assetPrefix}_${altTypeStr}_${index}`;
          usedImages.add(key);
        }
      } else {
        // Pick a random available index
        index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        const key = `${assetPrefix}_${typeStr}_${index}`;
        usedImages.add(key);
      }

      // Skip if no available images
      if (index === -1) continue;

      // Get actual terrain height at this position
      const terrainY = this.callbacks.getHeightAt(area.x);

      // Create the decoration
      const decoration = new CountryDecoration(
        this.scene,
        area.x,
        terrainY,
        assetPrefix,
        index,
        finalIsLandmark
      );

      this.decorations.push(decoration);
    }

    // Medal house (FIFA Kennedy Center) - special building spawned near Washington DC
    this.createMedalHouse();
  }

  /**
   * Create the medal house near Washington DC
   */
  private createMedalHouse(): void {
    const washingtonPad = LANDING_PADS.find(p => p.isWashington);
    if (washingtonPad) {
      const medalHouseX = washingtonPad.x - 120;
      const medalHouseY = this.callbacks.getHeightAt(medalHouseX);
      this.medalHouse = new MedalHouse(this.scene, medalHouseX, medalHouseY);
      this.decorations.push(this.medalHouse);
    }
  }

  /**
   * Get all decorations (including medal house)
   */
  getDecorations(): (CountryDecoration | MedalHouse)[] {
    return this.decorations;
  }

  /**
   * Get the medal house if it exists
   */
  getMedalHouse(): MedalHouse | null {
    return this.medalHouse;
  }
}
