import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLLECTIBLE_TYPES } from '../constants';
import { getCollectionSystem } from '../systems/CollectionSystem';

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
  private scrollY = 0;
  private maxScroll = 0;
  private listContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'CollectionScene' });
  }

  create(): void {
    const collectionSystem = getCollectionSystem();

    // Dark background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d1b2a);

    // Header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1a1a2e, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 100);

    const title = this.add.text(GAME_WIDTH / 2, 35, 'COLLECTION', {
      fontSize: '32px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Progress
    const discovered = collectionSystem.getDiscoveredCount();
    const total = collectionSystem.getTotalCount();
    const percent = Math.round((discovered / total) * 100);

    const progress = this.add.text(GAME_WIDTH / 2, 70, `${discovered}/${total} Discovered (${percent}%)`, {
      fontSize: '18px',
      color: '#AAAAAA',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    progress.setOrigin(0.5, 0.5);

    // Progress bar
    const barWidth = 300;
    const barHeight = 8;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 85;

    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x333333, 1);
    progressBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

    const progressBarFill = this.add.graphics();
    progressBarFill.fillStyle(0xffd700, 1);
    progressBarFill.fillRoundedRect(barX, barY, barWidth * (discovered / total), barHeight, 4);

    // Create scrollable grid container
    const listY = 110;
    const listHeight = GAME_HEIGHT - listY - 60;

    // Mask for scrolling
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, listY, GAME_WIDTH, listHeight);
    const mask = maskShape.createGeometryMask();

    this.listContainer = this.add.container(0, listY);
    this.listContainer.setMask(mask);

    // Get all item types and sort them
    const allItems = collectionSystem.getAllItemTypes();
    const rows = Math.ceil(allItems.length / COLUMNS);
    const gridHeight = rows * (ITEM_SIZE + ITEM_PADDING) + LIST_PADDING * 2;
    this.maxScroll = Math.max(0, gridHeight - listHeight);

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

    // Scroll handling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScroll);
      this.listContainer.y = listY - this.scrollY;
    });

    // Touch/drag scrolling
    let dragStartY = 0;
    let dragStartScroll = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > listY && pointer.y < listY + listHeight) {
        dragStartY = pointer.y;
        dragStartScroll = this.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && dragStartY > 0) {
        const delta = dragStartY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(dragStartScroll + delta, 0, this.maxScroll);
        this.listContainer.y = listY - this.scrollY;
      }
    });

    this.input.on('pointerup', () => {
      dragStartY = 0;
    });

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 35, 'BACK', () => {
      this.scene.start('MenuScene');
    });

    // ESC key to go back
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private createCollectionItem(itemType: string, x: number, y: number, isDiscovered: boolean): void {
    const itemData = COLLECTIBLE_TYPES[itemType as keyof typeof COLLECTIBLE_TYPES];
    if (!itemData) return;

    const container = this.add.container(0, 0);
    this.listContainer.add(container);

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
    const centerY = y + ITEM_SIZE / 2 - 8;

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
      const name = this.add.text(centerX, y + ITEM_SIZE - 18, displayName, {
        fontSize: '12px',
        color: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif',
      });
      name.setOrigin(0.5, 0.5);
      container.add(name);
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

      const unknown = this.add.text(centerX, y + ITEM_SIZE - 18, '???', {
        fontSize: '12px',
        color: '#555555',
        fontFamily: 'Arial, Helvetica, sans-serif',
      });
      unknown.setOrigin(0.5, 0.5);
      container.add(unknown);
    }
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x4caf50, 1);
    bg.fillRoundedRect(-80, -20, 160, 40, 8);
    bg.lineStyle(2, 0x2e7d32);
    bg.strokeRoundedRect(-80, -20, 160, 40, 8);

    const text = this.add.text(0, 0, label, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-80, -20, 160, 40), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x66bb6a, 1);
      bg.fillRoundedRect(-80, -20, 160, 40, 8);
      bg.lineStyle(2, 0x2e7d32);
      bg.strokeRoundedRect(-80, -20, 160, 40, 8);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x4caf50, 1);
      bg.fillRoundedRect(-80, -20, 160, 40, 8);
      bg.lineStyle(2, 0x2e7d32);
      bg.strokeRoundedRect(-80, -20, 160, 40, 8);
    });

    container.on('pointerdown', callback);

    return container;
  }
}
