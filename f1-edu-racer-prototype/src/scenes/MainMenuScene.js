import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  preload() {
    // Preload F1 logo or additional assets if needed
    this.load.image('f1_logo', '/assets/ui/f1_logo.png');
  }

  create() {
    const { width, height } = this.scale;
    
    // Create background with F1 style gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x15151E, 0x15151E, 0x1A1A2F, 0x1A1A2F, 1);
    bg.fillRect(0, 0, width, height);
    
    // Add a sleek red line - F1 brand identity
    const redLine = this.add.graphics();
    redLine.fillStyle(0xE10600, 1);
    redLine.fillRect(width * 0.1, height * 0.15, width * 0.8, 4);

    // Title with F1 style typography
    const titleText = this.add.text(width / 2, height / 5, 'F1 World', {
      fontSize: '54px',
      fontFamily: 'Titillium Web',
      fontWeight: 'bold',
      color: '#ffffff',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    
    // Add shadow to title for depth
    titleText.setShadow(2, 2, 'rgba(0,0,0,0.5)', 3);
    
    // Subtitle
    this.add.text(width / 2, height / 5 + 60, 'REACTION TRAINING', {
      fontSize: '24px',
      fontFamily: 'Titillium Web',
      color: '#00D2BE',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    // Modern button style
    const buttonStyle = {
      fontSize: '20px',
      fontFamily: 'Titillium Web',
      fontWeight: 'bold',
      color: '#ffffff',
      align: 'center'
    };

    // Create a container for buttons
    const buttonContainer = this.add.container(width / 2, height / 2);
    
    // Start Race button with F1 styling
    const startButtonBg = this.add.graphics();
    startButtonBg.fillStyle(0xE10600, 1);
    startButtonBg.fillRoundedRect(-120, -25, 240, 50, 5);

        this.scene.start('GameScene');
    
    const startButton = this.add.text(0, 0, 'START RACE', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        startButtonBg.clear();
        startButtonBg.fillStyle(0xFF1A14, 1);
        startButtonBg.fillRoundedRect(-120, -25, 240, 50, 5);
      })
      .on('pointerout', () => {
        startButtonBg.clear();
        startButtonBg.fillStyle(0xE10600, 1);
        startButtonBg.fillRoundedRect(-120, -25, 240, 50, 5);
      })
      .on('pointerdown', () => {
        this.scene.start('GameScene');
      });
      
    buttonContainer.add([startButtonBg, startButton]);

    // Disabled buttons with F1 styling
    const createDisabledButton = (y, text) => {
      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(0x2F2F3F, 1);
      buttonBg.fillRoundedRect(-120, y - 25, 240, 50, 5);
      
      const buttonText = this.add.text(0, y, text, {
        ...buttonStyle,
        color: '#777777'
      }).setOrigin(0.5);
      
      buttonContainer.add([buttonBg, buttonText]);
      
      // Add lock icon
      const lockIcon = this.add.text(100, y, '🔒', { fontSize: '16px' }).setOrigin(0.5);
      buttonContainer.add(lockIcon);
    };

    createDisabledButton(60, 'TUTORIALS');
    createDisabledButton(120, 'GHOST MODE');
    createDisabledButton(180, 'SETTINGS');
    
    // Add F1 style footer text
    this.add.text(width / 2, height - 40, 'F1 EDU-RACER © 2023', {
      fontSize: '16px',
      fontFamily: 'Titillium Web',
      color: '#777777'
    }).setOrigin(0.5);
  }
} 