import './style.css';
import Phaser from 'phaser';
import MainMenuScene from './scenes/MainMenuScene';
import GameScene from './scenes/GameScene';
import QualifyingScene from './scenes/QualifyingScene';
import PlayerNameScene from './scenes/PlayerNameScene';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#15151E',
  dom: {
    createContainer: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MainMenuScene, PlayerNameScene, GameScene, QualifyingScene],
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
      game.scene.start('PlayerNameScene');
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