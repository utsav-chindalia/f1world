import './style.css';
import Phaser from 'phaser';
import MainMenuScene from './scenes/MainMenuScene';
import GameScene from './scenes/GameScene';
import QualifyingScene from './scenes/QualifyingScene';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MainMenuScene, GameScene, QualifyingScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);

// Start with main menu
game.scene.start('MainMenuScene'); 