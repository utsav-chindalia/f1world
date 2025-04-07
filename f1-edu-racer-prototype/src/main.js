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

// Function to handle scene routing based on URL path
const handleSceneRouting = () => {
  const path = window.location.pathname;
  
  switch (path) {
    case '/qualifying':
      game.scene.start('QualifyingScene');
      break;
    default:
      game.scene.start('MainMenuScene');
      break;
  }
};

// Initial routing
handleSceneRouting();

// Handle browser back/forward buttons
window.addEventListener('popstate', handleSceneRouting); 