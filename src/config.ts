import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY, COLORS } from './constants';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { TradingScene } from './scenes/TradingScene';
import { GameOverScene } from './scenes/GameOverScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: COLORS.BACKGROUND,
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: GRAVITY },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, TradingScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
