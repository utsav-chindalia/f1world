import Phaser from 'phaser';

export default class QualifyingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QualifyingScene' });
    
    // Track properties
    this.trackConfig = {
      width: 1920 * 2,  // Wide track for proper F1 circuit
      height: 1080 * 2,
      checkpoints: [],
      startFinishLine: {
        x: 1772,
        y: 1335,
        rotation: 5.5,
        width: 200,
        height: 10
      },
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
      checkpointsPassed: new Set(),
      hasPassedStartLine: false,  // Track if start line was crossed
      currentLapStartTime: 0,     // Track individual lap times
      lapInvalidated: false       // Track if current lap is invalidated
    };

    // Track segments for waypoints and AI
    this.trackSegments = [];
    
    // UI elements
    this.ui = {
      lapCounter: null,
      speedometer: null,
      timer: null,
      lapTime: null,
      bestLap: null,
      notification: null  // Add notification text element
    };

    // F1 style colors
    this.f1Colors = {
      red: 0xE10600,
      blue: 0x15151E,
      accent: 0x00D2BE,
      white: 0xFFFFFF
    };

    // Debug flags
    this.debug = {
      showCarPosition: false, // Toggle for car position logging
      showBoundaries: false  // Toggle for boundary wall visibility
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
    
    // Load track boundaries JSON
    this.load.json('track_boundaries', '/assets/jsons/track_boundaries.json');
  }

  create() {
    // Initialize track
    this.createTrack();
    
    // Initialize car
    this.createCar();
    
    // Create start and finish lines
    this.createStartFinishLines();
    
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
    
    // Create track boundaries
    this.createTrackBoundaries();
    
    // Create checkpoints
    this.createCheckpoints();
  }

  createTrackBoundaries() {
    // Create a group for track boundaries
    this.boundaries = this.add.group();
    
    // Get track boundary data from JSON
    const boundaryData = this.cache.json.get('track_boundaries');
    const boundaryPoints = [boundaryData.outside, boundaryData.inside];

    // Create boundary walls
    boundaryPoints.forEach(points => {
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        
        // Calculate the length and angle of the boundary segment
        const length = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
        const angle = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);
        
        // Create a thinner physics body for the wall
        const wall = this.add.rectangle(
          (start.x + end.x) / 2,
          (start.y + end.y) / 2,
          length,
          70,  // Reduced thickness for more precise collisions
          0xFF0000
        );
        
        // Set the wall's rotation
        wall.setRotation(angle);
        
        // Add physics and make it static
        this.physics.add.existing(wall, true);
        
        // Make the wall a sensor (allows pass-through)
        wall.body.isSensor = true;
        
        // Enable debug visualization of physics body only if debug flag is set
        wall.body.debugShowBody = this.debug.showBoundaries;
        wall.body.debugBodyColor = 0xFF0000;
        
        // Set wall visibility based on debug flag
        wall.setAlpha(this.debug.showBoundaries ? 0.3 : 0);
        
        // Add to boundaries group
        this.boundaries.add(wall);
        
        // Create a visual line (thinner than physics body)
        const line = this.add.line(
          0, 0,
          start.x, start.y,
          end.x, end.y,
          0xFF0000,
          this.debug.showBoundaries ? 0.3 : 0  // Set line alpha based on debug flag
        );
        line.setLineWidth(1);
        line.setOrigin(0, 0);
      }
    });
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

  createStartFinishLines() {
    // Create start/finish line
    this.startFinishLine = this.add.rectangle(
      this.trackConfig.startFinishLine.x,
      this.trackConfig.startFinishLine.y,
      this.trackConfig.startFinishLine.width,
      this.trackConfig.startFinishLine.height,
      0xFFFFFF // White color
    );
    this.startFinishLine.setAngle(this.trackConfig.startFinishLine.rotation * (180/Math.PI));
    this.startFinishLine.setDepth(1);
  }

  createCar() {
    // Create car sprite at start line position
    this.car = this.physics.add.sprite(
      this.trackConfig.startFinishLine.x,
      this.trackConfig.startFinishLine.y,
      'car'
    );
    
    // Set car rotation to match start line
    this.car.setAngle(this.trackConfig.startFinishLine.rotation * (180/Math.PI));
    
    // Set car scale
    this.car.setScale(this.carConfig.scale);
    
    // Set precise physics body size (80% of sprite size for more accurate collisions)
    const carWidth = this.car.width * this.carConfig.scale * 0.8;
    const carHeight = this.car.height * this.carConfig.scale * 0.8;
    this.car.body.setSize(carWidth, carHeight);
    this.car.body.setOffset((this.car.width - carWidth) / 2, (this.car.height - carHeight) / 2);
    
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
    this.ui.lapCounter = this.add.text(20, 20, 'LAP: 0/3', {
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
    this.ui.timer = this.add.text(20, 100, 'TOTAL TIME: 00:00.000', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });

    // Add current lap time
    this.ui.lapTime = this.add.text(20, 140, 'LAP TIME: 00:00.000', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });

    // Add best lap time
    this.ui.bestLap = this.add.text(20, 180, 'BEST LAP: --:--.---', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add notification text
    this.ui.notification = this.add.text(20, 220, '', {
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
      this.ui.timer,
      this.ui.lapTime,
      this.ui.bestLap,
      this.ui.notification
    ]);

    // Make UI elements more visible with background
    const uiBackground = this.add.rectangle(10, 10, 300, 260, 0x000000, 0.5);
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

    // Add physics body to start/finish line
    this.physics.add.existing(this.startFinishLine, true);
    
    // Add start/finish line overlap detection
    this.physics.add.overlap(this.car, this.startFinishLine, this.onStartFinishLineCross, null, this);

    // Add overlap detection between car and track boundaries
    this.physics.add.overlap(this.car, this.boundaries, this.handleBoundaryCollision, null, this);
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
    this.ui.timer.setText(`TOTAL TIME: ${this.formatTime(currentTime)}`);
    
    // Update current lap time if race has started
    if (this.raceData.currentLap > 0) {
      const currentLapTime = this.time.now - this.raceData.currentLapStartTime;
      this.ui.lapTime.setText(`LAP TIME: ${this.formatTime(currentLapTime)}`);
      
      // Show best lap time if exists
      if (this.raceData.bestLapTime) {
        this.ui.bestLap.setText(`BEST LAP: ${this.formatTime(this.raceData.bestLapTime)}`);
      }
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

    // Log car position when moving
    if (this.car && this.debug.showCarPosition && (this.cursors.up.isDown || this.cursors.down.isDown || this.cursors.left.isDown || this.cursors.right.isDown)) {
      console.log(`Car Position - X: ${Math.round(this.car.x)}, Y: ${Math.round(this.car.y)}, Rotation: ${Math.round(this.car.angle)}`);
    }
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
      // Apply brakes
      const brakeForce = this.carConfig.brakeForce * effectiveGrip;
      const angle = this.car.rotation - (Math.PI / 2);
      this.car.body.velocity.x = Math.cos(angle) * Math.max(0, currentSpeed - brakeForce);
      this.car.body.velocity.y = Math.sin(angle) * Math.max(0, currentSpeed - brakeForce);
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

  onStartFinishLineCross() {
    const now = this.time.now;

    if (!this.raceData.hasPassedStartLine) {
      // Starting a new lap
      this.raceData.hasPassedStartLine = true;
      this.raceData.currentLapStartTime = now;
      
      // Reset lap invalidation status
      if (this.raceData.lapInvalidated) {
        this.raceData.lapInvalidated = false;
        this.ui.lapTime.setColor('#ffffff'); // Reset color back to white
      }
      
      // If this is the first lap, start the race timer
      if (this.raceData.currentLap === 0) {
        this.raceData.raceStartTime = now;
        this.raceData.currentLap = 1;
        console.log('Race started!');
      }
    } else {
      // Completing a lap
      const lapTime = now - this.raceData.currentLapStartTime;
      
      // Prevent accidental double-counting by checking minimum lap time (e.g., 5 seconds)
      if (lapTime < 5000) {
        return;
      }
      
      // Only count the lap if it wasn't invalidated
      if (!this.raceData.lapInvalidated) {
        this.raceData.lapTimes.push(lapTime);
        
        // Update best lap time
        if (!this.raceData.bestLapTime || lapTime < this.raceData.bestLapTime) {
          this.raceData.bestLapTime = lapTime;
          console.log(`New best lap! ${this.formatTime(lapTime)}`);
        }
        
        console.log(`Lap ${this.raceData.currentLap} completed! Time: ${this.formatTime(lapTime)}`);
      }
      
      // Reset for next lap
      this.raceData.hasPassedStartLine = false;
      this.raceData.currentLap++;
      this.raceData.checkpointsPassed.clear();
      this.raceData.lapInvalidated = false;
      this.ui.lapTime.setColor('#ffffff'); // Reset color back to white
      
      // Check if race is complete
      if (this.raceData.currentLap > this.raceData.totalLaps) {
        this.onRaceComplete();
      }
    }
  }

  onRaceComplete() {
    const totalTime = this.time.now - this.raceData.raceStartTime;
    const bestLap = this.raceData.bestLapTime;
    
    console.log('Race Complete!');
    console.log(`Total Time: ${this.formatTime(totalTime)}`);
    console.log(`Best Lap: ${this.formatTime(bestLap)}`);
    
    // You could add more race completion logic here
    // For example, showing a results screen or returning to menu
  }

  handleBoundaryCollision(car, wall) {
    // Only invalidate the lap if we haven't already
    if (this.raceData.currentLap > 0 && !this.raceData.lapInvalidated) {
      this.raceData.lapInvalidated = true;
      
      // Show notification
      this.ui.notification.setText('LAP TIME DELETED - Cut Track');
      this.ui.notification.setColor('#ff0000');
      
      // Clear the current lap time display
      this.ui.lapTime.setText('LAP TIME: --:--.---');
      this.ui.lapTime.setColor('#ff0000');
      
      // Optional: Add visual feedback
      this.cameras.main.shake(50, 0.003);
      
      // Set a timer to clear the notification after 3 seconds
      this.time.delayedCall(3000, () => {
        this.ui.notification.setText('');
      });
    }
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