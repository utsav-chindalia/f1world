import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.lights = [];
    this.reactionStartTime = 0;
    this.isGreenLight = false;
    this.hasReacted = false;
    this.carSpeed = 0;
    this.maxSpeed = 400;
    this.acceleration = 10;
    this.gridPositions = [];  // Array to store grid positions
    this.bestScore = localStorage.getItem('bestScore') ? parseFloat(localStorage.getItem('bestScore')) : null;
    this.jumpStarts = parseInt(localStorage.getItem('jumpStarts') || '0');
    this.isFirstVisit = !localStorage.getItem('hasVisitedBefore');
    this.showingOverlay = this.isFirstVisit; // Only show overlay on first visit
    this.isCountingDown = false; // Add flag for countdown state
    
    // Track dimensions
    this.trackWidth = 800;
    this.gridSlotWidth = 150;  // Swapped width and height for vertical orientation
    this.gridSlotHeight = 30;
    this.bracketWidth = 120;  // Width of the bracket arms
    this.bracketThickness = 4;  // Thickness of the bracket lines
    
    // F1 colors
    this.f1Red = 0xE10600;
    this.f1Blue = 0x15151E;
    this.f1Accent = 0x00D2BE;
  }

  preload() {
    this.load.image('car', '/assets/sprites/f1car.png');
    this.load.image('road_texture', '/assets/textures/asphalt.png');
    // Add more assets for modern UI
    this.load.image('f1_logo', '/assets/ui/f1_logo.png');
  }

  create() {
    const { width, height } = this.scale;

    // Create the overlay only on first visit
    this.isFirstVisit = !localStorage.getItem('hasVisitedBefore');
    if (this.isFirstVisit) {
      this.createOverlay();
      localStorage.setItem('hasVisitedBefore', 'true');
    } else {
      this.showingOverlay = false;
    }

    // Reset game state
    this.lights = [];
    this.reactionStartTime = 0;
    this.isGreenLight = false;
    this.hasReacted = false;
    this.carSpeed = 0;
    this.maxSpeed = 400;
    this.acceleration = 10;
    this.isCountingDown = false; // Reset the countdown flag

    // Create modern F1 UI frame
    this.createF1UIFrame();

    // Create track layout first to set up grid positions
    this.createTrackLayout();
    
    // Create level headings with F1 styling
    this.createLevelHeadings();
    
    // Create help button on the right side
    this.createHelpButton();

    // Create F1-style start lights
    this.createStartLights();
    
    // Create car sprite on the bottom grid position
    const startPosition = this.gridPositions[0]; // Use first grid position
    this.car = this.add.sprite(startPosition.x, startPosition.y, 'car');
    this.car.setScale(0.3);
    
    // Add physics and adjust the physics body size
    this.physics.add.existing(this.car);
    this.car.body.setCollideWorldBounds(true);
    const bodyWidth = this.car.width * 0.6;
    const bodyHeight = this.car.height * 0.6;
    this.car.body.setSize(bodyWidth, bodyHeight, true);
    
    // Start the light sequence
    this.startLightSequence();

    // Add keyboard input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add reaction timer text with F1 styling
    this.timerText = this.add.text(width / 2, height / 3, '', {
      fontSize: '32px',
      fontFamily: 'Titillium Web',
      fontWeight: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Add score display on the right side with F1 styling
    const rightBoundaryX = width / 2 + this.trackWidth / 2;
    this.scoreDisplay = this.add.text(rightBoundaryX + 20, height / 2, '', {
      fontSize: '22px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      align: 'left'
    }).setOrigin(0, 0.5);

    // Update score display
    this.updateScoreDisplay();
  }

  createTrackLayout() {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();
    this.gridPositions = [];  // Reset grid positions

    // Create road background with texture and modern F1 track look
    const roadBackground = this.add.tileSprite(
      width / 2,
      height / 2,
      this.trackWidth - 100, // Slightly narrower than track to account for boundaries
      height,
      'road_texture'
    );
    roadBackground.setTint(0xCCCCCC); // Slightly bluish tint for modern look
    roadBackground.setDepth(0); // Set lowest depth for background

    // Draw track boundaries (modern F1 red and white kerbs)
    const boundaries = this.add.graphics();
    boundaries.setDepth(2); // Above lane markings
    const stripeWidth = 40;
    const stripeCount = Math.ceil(height / (stripeWidth * 2));
    
    // Left boundary - F1 style kerbs
    for (let i = 0; i < stripeCount; i++) {
      boundaries.fillStyle(i % 2 === 0 ? this.f1Red : 0xffffff);
      boundaries.fillRect(
        width / 2 - this.trackWidth / 2,
        i * stripeWidth * 2,
        stripeWidth,
        stripeWidth * 2
      );
    }
    
    // Right boundary - F1 style kerbs
    for (let i = 0; i < stripeCount; i++) {
      boundaries.fillStyle(i % 2 === 0 ? this.f1Red : 0xffffff);
      boundaries.fillRect(
        width / 2 + this.trackWidth / 2 - stripeWidth,
        i * stripeWidth * 2,
        stripeWidth,
        stripeWidth * 2
      );
    }

    // Draw grid slots with brackets - modern F1 pit style
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(this.bracketThickness, 0x00D2BE, 1); // F1 accent color for grid
    
    // Create grid slots
    const totalSlots = 1;
    const startY = height * 0.6;  // Start from bottom of screen
    const slotSpacing = this.gridSlotHeight * 10;  // Add some space between slots
    
    for (let i = 0; i < totalSlots; i++) {
      const x = width / 2 - this.gridSlotWidth;  // Center horizontally
      const y = startY - (i * slotSpacing);  // Stack vertically from bottom up
      
      // Store grid position
      this.gridPositions.push({ x: x - this.gridSlotWidth/2 + 60, y: y + 50});

      // Left bracket - with F1 branding
      gridGraphics.beginPath();
      gridGraphics.moveTo(x - this.gridSlotWidth/2, y - this.gridSlotHeight/2);
      gridGraphics.lineTo(x - this.gridSlotWidth/2 + this.bracketWidth, y - this.gridSlotHeight/2);
      gridGraphics.moveTo(x - this.gridSlotWidth/2, y - this.gridSlotHeight/2);
      gridGraphics.lineTo(x - this.gridSlotWidth/2, y + this.gridSlotHeight/2);
      gridGraphics.moveTo(x - this.gridSlotWidth/2 + this.bracketWidth, y - this.gridSlotHeight/2);
      gridGraphics.lineTo(x - this.gridSlotWidth/2 + this.bracketWidth, y + this.gridSlotHeight/2);
      gridGraphics.strokePath();

      // Right bracket - with F1 branding
      gridGraphics.beginPath();
      gridGraphics.moveTo(x + this.gridSlotWidth * 2, y - this.gridSlotHeight/2 + 50);
      gridGraphics.lineTo(x + this.gridSlotWidth * 2 + this.bracketWidth, y - this.gridSlotHeight/2 + 50);
      gridGraphics.moveTo(x + this.gridSlotWidth * 2, y - this.gridSlotHeight/2 + 50);
      gridGraphics.lineTo(x + this.gridSlotWidth * 2, y + this.gridSlotHeight/2 + 50);
      gridGraphics.moveTo(x + this.gridSlotWidth * 2 + this.bracketWidth, y - this.gridSlotHeight/2 + 50);
      gridGraphics.lineTo(x + this.gridSlotWidth * 2 + this.bracketWidth, y + this.gridSlotHeight/2 + 50);
      gridGraphics.strokePath();
    }

    // Draw finish line (checkered pattern) - F1 style
    const finishLine = this.add.graphics();
    // finishLine.setDepth(2); // Above road texture but below grid
    
    const checkerSize = 25; // Made slightly larger for better visibility
    const checkerRows = Math.ceil((this.trackWidth - (stripeWidth * 2)) / checkerSize);
    const finishLineY = height * 0.1; // Position of finish line
    const finishLineHeight = checkerSize * 2; // Height of the finish line
    
    // Add a white glow/outline around the finish line
    finishLine.lineStyle(2, 0xFFFFFF, 0.7);
    finishLine.strokeRect(
      width / 2 - (this.trackWidth - stripeWidth * 2) / 2,
      finishLineY - 2,
      (this.trackWidth - stripeWidth * 2),
      finishLineHeight + 4
    );

    // Draw the checkered pattern
    for (let i = 0; i < checkerRows; i++) {
      for (let j = 0; j < 2; j++) {
        finishLine.fillStyle((i + j) % 2 === 0 ? 0x000000 : 0xFFFFFF);
        finishLine.fillRect(
          width / 2 - (this.trackWidth - stripeWidth * 2) / 2 + i * checkerSize,
          finishLineY + j * checkerSize,
          checkerSize,
          checkerSize
        );
      }
    }
  }

  createHelpButton() {
    const { width, height } = this.scale;
    const rightBoundaryX = width / 2 + this.trackWidth / 2;
    
    // Create modern F1 style help button
    const buttonWidth = 40;
    const buttonHeight = 40;
    const buttonX = rightBoundaryX + 20;
    const buttonY = height * 0.2;

    // Create button background
    const buttonBackground = this.add.graphics();
    buttonBackground.fillStyle(this.f1Blue, 0.8);
    buttonBackground.fillCircle(buttonX + buttonWidth/2, buttonY, buttonWidth/2);
    buttonBackground.lineStyle(2, 0x00D2BE);
    buttonBackground.strokeCircle(buttonX + buttonWidth/2, buttonY, buttonWidth/2);
    buttonBackground.setInteractive(new Phaser.Geom.Circle(buttonX + buttonWidth/2, buttonY, buttonWidth/2), Phaser.Geom.Circle.Contains);

    // Add question mark text
    const questionMark = this.add.text(buttonX + buttonWidth/2, buttonY, '?', {
      fontSize: '26px',
      fontFamily: 'Titillium Web',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Add hover effect
    buttonBackground.on('pointerover', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(this.f1Blue, 0.9);
      buttonBackground.fillCircle(buttonX + buttonWidth/2, buttonY, buttonWidth/2);
      buttonBackground.lineStyle(2, this.f1Red);
      buttonBackground.strokeCircle(buttonX + buttonWidth/2, buttonY, buttonWidth/2);
    });

    buttonBackground.on('pointerout', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(this.f1Blue, 0.8);
      buttonBackground.fillCircle(buttonX + buttonWidth/2, buttonY, buttonWidth/2);
      buttonBackground.lineStyle(2, 0x00D2BE);
      buttonBackground.strokeCircle(buttonX + buttonWidth/2, buttonY, buttonWidth/2);
    });

    // Add click handler
    buttonBackground.on('pointerdown', () => {
      if (!this.showingOverlay) {
        this.createOverlay();
      }
    });
  }

  createOverlay() {
    const { width, height } = this.scale;
    
    // Create semi-transparent background with F1 style
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x15151E, 0.9);
    this.overlay.fillRect(0, 0, width, height);
    
    // Add F1 red accent line
    this.overlay.fillStyle(this.f1Red, 1);
    this.overlay.fillRect(width * 0.1, height * 0.2, width * 0.8, 4);
    
    this.overlay.setDepth(100);
    
    // Make overlay interactive with a proper hit area
    this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    // Create information text with F1 styling
    // const titleText = this.add.text(width / 2, height * 0.15, 'F1 REACTION TRAINING', {
    //   fontSize: '32px',
    //   fontFamily: 'Titillium Web',
    //   fontWeight: 'bold',
    //   color: '#ffffff',
    //   align: 'center'
    // }).setOrigin(0.5).setDepth(101);
    
    const infoText = [
      '🏎️ PERFECT YOUR RACE START 🏎️',
      '',
      'OBJECTIVE:',
      '• Wait for all 5 lights to turn on',
      '• When lights turn GREEN, press UP ARROW immediately',
      '• Aim for reaction time under 0.2 seconds',
      '',
      'RULES:',
      '• Early start = Jump Start Penalty',
      '• Best reaction times are saved',
      '• F1 drivers average 0.2-0.3s reaction times',
      '',
      'CONTROLS:',
      '• UP ARROW: Launch car / Accelerate',
      '',
      'CLICK ANYWHERE OR PRESS SPACE TO CONTINUE',
      '',
      'Auto restart after 3 seconds'
    ].join('\n');

    const info = this.add.text(width / 2, height * 0.45, infoText, {
      fontSize: '22px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(101);

    // Add click and space key to dismiss overlay
    const dismissOverlay = () => {
      this.overlay.destroy();
      info.destroy();
      // titleText.destroy();
      this.showingOverlay = false;
      if (this.isFirstVisit) {
        this.startLightSequence(); // Only start the sequence after first visit overlay is dismissed
      }
    };

    this.overlay.on('pointerdown', dismissOverlay);
    this.input.keyboard.once('keydown-SPACE', dismissOverlay);
  }

  startLightSequence() {
    // Don't start if overlay is showing
    if (this.showingOverlay) return;
    
    let delay = 0;
    
    // Create F1 style light animation
    // Animation sequence is now more realistic to F1
    this.lights.forEach((light, index) => {
      this.time.delayedCall(delay, () => {
        light.setFillStyle(0xFF0000);
        
        // Add a quick fade-in effect
        this.tweens.add({
          targets: light,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 150,
          yoyo: true,
          ease: 'Cubic.easeOut'
        });
      });
      delay += 800; // Closer to real F1 timing
    });

    // Random delay before lights out (0.5-2 seconds)
    const greenDelay = delay + Phaser.Math.Between(500, 2000);
    
    this.time.delayedCall(greenDelay, () => {
      // Lights turn green instead of going out
      this.lights.forEach(light => {
        light.setFillStyle(0x00FF00);
        
        // Add bright flash effect
        this.tweens.add({
          targets: light,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 100,
          yoyo: true,
          ease: 'Cubic.easeOut'
        });
      });
      this.isGreenLight = true;
      this.reactionStartTime = this.time.now;
    });
  }

  updateScoreDisplay() {
    // Modern F1 style score display
    let scoreText = 'SESSION DATA\n\n';
    
    if (this.bestScore !== null) {
      scoreText += `BEST TIME: ${this.bestScore.toFixed(3)}s\n`;
    }
    
    if (this.hasReacted && this.timerText.text.includes('Reaction Time')) {
      const currentScore = parseFloat(this.timerText.text.split(': ')[1]);
      scoreText += `CURRENT: ${currentScore.toFixed(3)}s\n`;
    }
    
    scoreText += `\nJUMP STARTS: ${this.jumpStarts}`;
    
    // Add F1 driver comparison if there's a best score
    if (this.bestScore !== null) {
      if (this.bestScore < 0.2) {
        scoreText += '\n\nFASTER THAN MOST F1 DRIVERS!';
      } else if (this.bestScore < 0.3) {
        scoreText += '\n\nF1 DRIVER LEVEL REACTION!';
      } else if (this.bestScore < 0.5) {
        scoreText += '\n\nGOOD! KEEP PRACTICING!';
      }
    }
    
    this.scoreDisplay.setText(scoreText);
  }

  update() {
    // Don't process game logic if overlay is showing
    if (this.showingOverlay) return;

    // Handle jump start before green light
    if (!this.isGreenLight && !this.hasReacted && this.cursors.up.isDown) {
      this.hasReacted = true;
      this.timerText.setText('JUMP START PENALTY!');
      this.timerText.setColor('#E10600'); // F1 red
      
      // Increment jump starts counter and save to localStorage
      this.jumpStarts++;
      localStorage.setItem('jumpStarts', this.jumpStarts.toString());
      
      this.updateScoreDisplay();
      
      // Auto restart after a short delay
      this.time.delayedCall(1500, () => {
        this.scene.restart();
      });
      return;
    }

    // Handle reaction input
    if (this.isGreenLight && !this.hasReacted && this.cursors.up.isDown) {
      this.hasReacted = true;
      const reactionTime = (this.time.now - this.reactionStartTime) / 1000;
      // Valid start
      this.timerText.setText(`Reaction Time: ${reactionTime.toFixed(3)}s`);
      
      // Color based on performance - F1 style
      if (reactionTime < 0.2) {
        this.timerText.setColor('#00D2BE'); // F1 accent teal for excellent
      } else if (reactionTime < 0.3) {
        this.timerText.setColor('#00FF00'); // Green for good
      } else if (reactionTime < 0.5) {
        this.timerText.setColor('#FFFF00'); // Yellow for average
      } else {
        this.timerText.setColor('#FFFFFF'); // White for below average
      }

      // Update best score if needed
      if (this.bestScore === null || reactionTime < this.bestScore) {
        this.bestScore = reactionTime;
        localStorage.setItem('bestScore', reactionTime.toString());
      }
      this.updateScoreDisplay();
    }

    // Handle car movement after valid reaction
    if (this.hasReacted && this.timerText.text.includes('Reaction Time')) {
      if (this.cursors.up.isDown && this.carSpeed < this.maxSpeed) {
        this.carSpeed += this.acceleration;
      } else if (this.carSpeed > 0) {
        this.carSpeed -= this.acceleration / 2;
      }
      
      this.car.body.setVelocityY(-this.carSpeed);

      // Check if car has moved significantly up the screen
      if (this.car.y < this.scale.height * 0.3 && !this.isCountingDown) {
        this.isCountingDown = true; // Set the countdown flag
        this.car.body.setVelocityY(0); // Stop the car
        
        // Add a 3 second timer before restarting
        const countdownText = this.add.text(this.scale.width / 2, this.scale.height / 2, '3', {
          fontSize: '64px',
          fontFamily: 'Titillium Web',
          fontWeight: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        let countdown = 3;
        const timer = this.time.addEvent({
          delay: 1000,
          callback: () => {
            countdown--;
            if (countdown > 0) {
              countdownText.setText(countdown.toString());
            } else {
              countdownText.destroy();
              this.scene.restart();
            }
          },
          repeat: 2
        });
      }
    }
  }

  createLevelHeadings() {
    const { width, height } = this.scale;
    const leftBoundaryX = width / 2 - this.trackWidth / 2 - 20;
    
    // Modern F1 style level selection
    const heading = this.add.text(leftBoundaryX, height * 0.12, 'MODE SELECT', {
      fontSize: '18px',
      fontFamily: 'Titillium Web',
      color: '#777777',
      align: 'right'
    }).setOrigin(1, 0.5);
    
    const levels = [
      { name: 'Race Start', available: true },
      { name: 'First Corner', available: false },
      { name: 'Overtake', available: false },
      { name: 'Qualify', available: false },
      { name: '...', available: false }
    ];

    levels.forEach((level, index) => {
      const yPos = height * 0.2 + (index * 60);
      
      // Box background for levels - F1 style menu
      const bgColor = level.available ? 0x222233 : 0x1A1A22;
      const boxGraphics = this.add.graphics();
      boxGraphics.fillStyle(bgColor, 0.8);
      boxGraphics.fillRoundedRect(leftBoundaryX - 180, yPos - 20, 180, 40, 5);
      
      if (level.available) {
        boxGraphics.lineStyle(2, this.f1Accent);
        boxGraphics.strokeRoundedRect(leftBoundaryX - 180, yPos - 20, 180, 40, 5);
      }
      
      // Add level name
      const levelText = this.add.text(leftBoundaryX - 10, yPos, level.name, {
        fontSize: '20px',
        fontFamily: 'Titillium Web',
        fontWeight: 'bold',
        color: level.available ? '#ffffff' : '#555555',
        align: 'right'
      }).setOrigin(1, 0.5);

      // Add status indicator - F1 style
      if (level.available) {
        const statusDot = this.add.circle(leftBoundaryX - 170, yPos, 6, this.f1Accent);
        
        // Add small animation to active dot
        this.tweens.add({
          targets: statusDot,
          alpha: 0.5,
          duration: 1000,
          yoyo: true,
          repeat: -1
        });
      } else {
        const lockIcon = this.add.text(leftBoundaryX - 170, yPos, '🔒', {
          fontSize: '16px'
        }).setOrigin(0.5);
      }
    });
  }

  createStartLights() {
    const { width, height } = this.scale;
    
    // Create F1-style light housing
    const lightHousing = this.add.graphics();
    lightHousing.fillStyle(0x222222, 1);
    lightHousing.fillRoundedRect(width / 2 - 150, height / 4 - 25, 300, 50, 8);
    lightHousing.lineStyle(3, 0x444444, 1);
    lightHousing.strokeRoundedRect(width / 2 - 150, height / 4 - 25, 300, 50, 8);
    
    // Create lights with more F1 style
    for (let i = 0; i < 5; i++) {
      // Light housing for each light
      const lightBg = this.add.circle(
        width / 2 - 100 + i * 50,
        height / 4,
        18,
        0x111111
      );
      
      // Actual light
      const light = this.add.circle(
        width / 2 - 100 + i * 50,
        height / 4,
        15,
        0x333333
      );
      
      this.lights.push(light);
    }
  }
  
  createF1UIFrame() {
    const { width, height } = this.scale;
    
    // Create modern F1 top bar
    const topBar = this.add.graphics();
    topBar.fillStyle(this.f1Blue, 0.9);
    topBar.fillRect(0, 0, width, 60);
    
    // Add F1 red accent line under top bar
    const redAccent = this.add.graphics();
    redAccent.fillStyle(this.f1Red, 1);
    redAccent.fillRect(0, 60, width, 4);
    
    // Add title to top bar
    this.add.text(width / 2, 30, 'F1 REACTION TRAINER', {
      fontSize: '24px',
      fontFamily: 'Titillium Web',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
  }
} 