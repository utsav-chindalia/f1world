import Phaser from 'phaser';
import { RacingLineService } from '../services/racing-line';
import { LeaderboardService } from '../services/leaderboard';
import { PlayerService } from '../services/player';

export default class QualifyingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QualifyingScene' });
    
    // Add player name
    this.playerName = localStorage.getItem('playerName') || 'Unknown Player';
    
    // Make the scene instance globally accessible for debugging
    window.qualifyingScene = this;
    
    // Flag to disable database connections for local development
    this.disableDB = true; // Can be set to true to disable all DB operations
    
    // Track properties
    this.trackConfig = {
      width: 1920 * 2,  // Wide track for proper F1 circuit
      height: 1080 * 2,
      checkpoints: [],
      startFinishLine: {
        x: 1772,
        y: 1335,
        rotation: 5.5,
        width: 350,
        height: 350
      },
      surfaces: {
        track: { grip: 1.0, drag: 0.98 },
        grass: { grip: 0.3, drag: 0.95 },
        gravel: { grip: 0.2, drag: 0.90 }
      }
    };

    // Add racing line properties
    this.racingLine = {
      points: [],
      visible: true,
      color: 0x00ff00,
      alpha: 0.5,
      lineWidth: 4,
      bestLapLine: null, // Store the best lap line from Supabase
      subscription: null, // Store Supabase subscription
      autoMode: {
        enabled: false,
        currentPointIndex: 0
      }
    };

    // Add racing line recording properties
    this.racingLineRecorder = {
      isRecording: false,
      currentLapPoints: [],
      sampleRate: 5,
      frameCount: 0,
      minSpeed: 50,
      lapHistory: {}, // Store all lap attempts with their racing lines
      isLapActive: false,
      showRacingLine: false, // Default racing line visibility to false
      captureEnabled: false  // Default capture to false
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
      totalLaps: 100,
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
      notification: null,  // Add notification text element
      debugCoords: null,  // Add debug coordinates text element
      playerName: null
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
      showBoundaries: false,  // Toggle for boundary wall visibility
      showClickCoordinates: false  // Toggle for click coordinate debugging
    };
  }

  preload() {
    // Load track assets
    this.load.image('track', '/assets/tracks/f1_circuit.png');
    this.load.image('track_collision', '/assets/tracks/f1_circuit_collision.png');
    this.load.image('car', '/assets/sprites/f1car.png');
    this.load.image('checkpoint', '/assets/sprites/checkpoint.png');
    this.load.image('minimap', '/assets/ui/minimap_frame.png');
    
    // Load racing line data
    this.load.json('racing_line', '/assets/jsons/racing_line.json');
    
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

  async create() {
    // Initialize track
    this.createTrack();
    
    // Create racing line (initially invisible)
    this.createRacingLine();
    
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
    
    // Setup click debug handler
    this.setupDebugClickHandler();

    // Only fetch from DB if not disabled
    if (!this.disableDB) {
      try {
        const bestLine = await RacingLineService.getBestRacingLine();
        if (bestLine) {
          this.racingLine.bestLapLine = bestLine;
          // Update best lap time display
          if (bestLine.lap_record) {
            this.raceData.bestLapTime = bestLine.lap_record.lap_time;
            this.ui.bestLap.setText(`BEST LAP: ${this.formatTime(bestLine.lap_record.lap_time)}`);
          }
        }
      } catch (error) {
        console.error('Error fetching best racing line:', error);
      }

      // Subscribe to new racing lines only if DB is enabled
      this.racingLine.subscription = RacingLineService.subscribeToNewRacingLines((payload) => {
        if (payload.new && payload.new.lap_record) {
          const newTime = payload.new.lap_record.lap_time;
          if (!this.raceData.bestLapTime || newTime < this.raceData.bestLapTime) {
            this.raceData.bestLapTime = newTime;
            this.racingLine.bestLapLine = payload.new;
            this.ui.bestLap.setText(`BEST LAP: ${this.formatTime(newTime)}`);
            this.ui.bestLap.setColor('#00ff00');
            this.time.delayedCall(1000, () => {
              this.ui.bestLap.setColor('#ffffff');
            });
          }
        }
      });
    }

    // Add racing line toggle controls with UI feedback
    this.input.keyboard.on('keydown-R', () => {
        this.racingLineRecorder.showRacingLine = !this.racingLineRecorder.showRacingLine;
        if (this.racingLineGraphics) {
            this.racingLineGraphics.setVisible(this.racingLineRecorder.showRacingLine);
        }
        // Show UI feedback
        this.ui.notification.setText(`Racing line ${this.racingLineRecorder.showRacingLine ? 'visible' : 'hidden'}`);
        this.ui.notification.setColor(this.racingLineRecorder.showRacingLine ? '#00ff00' : '#ffff00');
        this.time.delayedCall(2000, () => {
            this.ui.notification.setText('');
        });
    });

    // Add racing line capture toggle
    this.input.keyboard.on('keydown-T', () => {
        this.racingLineRecorder.captureEnabled = !this.racingLineRecorder.captureEnabled;
        
        // Show UI feedback
        this.ui.notification.setText(`Racing line capture ${this.racingLineRecorder.captureEnabled ? 'enabled' : 'disabled'}`);
        this.ui.notification.setColor(this.racingLineRecorder.captureEnabled ? '#00ff00' : '#ffff00');
        
        if (!this.racingLineRecorder.captureEnabled) {
            // Clear current points if we're disabling mid-lap
            this.racingLineRecorder.currentLapPoints = [];
            this.racingLineRecorder.isLapActive = false;
        }
        
        this.time.delayedCall(2000, () => {
            this.ui.notification.setText('');
        });
    });

    // Add auto mode toggle
    this.input.keyboard.on('keydown-A', () => {
        // Toggle auto mode
        this.racingLine.autoMode.enabled = !this.racingLine.autoMode.enabled;
        
        if (this.racingLine.autoMode.enabled) {
            // Find closest point to start from
            const points = this.racingLine.bestLapLine?.points || this.racingLine.points;
            if (points.length === 0) {
                this.ui.notification.setText('No racing line available for auto mode');
                this.ui.notification.setColor('#ff0000');
                this.racingLine.autoMode.enabled = false;
                this.time.delayedCall(2000, () => {
                    this.ui.notification.setText('');
                });
                return;
            }
            
            // Find closest point
            let closestDist = Infinity;
            let closestIndex = 0;
            points.forEach((point, index) => {
                const dist = Phaser.Math.Distance.Between(this.car.x, this.car.y, point.x, point.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIndex = index;
                }
            });
            
            this.racingLine.autoMode.currentPointIndex = closestIndex;
            
            // Show notification
            this.ui.notification.setText('Auto mode enabled');
            this.ui.notification.setColor('#00ff00');
        } else {
            this.ui.notification.setText('Auto mode disabled');
            this.ui.notification.setColor('#ffff00');
        }
        
        this.time.delayedCall(2000, () => {
            this.ui.notification.setText('');
        });
    });
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
          20,  // Reduced thickness for more precise collisions
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
      0xD1D0C4,
      0
    );
    this.startFinishLine.setAngle(this.trackConfig.startFinishLine.rotation * (180/Math.PI));
    
    // Add physics body to start/finish line and ensure it matches the visual dimensions
    this.physics.add.existing(this.startFinishLine, true);
    this.startFinishLine.body.setSize(this.trackConfig.startFinishLine.width, this.trackConfig.startFinishLine.height);
    // Make it a sensor to prevent physical collision while still detecting overlap
    this.startFinishLine.body.isSensor = true;
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
    
    // Add player name display
    this.ui.playerName = this.add.text(20, 20, `DRIVER: ${this.playerName}`, {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add lap counter with adjusted position
    this.ui.lapCounter = this.add.text(20, 60, 'LAP: 0/3', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add speed display with adjusted position
    this.ui.speedometer = this.add.text(20, 100, 'SPEED: 0 KPH', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add timer with adjusted position
    this.ui.timer = this.add.text(20, 140, 'TOTAL TIME: 00:00.000', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });

    // Add current lap time with adjusted position
    this.ui.lapTime = this.add.text(20, 180, 'LAP TIME: 00:00.000', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });

    // Add best lap time with adjusted position
    this.ui.bestLap = this.add.text(20, 220, 'BEST LAP: --:--.---', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add notification text with adjusted position
    this.ui.notification = this.add.text(20, 260, '', {
      fontSize: '28px',
      fontFamily: 'Titillium Web',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    
    // Add debug coordinates text with adjusted position
    this.ui.debugCoords = this.add.text(20, 300, '', {
      fontSize: '24px',
      fontFamily: 'Titillium Web',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.ui.debugCoords.setVisible(this.debug.showClickCoordinates);
    
    // Add all UI elements to container
    this.ui.container.add([
      this.ui.playerName,
      this.ui.lapCounter,
      this.ui.speedometer,
      this.ui.timer,
      this.ui.lapTime,
      this.ui.bestLap,
      this.ui.notification,
      this.ui.debugCoords
    ]);

    // Make UI elements more visible with background
    const uiBackground = this.add.rectangle(10, 10, 300, 350, 0x000000, 0.5);
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

    // Add overlap detection between car and track boundaries
    this.physics.add.overlap(this.car, this.boundaries, this.handleBoundaryCollision, null, this);
    
    // Add start/finish line overlap detection
    this.physics.add.overlap(this.car, this.startFinishLine, this.onStartFinishLineCross, null, this);
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
    if (this.raceData.currentLap > 0 && this.raceData.hasPassedStartLine) {
        const currentLapTime = this.time.now - this.raceData.currentLapStartTime;
        this.ui.lapTime.setText(`LAP TIME: ${this.formatTime(currentLapTime)}`);
    }
    
    // Show best lap time if exists
    if (this.raceData.bestLapTime) {
        this.ui.bestLap.setText(`BEST LAP: ${this.formatTime(this.raceData.bestLapTime)}`);
    } else {
        this.ui.bestLap.setText('BEST LAP: --:--.---');
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
    
    // Only record points if capture is enabled and lap is active
    if (this.racingLineRecorder.captureEnabled && 
        this.racingLineRecorder.isLapActive && 
        !this.raceData.lapInvalidated) {
        
        this.racingLineRecorder.frameCount++;
        
        if (this.racingLineRecorder.frameCount >= this.racingLineRecorder.sampleRate && 
            this.car.body.velocity.length() > this.racingLineRecorder.minSpeed) {
            
            const point = {
                x: Math.round(this.car.x),
                y: Math.round(this.car.y),
                speed: Math.round(this.car.body.velocity.length()),
                timestamp: time
            };
            
            this.racingLineRecorder.currentLapPoints.push(point);
            this.racingLineRecorder.frameCount = 0;
            
            // Show green dots when capturing is enabled
            if (this.racingLineRecorder.captureEnabled) {
                const marker = this.add.circle(this.car.x, this.car.y, 2, 0x00ff00, 0.5);
                this.time.delayedCall(2000, () => marker.destroy());
            }
        }
    }
    
    // Update UI
    this.updateUI();

    // Log car position when moving
    if (this.car && this.debug.showCarPosition && (this.cursors.up.isDown || this.cursors.down.isDown || this.cursors.left.isDown || this.cursors.right.isDown)) {
      console.log(`Car Position - X: ${Math.round(this.car.x)}, Y: ${Math.round(this.car.y)}, Rotation: ${Math.round(this.car.angle)}`);
    }
  }

  handleCarMovement(delta) {
    // If auto mode is enabled, follow racing line
    if (this.racingLine.autoMode.enabled) {
      const points = this.racingLine.bestLapLine?.points || this.racingLine.points;
      if (points.length > 0) {
        // Get current target point
        const targetPoint = points[this.racingLine.autoMode.currentPointIndex];
        
        // Look ahead a few points to smooth the path at higher speeds
        const nextIndex = (this.racingLine.autoMode.currentPointIndex + 1) % points.length;
        const nextPoint = points[nextIndex];
        
        // Calculate a target position that looks ahead based on speed
        const lookAheadAmount = 0.5; // 0 = current point, 1 = next point
        const targetX = Phaser.Math.Linear(targetPoint.x, nextPoint.x, lookAheadAmount);
        const targetY = Phaser.Math.Linear(targetPoint.y, nextPoint.y, lookAheadAmount);
        
        // Calculate distance to interpolated target
        const distance = Phaser.Math.Distance.Between(
          this.car.x, this.car.y,
          targetX, targetY
        );

        // Move to next point if close enough to current target
        if (distance < 10) {
          this.racingLine.autoMode.currentPointIndex = nextIndex;
          return;
        }
        
        // Calculate angle to target
        const angle = Phaser.Math.Angle.Between(
          this.car.x, this.car.y,
          targetX, targetY
        );
        
        // Smoothly rotate the car (lerp the rotation)
        const targetRotation = angle + Math.PI/2;
        const rotationDiff = Phaser.Math.Angle.Wrap(targetRotation - this.car.rotation);
        this.car.rotation += rotationDiff * 0.2; // Adjust this value to control rotation speed
        
        // Use a fixed base speed
        const speed = 605;
        
        // Move towards the point at controlled speed
        this.car.body.velocity.x = Math.cos(angle) * speed;
        this.car.body.velocity.y = Math.sin(angle) * speed;
        
        // Update car data for UI
        this.car.data.speed = speed;
        
        return;
      }
    }
    
    // Regular car movement code for manual control
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

  async onStartFinishLineCross() {
    const now = this.time.now;

    // Ignore very short intervals between finish line crosses to prevent double counting
    if (now - this.raceData.lastCheckpointTime < 5000) return;

    if (!this.raceData.hasPassedStartLine) {
        // Starting a new lap
        this.raceData.hasPassedStartLine = true;
        this.raceData.currentLapStartTime = now;
        this.raceData.lastCheckpointTime = now;
        
        // Only start recording if capture is enabled and we're in a valid state
        if (!this.raceData.lapInvalidated && this.racingLineRecorder.captureEnabled) {
            this.racingLineRecorder.isLapActive = true;
            this.racingLineRecorder.currentLapPoints = [];
            console.log('\n=== Starting New Lap Recording ===');
            console.log('Racing line capture enabled - recording points...');
        }
        
        // Reset lap invalidation status
        if (this.raceData.lapInvalidated) {
            this.raceData.lapInvalidated = false;
            this.ui.lapTime.setColor('#ffffff');
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
        
        if (!this.raceData.lapInvalidated) {
            this.raceData.lapTimes.push(lapTime);
            
            console.log(`\n=== Lap ${this.raceData.currentLap} Completed ===`);
            console.log(`Lap Time: ${this.formatTime(lapTime)}`);
            
            // Create lap data object
            const lapData = {
                lapTime: lapTime,
                formattedTime: this.formatTime(lapTime),
                timestamp: now,
                isValid: true,
                metadata: {
                    carConfig: { ...this.carConfig },
                    trackConditions: 'dry',
                    timestamp: now,
                    track_id: 'default_track'
                }
            };

            if (this.racingLineRecorder.isLapActive) {
                lapData.points = [...this.racingLineRecorder.currentLapPoints];
                
                // Save racing line and lap time to Supabase only if DB is not disabled
                if (!this.disableDB) {
                    try {
                        const result = await RacingLineService.saveRacingLine({
                            lapTime: Math.floor(lapTime),
                            points: lapData.points,
                            metadata: lapData.metadata,
                            track_id: lapData.metadata.track_id
                        });

                        console.log('Racing line and lap time saved to Supabase:', result);
                        
                        this.racingLineRecorder.lapHistory[this.raceData.currentLap] = {
                            ...lapData,
                            supabaseId: result.racingLine.id
                        };

                        this.ui.notification.setText('Lap time saved! 🏁');
                        this.ui.notification.setColor('#00ff00');
                        this.time.delayedCall(2000, () => {
                            this.ui.notification.setText('');
                        });
                    } catch (error) {
                        console.error('Error saving racing line and lap time to Supabase:', error);
                        this.ui.notification.setText('Failed to save lap time ❌');
                        this.ui.notification.setColor('#ff0000');
                        this.time.delayedCall(2000, () => {
                            this.ui.notification.setText('');
                        });
                        this.racingLineRecorder.lapHistory[this.raceData.currentLap] = lapData;
                    }
                } else {
                    // If DB is disabled, just store in local history
                    this.racingLineRecorder.lapHistory[this.raceData.currentLap] = lapData;
                    console.log('DB disabled - Lap data stored locally only');
                }
                
                if (lapData.points.length > 0) {
                    console.log(`\n=== Racing Line Data ===`);
                    console.log(`Total Points Recorded: ${lapData.points.length}`);
                    console.log(`First Point: ${JSON.stringify(lapData.points[0])}`);
                    console.log(`Last Point: ${JSON.stringify(lapData.points[lapData.points.length - 1])}`);
                    console.log('\nTo view detailed lap data, use:');
                    console.log(`window.qualifyingScene.printLapData(${this.raceData.currentLap})`);
                }
            }

            // Update best lap time
            if (!this.raceData.bestLapTime || lapTime < this.raceData.bestLapTime) {
                this.raceData.bestLapTime = lapTime;
                console.log('\n🏆 NEW BEST LAP! 🏆');
                console.log(`Time: ${this.formatTime(lapTime)}`);
                
                if (this.racingLineRecorder.isLapActive) {
                    this.racingLineRecorder.bestLap = {
                        lapNumber: this.raceData.currentLap,
                        time: lapTime,
                        formattedTime: this.formatTime(lapTime),
                        points: [...this.racingLineRecorder.currentLapPoints]
                    };
                    this.racingLineRecorder.bestLapLine = [...this.racingLineRecorder.currentLapPoints];
                    console.log(`Best lap racing line updated with ${this.racingLineRecorder.bestLap.points.length} points!`);
                }
                
                this.ui.bestLap.setColor('#00ff00');
                this.time.delayedCall(1000, () => {
                    this.ui.bestLap.setColor('#ffffff');
                });
            }
            
            // Output summary of all laps
            console.log('\n=== Session Summary ===');
            console.log(`Total Laps: ${this.raceData.lapTimes.length}`);
            console.log(`Best Lap: ${this.formatTime(this.raceData.bestLapTime)}`);
            console.log('All Lap Times:');
            this.raceData.lapTimes.forEach((time, index) => {
                const lapNumber = index + 1;
                const lapHasPoints = this.racingLineRecorder.lapHistory[lapNumber]?.points?.length > 0;
                console.log(`Lap ${lapNumber}: ${this.formatTime(time)}${lapHasPoints ? ' (Racing line recorded)' : ''}`);
            });
        } else {
            console.log('\n❌ Lap Invalidated - No data saved');
        }
        
        // Reset for next lap
        this.racingLineRecorder.isLapActive = false;
        this.racingLineRecorder.currentLapPoints = [];
        this.raceData.hasPassedStartLine = false;
        this.raceData.currentLap++;
        this.raceData.checkpointsPassed.clear();
        this.raceData.lapInvalidated = false;
        this.ui.lapTime.setColor('#ffffff');
        
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
        
        // Stop recording points for this lap
        this.racingLineRecorder.isLapActive = false;
        this.racingLineRecorder.currentLapPoints = [];
        
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
    // Cleanup Supabase subscription if exists and DB is not disabled
    if (!this.disableDB && this.racingLine.subscription) {
      this.racingLine.subscription.unsubscribe();
      this.racingLine.subscription = null;
    }

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

  setupDebugClickHandler() {
    // Add racing line recording mode
    let isRecordingRacingLine = false;
    let racingLinePoints = [];
    
    // Add keyboard shortcut to toggle recording mode
    this.input.keyboard.on('keydown-L', () => {
        isRecordingRacingLine = !isRecordingRacingLine;
        if (isRecordingRacingLine) {
            racingLinePoints = [];
            console.log('Racing line recording started');
            this.ui.notification.setText('Racing line recording started');
            this.ui.notification.setColor('#00ff00');
        } else {
            console.log('Racing line points:', JSON.stringify({ racing_line: racingLinePoints }, null, 2));
            this.ui.notification.setText('Racing line recording stopped - Check console for points');
            this.ui.notification.setColor('#ffff00');
            
            // Clear notification after 3 seconds
            this.time.delayedCall(3000, () => {
                this.ui.notification.setText('');
            });
        }
    });
    
    // Add click handler to the game
    this.input.on('pointerdown', (pointer) => {
        const worldX = Math.round(pointer.worldX);
        const worldY = Math.round(pointer.worldY);
        
        if (isRecordingRacingLine) {
            racingLinePoints.push({ x: worldX, y: worldY });
            
            // Show visual feedback
            const marker = this.add.circle(worldX, worldY, 5, 0x00ff00);
            
            // Draw line connecting points
            if (racingLinePoints.length > 1) {
                const prevPoint = racingLinePoints[racingLinePoints.length - 2];
                const line = this.add.line(
                    0, 0,
                    prevPoint.x, prevPoint.y,
                    worldX, worldY,
                    0x00ff00
                ).setOrigin(0, 0);
                line.setLineWidth(2);
            }
        }
        
        // Only show debug info if debug flag is enabled
        if (this.debug.showClickCoordinates) {
            // Update debug coordinates text
            this.ui.debugCoords.setText(`DEBUG - X: ${worldX}, Y: ${worldY}`);
            
            // Log to console
            console.log(`Clicked at - X: ${worldX}, Y: ${worldY}`);
            
            // Optional: Show a temporary marker at the clicked position
            const marker = this.add.circle(worldX, worldY, 5, 0xffff00);
            this.time.delayedCall(1000, () => marker.destroy());
        }
    });
  }

  createRacingLine() {
    // Get racing line data
    const racingLineData = this.cache.json.get('racing_line');
    
    // Store points
    this.racingLine.points = racingLineData.racing_line;
    
    // Create graphics object for racing line
    this.racingLineGraphics = this.add.graphics();
    this.racingLineGraphics.lineStyle(
        this.racingLine.lineWidth,
        this.racingLine.color,
        this.racingLine.alpha
    );
    
    // Draw the racing line
    if (this.racingLine.points.length > 1) {
        this.racingLineGraphics.beginPath();
        this.racingLineGraphics.moveTo(
            this.racingLine.points[0].x,
            this.racingLine.points[0].y
        );
        
        // Draw smooth curve through points
        for (let i = 1; i < this.racingLine.points.length; i++) {
            const point = this.racingLine.points[i];
            this.racingLineGraphics.lineTo(point.x, point.y);
        }
        
        // Close the loop if it's a circuit
        if (this.racingLine.points.length > 2) {
            this.racingLineGraphics.lineTo(
                this.racingLine.points[0].x,
                this.racingLine.points[0].y
            );
        }
        
        this.racingLineGraphics.strokePath();
    }
    
    // Set initial visibility to false
    this.racingLineGraphics.setVisible(false);
  }

  // Add helper method to get lap data
  getLapData(lapNumber) {
    return this.racingLineRecorder.lapHistory[lapNumber];
  }

  // Add helper method to get all laps data
  getAllLapsData() {
    return this.racingLineRecorder.lapHistory;
  }

  // Add helper method to get best lap data
  getBestLapData() {
    return this.racingLineRecorder.bestLap;
  }

  // Add after the helper methods
  printLapData(lapNumber) {
    const lapData = this.getLapData(lapNumber);
    if (!lapData) {
        console.log(`No data available for lap ${lapNumber}`);
        return;
    }

    console.log(`\n=== Lap ${lapNumber} Details ===`);
    console.log(`Time: ${lapData.formattedTime}`);
    console.log(`Points Recorded: ${lapData.points.length}`);
    console.log(`Average Speed: ${this.calculateAverageSpeed(lapData.points)} KPH`);
    
    if (lapData.points.length > 0) {
        console.log('\nFirst 3 points:');
        lapData.points.slice(0, 3).forEach((point, index) => {
            console.log(`${index + 1}: x=${point.x}, y=${point.y}, speed=${Math.round(point.speed * 3.6)} KPH`);
        });
        
        console.log('\nLast 3 points:');
        lapData.points.slice(-3).forEach((point, index) => {
            console.log(`${lapData.points.length - 2 + index}: x=${point.x}, y=${point.y}, speed=${Math.round(point.speed * 3.6)} KPH`);
        });
    }
  }

  calculateAverageSpeed(points) {
    if (!points || points.length === 0) return 0;
    const avgSpeed = points.reduce((sum, point) => sum + point.speed, 0) / points.length;
    return Math.round(avgSpeed * 3.6); // Convert to KPH and round
  }
} 