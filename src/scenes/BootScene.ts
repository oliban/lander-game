import Phaser from 'phaser';
import { COLORS } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark background for contrast
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.fillRect(0, 0, width, height);

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 1);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    progressBox.lineStyle(2, 0xFFD700, 1);
    progressBox.strokeRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const progressBar = this.add.graphics();
    progressBar.setDepth(1); // Draw on top of progressBox

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xFFD700, 1); // Bright gold
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load title art image
    this.load.image('title-art', 'assets/images/title-art.png');

    // Load collectible images (objects_one_0 through objects_one_15)
    this.load.image('burger', 'assets/images/objects/objects_one_0.png');
    this.load.image('hamberder', 'assets/images/objects/objects_one_1.png');
    this.load.image('dietcoke', 'assets/images/objects/objects_one_2.png');
    this.load.image('dollar', 'assets/images/objects/objects_one_3.png');
    this.load.image('covfefe', 'assets/images/objects/objects_one_4.png');
    this.load.image('hairspray', 'assets/images/objects/objects_one_5.png');
    this.load.image('twitter', 'assets/images/objects/objects_one_6.png');
    this.load.image('trumpsteak', 'assets/images/objects/objects_one_7.png');
    this.load.image('casinochip', 'assets/images/objects/objects_one_8.png');
    this.load.image('magahat', 'assets/images/objects/objects_one_9.png');
    this.load.image('nft', 'assets/images/objects/objects_one_10.png');
    this.load.image('bitcoin', 'assets/images/objects/objects_one_11.png');
    this.load.image('oligarchgold', 'assets/images/objects/objects_one_12.png');
    this.load.image('tansuit', 'assets/images/objects/objects_one_13.png');
    // Special power-up items
    this.load.image('trumptower', 'assets/images/objects/objects_one_14.png');
    this.load.image('redtie', 'assets/images/objects/objects_one_15.png');
    // Additional items (objects_two_12 through objects_two_15)
    this.load.image('classifieddocs', 'assets/images/objects/objects_two_12.png');
    this.load.image('goldentoilet', 'assets/images/objects/objects_two_13.png');
    this.load.image('matryoshka', 'assets/images/objects/objects_two_14.png');
    this.load.image('vodka', 'assets/images/objects/objects_two_15.png');

    // Load country-specific projectile images
    // UK projectiles
    this.load.image('teacup', 'assets/teacup.png');
    this.load.image('doubledecker', 'assets/doubledecker.png');
    this.load.image('blackcab', 'assets/blackcab.png');
    this.load.image('guardhat', 'assets/guardhat.png');
    // France projectiles
    this.load.image('baguette', 'assets/baguette.png');
    this.load.image('wine', 'assets/wine.png');
    this.load.image('croissant', 'assets/croissant.png');
    // Switzerland projectiles
    this.load.image('cheese', 'assets/cheese.png');
    this.load.image('chocolate', 'assets/chocolate.png');
    this.load.image('watch', 'assets/watch.png');
    this.load.image('cuckoo', 'assets/cuckoo.png');
    this.load.image('fondue', 'assets/fondue.png');
    // Germany projectiles
    this.load.image('pretzel', 'assets/pretzel.png');
    this.load.image('beer', 'assets/beer.png');
    // Poland projectiles
    this.load.image('pierogi', 'assets/pierogi.png');
    this.load.image('pottery', 'assets/pottery.png');
    // Russia projectiles
    this.load.image('proj_matryoshka', 'assets/matryoshka.png');
    this.load.image('balalaika', 'assets/balalaika.png');
    this.load.image('borscht', 'assets/borscht.png');
    this.load.image('samovar', 'assets/samovar.png');

    // Load country buildings and landmarks
    const countries = ['Washington', 'USA', 'UK', 'France', 'Germany', 'Poland', 'Russia'];
    for (const country of countries) {
      for (let i = 0; i < 16; i++) {
        this.load.image(
          `${country}_building_${i}`,
          `assets/images/country_images/${country}_buildings/${country}_buildings_${i}.png`
        );
        this.load.image(
          `${country}_landmark_${i}`,
          `assets/images/country_images/${country}_landmarks/${country}_landmarks_${i}.png`
        );
      }
    }

    // Load voice quotes
    for (let i = 1; i <= 5; i++) {
      this.load.audio(`crash${i}`, `assets/audio/crash${i}.mp3`);
      this.load.audio(`victory${i}`, `assets/audio/victory${i}.mp3`);
    }
    for (let i = 1; i <= 7; i++) {
      this.load.audio(`trade${i}`, `assets/audio/trade${i}.mp3`);
    }
    for (let i = 1; i <= 8; i++) {
      this.load.audio(`bomb${i}`, `assets/audio/bomb${i}.mp3`);
    }
    this.load.audio('bribe1', 'assets/audio/bribe1.mp3');
    this.load.audio('speedboost', 'assets/audio/speedboost.mp3');
    this.load.audio('sorry_johnny', 'assets/audio/sorry_johnny.mp3');
    this.load.audio('car_crash', 'assets/audio/car-crash.mp3');
    this.load.audio('water_splash', 'assets/audio/water-splash.mp3');
    this.load.audio('water_bubbles', 'assets/audio/water-bubbles.mp3');
    this.load.audio('covfefe', 'assets/audio/covfefe.mp3');
    this.load.audio('rocket', 'assets/audio/rocket.mp3');
    this.load.audio('ice_break', 'assets/audio/ice_break.mp3');
    this.load.audio('sonic_boom', 'assets/audio/sonic-boom.mp3');

    // Collectible pickup sounds
    this.load.audio('pickup_burger', 'assets/audio/pickup_burger.mp3');
    this.load.audio('pickup_dietcoke', 'assets/audio/pickup_dietcoke.mp3');
    this.load.audio('pickup_steak', 'assets/audio/pickup_steak.mp3');
    this.load.audio('pickup_dollar', 'assets/audio/pickup_dollar.mp3');
    this.load.audio('pickup_hairspray', 'assets/audio/pickup_hairspray.mp3');
    this.load.audio('pickup_twitter', 'assets/audio/pickup_twitter.mp3');
    this.load.audio('pickup_casinochip', 'assets/audio/pickup_casinochip.mp3');
    this.load.audio('pickup_magahat', 'assets/audio/pickup_magahat.mp3');
    this.load.audio('pickup_nft', 'assets/audio/pickup_nft.mp3');
    this.load.audio('pickup_bitcoin', 'assets/audio/pickup_bitcoin.mp3');
    this.load.audio('pickup_classifieddocs', 'assets/audio/pickup_classifieddocs.mp3');
    this.load.audio('pickup_goldentoilet', 'assets/audio/pickup_goldentoilet.mp3');
    this.load.audio('pickup_vodka', 'assets/audio/pickup_vodka.mp3');
    this.load.audio('pickup_russian', 'assets/audio/pickup_russian.mp3');
    this.load.audio('pickup_tansuit', 'assets/audio/pickup_tansuit.mp3');

    // Landing sounds
    this.load.audio('landing_perfect', 'assets/audio/landing_perfect.mp3');
    this.load.audio('landing_good', 'assets/audio/landing_good.mp3');
    this.load.audio('landing_rough', 'assets/audio/landing_rough.mp3');

    // Bomb hit sounds
    for (let i = 1; i <= 5; i++) {
      this.load.audio(`bombhit${i}`, `assets/audio/bombhit${i}.mp3`);
    }

    // Player kill sounds (2-player mode)
    this.load.audio('p1_gotcha', 'assets/audio/trump-gotcha.mp3');
    this.load.audio('p2_gotcha', 'assets/audio/p2-gotcha.mp3');
    this.load.audio('self_bomb', 'assets/audio/that-was-clever.mp3');
    this.load.audio('space_force', 'assets/audio/space-force.mp3');
    this.load.audio('i_can_see_my_house', 'assets/audio/i-can-see-my-house.mp3');
    this.load.audio('baguette_death', 'assets/audio/beautiful-baguette.mp3');

    // Explosion sound effects
    for (let i = 1; i <= 3; i++) {
      this.load.audio(`explosion${i}`, `assets/audio/explosion${i}.mp3`);
    }

    // Load country background music
    const musicTracks = ['washington', 'usa', 'atlantic', 'uk', 'france', 'switzerland', 'germany', 'poland', 'russia'];
    for (const track of musicTracks) {
      this.load.audio(`music_${track}`, `assets/audio/music_${track}.mp3`);
    }

    // Victory fanfare
    this.load.audio('fanfare', 'assets/audio/fanfare.mp3');

    // Medal house images
    for (let i = 0; i < 2; i++) {
      this.load.image(`medal_house_${i}`, `assets/images/medal_house/FIFA_buildings_${i}.png`);
    }

    // Generate graphics programmatically (shuttle, particles, etc.)
    this.createGameGraphics();
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private createGameGraphics(): void {
    // Create shuttle graphic - "Peace One" space shuttle style
    const shuttleGraphics = this.make.graphics({ x: 0, y: 0 });

    // Main body (white fuselage)
    shuttleGraphics.fillStyle(0xE8E8E8);
    shuttleGraphics.fillRect(8, 8, 16, 28); // Main fuselage

    // Nose cone
    shuttleGraphics.fillStyle(0x333333); // Dark nose
    shuttleGraphics.fillTriangle(16, 0, 8, 10, 24, 10);

    // Cockpit windows
    shuttleGraphics.fillStyle(0x4488FF);
    shuttleGraphics.fillRect(12, 10, 8, 6);
    shuttleGraphics.fillStyle(0x66AAFF);
    shuttleGraphics.fillRect(13, 11, 6, 4);

    // Wings (delta shape)
    shuttleGraphics.fillStyle(0xCCCCCC);
    shuttleGraphics.fillTriangle(8, 20, 0, 34, 8, 34); // Left wing
    shuttleGraphics.fillTriangle(24, 20, 32, 34, 24, 34); // Right wing

    // "PEACE ONE" text area (red stripe)
    shuttleGraphics.fillStyle(0xCC0000);
    shuttleGraphics.fillRect(9, 16, 14, 3);

    // Engine section (back)
    shuttleGraphics.fillStyle(0x666666);
    shuttleGraphics.fillRect(10, 32, 12, 6);

    // Engine nozzles
    shuttleGraphics.fillStyle(0x444444);
    shuttleGraphics.fillCircle(13, 36, 3);
    shuttleGraphics.fillCircle(19, 36, 3);

    // Wing stripes (USA-ish)
    shuttleGraphics.lineStyle(1, 0x0000AA);
    shuttleGraphics.lineBetween(2, 32, 8, 24);
    shuttleGraphics.lineBetween(30, 32, 24, 24);

    shuttleGraphics.generateTexture('shuttle', 32, 40);
    shuttleGraphics.destroy();

    // Create shuttle with landing legs extended
    const shuttleLegsGraphics = this.make.graphics({ x: 0, y: 0 });

    // Same body as above
    shuttleLegsGraphics.fillStyle(0xE8E8E8);
    shuttleLegsGraphics.fillRect(8, 8, 16, 28);

    shuttleLegsGraphics.fillStyle(0x333333);
    shuttleLegsGraphics.fillTriangle(16, 0, 8, 10, 24, 10);

    shuttleLegsGraphics.fillStyle(0x4488FF);
    shuttleLegsGraphics.fillRect(12, 10, 8, 6);
    shuttleLegsGraphics.fillStyle(0x66AAFF);
    shuttleLegsGraphics.fillRect(13, 11, 6, 4);

    shuttleLegsGraphics.fillStyle(0xCCCCCC);
    shuttleLegsGraphics.fillTriangle(8, 20, 0, 34, 8, 34);
    shuttleLegsGraphics.fillTriangle(24, 20, 32, 34, 24, 34);

    shuttleLegsGraphics.fillStyle(0xCC0000);
    shuttleLegsGraphics.fillRect(9, 16, 14, 3);

    shuttleLegsGraphics.fillStyle(0x666666);
    shuttleLegsGraphics.fillRect(10, 32, 12, 6);

    shuttleLegsGraphics.fillStyle(0x444444);
    shuttleLegsGraphics.fillCircle(13, 36, 3);
    shuttleLegsGraphics.fillCircle(19, 36, 3);

    shuttleLegsGraphics.lineStyle(1, 0x0000AA);
    shuttleLegsGraphics.lineBetween(2, 32, 8, 24);
    shuttleLegsGraphics.lineBetween(30, 32, 24, 24);

    // Landing legs extended
    shuttleLegsGraphics.lineStyle(3, 0x888888);
    shuttleLegsGraphics.lineBetween(10, 34, 4, 46); // Left leg
    shuttleLegsGraphics.lineBetween(22, 34, 28, 46); // Right leg

    // Leg feet/pads
    shuttleLegsGraphics.fillStyle(0x666666);
    shuttleLegsGraphics.fillRect(2, 44, 6, 4); // Left foot
    shuttleLegsGraphics.fillRect(26, 44, 6, 4); // Right foot

    shuttleLegsGraphics.generateTexture('shuttle-legs', 32, 48);
    shuttleLegsGraphics.destroy();

    // Create particle texture
    const particleGraphics = this.make.graphics({ x: 0, y: 0 });
    particleGraphics.fillStyle(0xffffff);
    particleGraphics.fillCircle(8, 8, 8);
    particleGraphics.generateTexture('particle', 16, 16);
    particleGraphics.destroy();

    // Create raindrop texture for particle emitter (2x16 white line)
    const raindropGraphics = this.make.graphics({ x: 0, y: 0 });
    raindropGraphics.fillStyle(0x8899AA, 0.7);
    raindropGraphics.fillRect(0, 0, 2, 16);
    raindropGraphics.generateTexture('raindrop', 2, 16);
    raindropGraphics.destroy();

    // Create streak texture for speed trails (thin elongated shape)
    const streakGraphics = this.make.graphics({ x: 0, y: 0 });
    streakGraphics.fillStyle(0xffffff, 1);
    streakGraphics.fillRect(0, 0, 3, 20); // Thin and long
    streakGraphics.generateTexture('streak', 3, 20);
    streakGraphics.destroy();

    // Create soft smoke puff texture (radial gradient effect)
    const smokeGraphics = this.make.graphics({ x: 0, y: 0 });
    const smokeSize = 32;
    const center = smokeSize / 2;
    // Create layered circles for soft edge effect - more opaque for visibility
    for (let r = center; r > 0; r -= 2) {
      const alpha = (r / center) * 0.8; // More opaque (was 0.4)
      smokeGraphics.fillStyle(0xcccccc, alpha); // Light gray
      smokeGraphics.fillCircle(center, center, r);
    }
    smokeGraphics.generateTexture('smoke', smokeSize, smokeSize);
    smokeGraphics.destroy();

    // Create splash particle texture (small circle)
    const splashGraphics = this.make.graphics({ x: 0, y: 0 });
    splashGraphics.fillStyle(0xAABBCC, 0.8);
    splashGraphics.fillCircle(3, 3, 3);
    splashGraphics.generateTexture('splash', 6, 6);
    splashGraphics.destroy();

    // Create cannon texture
    const cannonGraphics = this.make.graphics({ x: 0, y: 0 });
    cannonGraphics.fillStyle(0xff0000);
    cannonGraphics.fillRect(0, 8, 24, 16);
    cannonGraphics.fillCircle(12, 16, 12);
    cannonGraphics.generateTexture('cannon', 32, 32);
    cannonGraphics.destroy();

    // Create projectile texture
    const projectileGraphics = this.make.graphics({ x: 0, y: 0 });
    projectileGraphics.fillStyle(0xff0000);
    projectileGraphics.fillCircle(6, 6, 6);
    projectileGraphics.generateTexture('projectile', 12, 12);
    projectileGraphics.destroy();

  }
}
