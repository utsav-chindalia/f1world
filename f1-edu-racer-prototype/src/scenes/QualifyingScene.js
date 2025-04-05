import Phaser from 'phaser';

export default class QualifyingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QualifyingScene' });
    
    // Track properties
    this.trackConfig = {
      width: 1920 * 2,  // Wide track for proper F1 circuit
      height: 1080 * 2,
      checkpoints: [],
      surfaces: {
        track: { grip: 1.0, drag: 0.98 },
        grass: { grip: 0.3, drag: 0.95 },
        gravel: { grip: 0.2, drag: 0.90 }
      }
    };

    // Car properties
    this.carConfig = {
      // Speed properties
      maxSpeed: 600,
      acceleration: 15,
      brakeForce: 25,
      maxReverseSpeed: 600,  // Maximum reverse speed
      reverseAcceleration: 15, // Acceleration when in reverse
      
      // Handling properties
      turnRate: 0.100,
      baseGrip: 0.8,
      dragBase: 0.99,
      scale: 0.15,
      
      // Advanced physics
      engineBraking: 0.98,    // Reduced engine braking
      lateralFriction: 0.98,  // Reduced lateral friction loss
      cornerGripLoss: 0.1,    // Reduced corner grip loss
      speedTurnRatio: 0.2,    // Better turning at speed
      
      // DRS
      drsMultiplier: 1.3,
      drsActive: false,
      
      // Tire properties
      tireGrip: 1.0,
      // tireWear: 0.0001,
      tireWear: 0,
      tireOptimalTemp: 90,
      tireTemp: 50,
      // tireTempChange: 0.01
      tireTempChange: 0
    };

    // Track surface properties
    this.trackConfig.surfaces = {
      track: { 
        grip: 1.0, 
        drag: 0.98,
        tireTempMultiplier: 1.0
      },
      grass: { 
        grip: 0.3, 
        drag: 0.95,
        tireTempMultiplier: 0.7
      },
      gravel: { 
        grip: 0.2, 
        drag: 0.90,
        tireTempMultiplier: 0.5
      }
    };

    // Camera properties
    this.cameraConfig = {
      lerp: 0.3,
      zoom: 1.0,  // Reduced zoom to see more of the track
      bounds: true,
      offset: {
        distance: 150,  // Reduced distance for better visibility
        y: 100        // Offset in Y direction to see ahead
      }
    };

    // Race properties
    this.raceData = {
      currentLap: 0,
      totalLaps: 3,
      lapTimes: [],
      bestLapTime: null,
      raceStartTime: 0,
      lastCheckpointTime: 0,
      checkpointsPassed: new Set()
    };

    // Track segments for waypoints and AI
    this.trackSegments = [];
    
    // UI elements
    this.ui = {
      lapCounter: null,
      speedometer: null,
      timer: null
    };

    // F1 style colors
    this.f1Colors = {
      red: 0xE10600,
      blue: 0x15151E,
      accent: 0x00D2BE,
      white: 0xFFFFFF
    };
  }

  preload() {
    // Load track assets
    this.load.image('track', '/assets/tracks/f1_circuit.png');
    this.load.image('track_collision', '/assets/tracks/f1_circuit_collision.png');
    this.load.image('car', '/assets/sprites/f1car.png');
    this.load.image('checkpoint', '/assets/sprites/checkpoint.png');
    this.load.image('minimap', '/assets/ui/minimap_frame.png');
    
    // Load surface textures
    this.load.image('grass', '/assets/textures/grass.png');
    this.load.image('gravel', '/assets/textures/gravel.png');
    this.load.image('asphalt', '/assets/textures/asphalt.png');
    
    // Load UI elements
    this.load.image('ui_frame', '/assets/ui/f1_frame.png');
    this.load.spritesheet('ui_icons', '/assets/ui/f1_icons.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    });
  }

  create() {
    // Initialize track
    this.createTrack();
    
    // Initialize car
    this.createCar();
    
    // Setup camera
    this.setupCamera();
    
    // Create UI
    this.createUI();
    
    // Setup input
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Initialize physics
    this.setupPhysics();
    
    // Start race timer
    this.raceData.raceStartTime = this.time.now;
  }

  createTrack() {
    // Create grass background first
    this.grass = this.add.tileSprite(0, 0, this.trackConfig.width, this.trackConfig.height, 'grass');
    this.grass.setOrigin(0, 0);
    
    // Create main track layer (as a single image, not tiled)
    this.track = this.add.image(0, 0, 'track');
    this.track.setOrigin(0, 0);
    // Scale track to match config dimensions
    this.track.setDisplaySize(this.trackConfig.width, this.trackConfig.height);
    
    // Create collision layer (invisible)
    this.trackCollision = this.add.image(0, 0, 'track_collision');
    this.trackCollision.setOrigin(0, 0);
    this.trackCollision.setAlpha(0);
    // Scale collision to match track
    this.trackCollision.setDisplaySize(this.trackConfig.width, this.trackConfig.height);
    
    // Setup track boundaries
    this.physics.world.setBounds(0, 0, this.trackConfig.width, this.trackConfig.height);
    
    // Create checkpoints
    this.createCheckpoints();
  }

  createCheckpoints() {
    // Define checkpoint positions (these would be calculated based on track layout)
    const checkpointPositions = [
      { x: 100, y: 100 },
      { x: 500, y: 300 },
      // Add more checkpoint positions...
    ];
    
    checkpointPositions.forEach((pos, index) => {
      const checkpoint = this.add.sprite(pos.x, pos.y, 'checkpoint');
      checkpoint.setAlpha(0.5);
      checkpoint.index = index;
      this.trackConfig.checkpoints.push(checkpoint);
    });
  }

  createCar() {
    // Create car sprite
    this.car = this.physics.add.sprite(
      this.trackConfig.width / 2,  // Start in middle of track width
      this.trackConfig.height / 2,  // Start in middle of track height
      'car'
    );
    
    // Set car scale
    this.car.setScale(this.carConfig.scale);
    
    // Set car properties
    this.car.setDrag(this.carConfig.dragBase);
    this.car.setAngularDrag(0.9);
    this.car.setMaxVelocity(this.carConfig.maxSpeed);
    
    // Add car data
    this.car.data = {
      speed: 0,
      grip: this.carConfig.baseGrip,
      surface: 'track'
    };

    // Make sure car is visible above other elements
    this.car.setDepth(1);
  }

  setupCamera() {
    // Configure main camera
    this.cameras.main.startFollow(this.car, true, 0.1, 0.1);
    this.cameras.main.setZoom(this.cameraConfig.zoom);
    this.cameras.main.setLerp(this.cameraConfig.lerp);
    
    // Set camera offset to look ahead of the car
    this.cameras.main.setFollowOffset(0, this.cameraConfig.offset.y);
    
    // Set bounds if enabled
    if (this.cameraConfig.bounds) {
      this.cameras.main.setBounds(0, 0, this.trackConfig.width, this.trackConfig.height);
    }
  }

  createUI() {
    // Create UI container that stays fixed on screen
    this.ui.container = this.add.container(0, 0);
    this.ui.container.setScrollFactor(0);
    
    // Add lap counter
    this.ui.lapCounter = this.add.text(20, 20, 'LAP: 1/3', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add speed display
    this.ui.speedometer = this.add.text(20, 60, 'SPEED: 0 KPH', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add timer
    this.ui.timer = this.add.text(20, 100, 'TIME: 00:00.000', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add all UI elements to container
    this.ui.container.add([
      this.ui.lapCounter,
      this.ui.speedometer,
      this.ui.timer
    ]);

    // Make UI elements more visible with background
    const uiBackground = this.add.rectangle(10, 10, 300, 130, 0x000000, 0.5);
    uiBackground.setOrigin(0, 0);
    uiBackground.setScrollFactor(0);
    this.ui.container.add(uiBackground);
    this.ui.container.sendToBack(uiBackground);
  }

  setupPhysics() {
    // For now, we'll skip collision detection to allow free movement
    // We'll add proper track boundaries later
    
    // Setup checkpoint overlap detection
    this.trackConfig.checkpoints.forEach(checkpoint => {
      this.physics.add.overlap(this.car, checkpoint, this.handleCheckpoint, null, this);
    });
  }

  handleCheckpoint(car, checkpoint) {
    // Add checkpoint to passed checkpoints
    this.raceData.checkpointsPassed.add(checkpoint.index);
    
    // Check if lap is completed
    if (checkpoint.index === 0 && 
        this.raceData.checkpointsPassed.size === this.trackConfig.checkpoints.length) {
      this.completeLap();
    }
  }

  completeLap() {
    const lapTime = this.time.now - this.raceData.lastCheckpointTime;
    this.raceData.lapTimes.push(lapTime);
    
    // Update best lap time
    if (!this.raceData.bestLapTime || lapTime < this.raceData.bestLapTime) {
      this.raceData.bestLapTime = lapTime;
    }
    
    // Reset checkpoints and update lap counter
    this.raceData.checkpointsPassed.clear();
    this.raceData.currentLap++;
    this.raceData.lastCheckpointTime = this.time.now;
    
    // Update UI
    this.updateUI();
  }

  updateUI() {
    // Update lap counter
    this.ui.lapCounter.setText(`LAP: ${this.raceData.currentLap}/${this.raceData.totalLaps}`);
    
    // Update speed display with km/h conversion
    const speedKph = Math.round(this.car.data.speed * 3.6); // Convert to KPH
    this.ui.speedometer.setText(`SPEED: ${speedKph} KPH`);
    
    // Update timer
    const currentTime = this.time.now - this.raceData.raceStartTime;
    this.ui.timer.setText(`TIME: ${this.formatTime(currentTime)}`);
    
    // Add tire info (optional)
    if (this.ui.tireInfo) {
      const tempColor = this.getTireTempColor();
      this.ui.tireInfo.setText(`TIRES: ${Math.round(this.carConfig.tireGrip * 100)}% (${Math.round(this.carConfig.tireTemp)}°C)`)
        .setColor(tempColor);
    }
  }

  formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  getTireTempColor() {
    const temp = this.carConfig.tireTemp;
    if (temp < 60) return '#00ffff'; // Cold
    if (temp > 120) return '#ff0000'; // Overheated
    return '#00ff00'; // Optimal
  }

  update(time, delta) {
    // Handle car movement
    this.handleCarMovement(delta);
    
    // Check surface type under car
    this.checkSurface();
    
    // Update UI
    this.updateUI();
  }

  handleCarMovement(delta) {
    // Get current surface properties
    const surface = this.trackConfig.surfaces[this.car.data.surface];
    
    // Update tire temperature
    this.updateTireTemperature(delta, surface);
    
    // Calculate effective grip based on conditions
    const effectiveGrip = this.calculateEffectiveGrip(surface);
    
    // Get current speed
    const currentSpeed = this.car.body.velocity.length();
    
    // Calculate turn rate based on speed
    const speedFactor = 1 - (currentSpeed / this.carConfig.maxSpeed) * this.carConfig.speedTurnRatio;
    const turnRate = this.carConfig.turnRate * speedFactor * effectiveGrip;
    
    // Handle turning with minimal speed loss
    if (this.cursors.left.isDown || this.cursors.right.isDown) {
      if (this.cursors.left.isDown) {
        this.car.rotation -= turnRate;
      } else {
        this.car.rotation += turnRate;
      }
      
      // Minimal speed loss during turns - only apply a very small lateral friction
      if (!this.cursors.up.isDown) {
        // Only apply lateral friction when not accelerating
        this.car.body.velocity.scale(this.carConfig.lateralFriction);
      }
    }
    
    // Handle acceleration
    if (this.cursors.up.isDown) {
      // Apply acceleration with DRS check
      let acceleration = this.carConfig.acceleration * effectiveGrip;
      if (this.carConfig.drsActive) {
        acceleration *= this.carConfig.drsMultiplier;
      }
      
      // Apply acceleration in car's direction
      const angle = this.car.rotation - (Math.PI / 2);
      
      // Maintain most of the speed during turns while accelerating
      const isTurning = this.cursors.left.isDown || this.cursors.right.isDown;
      const turnSpeedRetention = isTurning ? 0.98 : 1.0; // Only 2% speed loss in turns
      
      // Calculate new velocity components
      const newVelocityX = Math.cos(angle) * (currentSpeed + acceleration) * turnSpeedRetention;
      const newVelocityY = Math.sin(angle) * (currentSpeed + acceleration) * turnSpeedRetention;
      
      // Apply new velocity with momentum preservation
      this.car.body.velocity.x = newVelocityX;
      this.car.body.velocity.y = newVelocityY;
      
    } else if (this.cursors.down.isDown) {
      const angle = this.car.rotation - (Math.PI / 2);
      
      if (currentSpeed > 0) {
        // If moving forward, apply brakes
        const brakeForce = this.carConfig.brakeForce * effectiveGrip;
        const newSpeed = Math.max(0, currentSpeed - brakeForce);
        this.car.body.velocity.x = Math.cos(angle) * newSpeed;
        this.car.body.velocity.y = Math.sin(angle) * newSpeed;
      } else {
        // Apply reverse acceleration
        const reverseAcceleration = this.carConfig.reverseAcceleration * effectiveGrip;
        
        // Calculate new reverse speed
        const currentReverseSpeed = Math.abs(this.car.body.velocity.length());
        const newReverseSpeed = Math.min(
          this.carConfig.maxReverseSpeed,
          currentReverseSpeed + reverseAcceleration
        );
        
        // Apply reverse velocity directly
        this.car.body.velocity.x = -Math.cos(angle) * newReverseSpeed;
        this.car.body.velocity.y = -Math.sin(angle) * newReverseSpeed;
      }
    } else {
      // Very gentle engine braking when no input
      this.car.body.velocity.scale(this.carConfig.engineBraking);
    }
    
    // Enforce max speed
    if (currentSpeed > this.carConfig.maxSpeed) {
      this.car.body.velocity.scale(this.carConfig.maxSpeed / currentSpeed);
    }
    
    // Apply surface and tire wear effects
    this.applyTireWear(delta);
    
    // Update car data
    this.car.data.speed = currentSpeed;
    this.car.data.grip = effectiveGrip;
  }

  calculateEffectiveGrip(surface) {
    // Base grip calculation
    let grip = this.carConfig.baseGrip * surface.grip;
    
    // Adjust for tire temperature
    const tempDiff = Math.abs(this.carConfig.tireTemp - this.carConfig.tireOptimalTemp);
    const tempFactor = Math.max(0.5, 1 - (tempDiff / 100));
    grip *= tempFactor;
    
    // Adjust for tire wear
    grip *= this.carConfig.tireGrip;
    
    // Adjust for cornering
    if (this.cursors.left.isDown || this.cursors.right.isDown) {
      grip *= (1 - this.carConfig.cornerGripLoss);
    }
    
    return grip;
  }

  updateTireTemperature(delta, surface) {
    // Temperature changes based on speed and surface
    const speed = this.car.body.velocity.length();
    const speedFactor = speed / this.carConfig.maxSpeed;
    
    // Heat up tires when moving
    if (speed > 0) {
      this.carConfig.tireTemp += 
        this.carConfig.tireTempChange * 
        speedFactor * 
        surface.tireTempMultiplier * 
        delta;
    } else {
      // Cool down when stationary
      this.carConfig.tireTemp -= this.carConfig.tireTempChange * delta;
    }
    
    // Clamp temperature
    this.carConfig.tireTemp = Phaser.Math.Clamp(this.carConfig.tireTemp, 0, 150);
  }

  applyTireWear(delta) {
    // Wear increases with speed and cornering
    const speed = this.car.body.velocity.length();
    const speedFactor = speed / this.carConfig.maxSpeed;
    let wear = this.carConfig.tireWear * speedFactor * delta;
    
    // Extra wear when cornering
    if (this.cursors.left.isDown || this.cursors.right.isDown) {
      wear *= 2;
    }
    
    // Apply wear
    this.carConfig.tireGrip = Math.max(0.3, this.carConfig.tireGrip - wear);
  }

  checkSurface() {
    // This would use the collision map to determine what surface the car is on
    // For now, we'll just use track as default
    this.car.data.surface = 'track';
  }

  shutdown() {
    // Cleanup
    this.grass.destroy();
    this.track.destroy();
    this.trackCollision.destroy();
    this.car.destroy();
    this.ui.container.destroy();
    
    // Clear arrays
    this.trackConfig.checkpoints = [];
    this.trackSegments = [];
    this.raceData.lapTimes = [];
    this.raceData.checkpointsPassed.clear();
  }
} 