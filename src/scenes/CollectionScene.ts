import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLLECTIBLE_TYPES } from '../constants';
import { getCollectionSystem } from '../systems/CollectionSystem';
import { UIHeader } from '../ui/UIHeader';
import { ScrollableContainer } from '../ui/ScrollableContainer';
import { createGreenButton } from '../ui/UIButton';

const ITEM_SIZE = 150;
const ITEM_PADDING = 15;
const COLUMNS = 4;
const LIST_PADDING = 20;

// Map collectible types to their sprite keys (null means no sprite, use colored circle)
const SPRITE_KEYS: Record<string, string | null> = {
  BURGER: 'burger',
  HAMBERDER: 'hamberder',
  DIET_COKE: 'dietcoke',
  TRUMP_STEAK: 'trumpsteak',
  VODKA: 'vodka',
  DOLLAR: 'dollar',
  HAIR_SPRAY: 'hairspray',
  TWITTER: 'twitter',
  CASINO_CHIP: 'casinochip',
  MAGA_HAT: 'magahat',
  NFT: 'nft',
  BITCOIN: 'bitcoin',
  CLASSIFIED_DOCS: 'classifieddocs',
  GOLDEN_TOILET: 'goldentoilet',
  EPSTEIN_FILES: 'classifieddocs', // Uses same sprite
  MATRYOSHKA: 'matryoshka',
  OLIGARCH_GOLD: 'oligarchgold',
  COVFEFE: 'covfefe',
  TRUMP_TOWER: 'trumptower',
  RED_TIE: 'redtie',
  TAN_SUIT: 'tansuit',
  // Propaganda items don't have individual sprites - use colored circles
  USA_PROPAGANDA: null,
  UK_PROPAGANDA: null,
  FRANCE_PROPAGANDA: null,
  GERMANY_PROPAGANDA: null,
  POLAND_PROPAGANDA: null,
  RUSSIA_PROPAGANDA: null,
  FISH_PACKAGE: null,
};

export class CollectionScene extends Phaser.Scene {
  private scrollContainer!: ScrollableContainer;

  constructor() {
    super({ key: 'CollectionScene' });
  }

  create(): void {
    const collectionSystem = getCollectionSystem();

    // Dark background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d1b2a);

    // Progress stats
    const discovered = collectionSystem.getDiscoveredCount();
    const total = collectionSystem.getTotalCount();

    // Header with progress bar
    const header = new UIHeader(this, {
      title: 'COLLECTION',
      width: GAME_WIDTH,
      showProgress: true,
      current: discovered,
      total: total,
      progressLabelSuffix: 'Discovered',
    });

    // Calculate list dimensions
    const listY = header.getHeight() + 10;
    const listHeight = GAME_HEIGHT - listY - 60;

    // Get all item types and calculate grid dimensions
    const allItems = collectionSystem.getAllItemTypes();
    const rows = Math.ceil(allItems.length / COLUMNS);
    const gridHeight = rows * (ITEM_SIZE + ITEM_PADDING) + LIST_PADDING * 2;

    // Create scrollable container
    this.scrollContainer = new ScrollableContainer(this, {
      y: listY,
      width: GAME_WIDTH,
      height: listHeight,
      contentHeight: gridHeight,
    });

    // Calculate grid offset to center it
    const gridWidth = COLUMNS * (ITEM_SIZE + ITEM_PADDING) - ITEM_PADDING;
    const gridOffsetX = (GAME_WIDTH - gridWidth) / 2;

    // Create grid items
    allItems.forEach((itemType, index) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = gridOffsetX + col * (ITEM_SIZE + ITEM_PADDING);
      const y = LIST_PADDING + row * (ITEM_SIZE + ITEM_PADDING);

      this.createCollectionItem(itemType, x, y, collectionSystem.isDiscovered(itemType));
    });

    // Back button
    createGreenButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 35, 'BACK', () => {
      this.scene.start('MenuScene');
    }, 'small');

    // ESC key to go back
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private createCollectionItem(itemType: string, x: number, y: number, isDiscovered: boolean): void {
    const itemData = COLLECTIBLE_TYPES[itemType as keyof typeof COLLECTIBLE_TYPES];
    if (!itemData) return;

    const container = this.add.container(0, 0);
    this.scrollContainer.add(container);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(isDiscovered ? 0x1a3a1a : 0x1a1a2e, 0.8);
    bg.fillRoundedRect(x, y, ITEM_SIZE, ITEM_SIZE, 8);

    if (isDiscovered) {
      bg.lineStyle(2, itemData.color, 0.7);
      bg.strokeRoundedRect(x, y, ITEM_SIZE, ITEM_SIZE, 8);
    } else {
      bg.lineStyle(1, 0x333333, 0.5);
      bg.strokeRoundedRect(x, y, ITEM_SIZE, ITEM_SIZE, 8);
    }
    container.add(bg);

    const centerX = x + ITEM_SIZE / 2;
    const centerY = y + ITEM_SIZE / 2 - 15; // Moved up to make room for value text

    if (isDiscovered) {
      // Show item
      const spriteKey = SPRITE_KEYS[itemType];

      if (spriteKey && this.textures.exists(spriteKey)) {
        // Draw colored circle background
        const circle = this.add.graphics();
        circle.fillStyle(itemData.color, 0.3);
        circle.fillCircle(centerX, centerY, 50);
        circle.lineStyle(2, itemData.color, 0.8);
        circle.strokeCircle(centerX, centerY, 50);
        container.add(circle);

        // Add sprite at natural size (capped to fit)
        const sprite = this.add.image(centerX, centerY, spriteKey);
        const maxSize = 80;
        if (sprite.width > maxSize || sprite.height > maxSize) {
          const scale = maxSize / Math.max(sprite.width, sprite.height);
          sprite.setScale(scale);
        }
        container.add(sprite);
      } else {
        // No sprite - draw colored circle with first letter
        const circle = this.add.graphics();
        circle.fillStyle(itemData.color, 0.5);
        circle.fillCircle(centerX, centerY, 50);
        circle.lineStyle(2, itemData.color, 0.8);
        circle.strokeCircle(centerX, centerY, 50);
        container.add(circle);

        const letter = this.add.text(centerX, centerY, itemData.name.charAt(0), {
          fontSize: '36px',
          color: '#FFFFFF',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontStyle: 'bold',
        });
        letter.setOrigin(0.5, 0.5);
        container.add(letter);
      }

      // Item name (truncated if needed)
      let displayName = itemData.name;
      if (displayName.length > 16) {
        displayName = displayName.substring(0, 14) + '..';
      }
      const name = this.add.text(centerX, y + ITEM_SIZE - 28, displayName, {
        fontSize: '12px',
        color: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif',
      });
      name.setOrigin(0.5, 0.5);
      container.add(name);

      // Item value display
      let valueText = '';
      let valueColor = '#AAAAAA';
      const itemDataExt = itemData as { special?: string; mystery?: boolean; fuelValue: number };

      if (itemDataExt.special) {
        // Power-up items
        const specialNames: Record<string, string> = {
          'fuel_boost': '⚡ FUEL+',
          'bribe_cannons': '💰 BRIBE',
          'speed_boost': '🚀 SPEED',
        };
        valueText = specialNames[itemDataExt.special] || 'SPECIAL';
        valueColor = '#FFD700';
      } else if (itemDataExt.mystery) {
        // Mystery items (Casino Chip)
        valueText = '??? FUEL';
        valueColor = '#9932CC';
      } else if (itemDataExt.fuelValue === 0) {
        // Bomb items (droppable, no fuel value)
        valueText = '💣 BOMB';
        valueColor = '#FF6B35';
      } else {
        // Standard tradeable items
        valueText = `${itemDataExt.fuelValue} FUEL`;
        valueColor = '#44FF44';
      }

      const value = this.add.text(centerX, y + ITEM_SIZE - 12, valueText, {
        fontSize: '11px',
        color: valueColor,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: 'bold',
      });
      value.setOrigin(0.5, 0.5);
      container.add(value);
    } else {
      // Unknown item - show silhouette
      const circle = this.add.graphics();
      circle.fillStyle(0x333333, 0.5);
      circle.fillCircle(centerX, centerY, 50);
      circle.lineStyle(2, 0x555555, 0.5);
      circle.strokeCircle(centerX, centerY, 50);
      container.add(circle);

      const questionMark = this.add.text(centerX, centerY, '?', {
        fontSize: '48px',
        color: '#555555',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: 'bold',
      });
      questionMark.setOrigin(0.5, 0.5);
      container.add(questionMark);

      const unknown = this.add.text(centerX, y + ITEM_SIZE - 20, '???', {
        fontSize: '12px',
        color: '#555555',
        fontFamily: 'Arial, Helvetica, sans-serif',
      });
      unknown.setOrigin(0.5, 0.5);
      container.add(unknown);
    }
  }
}
