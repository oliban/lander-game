import Phaser from 'phaser';

export interface ScrollableContainerConfig {
  x?: number;          // Default: 0
  y: number;           // Top Y position of scroll area
  width: number;       // Width of scroll area
  height: number;      // Height of scroll area
  contentHeight: number; // Total height of content (for max scroll calculation)
  scrollSpeed?: number;  // Wheel scroll multiplier (default: 0.5)
}

/**
 * Reusable scrollable container with mouse wheel and touch/drag support
 */
export class ScrollableContainer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private mask: Phaser.Display.Masks.GeometryMask;
  private maskGraphics: Phaser.GameObjects.Graphics;

  private scrollY: number = 0;
  private maxScroll: number;
  private listY: number;
  private listHeight: number;
  private scrollSpeed: number;

  private dragStartY: number = 0;
  private dragStartScroll: number = 0;

  constructor(scene: Phaser.Scene, config: ScrollableContainerConfig) {
    this.scene = scene;
    this.listY = config.y;
    this.listHeight = config.height;
    this.scrollSpeed = config.scrollSpeed ?? 0.5;
    this.maxScroll = Math.max(0, config.contentHeight - config.height);

    // Create mask for scrolling
    this.maskGraphics = scene.make.graphics({});
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(config.x ?? 0, config.y, config.width, config.height);
    this.mask = this.maskGraphics.createGeometryMask();

    // Create container
    this.container = scene.add.container(config.x ?? 0, config.y);
    this.container.setMask(this.mask);

    // Setup scroll handlers
    this.setupScrollHandlers();
  }

  private setupScrollHandlers(): void {
    // Mouse wheel scrolling
    this.scene.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number
    ) => {
      this.scroll(deltaY * this.scrollSpeed);
    });

    // Touch/drag scrolling
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > this.listY && pointer.y < this.listY + this.listHeight) {
        this.dragStartY = pointer.y;
        this.dragStartScroll = this.scrollY;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.dragStartY > 0) {
        const delta = this.dragStartY - pointer.y;
        this.setScrollY(this.dragStartScroll + delta);
      }
    });

    this.scene.input.on('pointerup', () => {
      this.dragStartY = 0;
    });
  }

  /**
   * Scroll by a delta amount
   */
  scroll(delta: number): void {
    this.setScrollY(this.scrollY + delta);
  }

  /**
   * Set absolute scroll position
   */
  setScrollY(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.container.y = this.listY - this.scrollY;
  }

  /**
   * Get current scroll position
   */
  getScrollY(): number {
    return this.scrollY;
  }

  /**
   * Update max scroll (call when content changes)
   */
  setContentHeight(contentHeight: number): void {
    this.maxScroll = Math.max(0, contentHeight - this.listHeight);
    // Clamp current scroll if needed
    if (this.scrollY > this.maxScroll) {
      this.setScrollY(this.maxScroll);
    }
  }

  /**
   * Get the container to add items to
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Add a game object to the scrollable container
   */
  add(gameObject: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): this {
    this.container.add(gameObject);
    return this;
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    this.setScrollY(0);
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    this.setScrollY(this.maxScroll);
  }

  /**
   * Scroll to make a specific Y position visible
   */
  scrollToY(targetY: number): void {
    if (targetY < this.scrollY) {
      this.setScrollY(targetY);
    } else if (targetY > this.scrollY + this.listHeight) {
      this.setScrollY(targetY - this.listHeight);
    }
  }

  /**
   * Set depth of the container
   */
  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  /**
   * Destroy the scrollable container
   */
  destroy(): void {
    this.scene.input.off('wheel');
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.maskGraphics.destroy();
    this.container.destroy();
  }
}
